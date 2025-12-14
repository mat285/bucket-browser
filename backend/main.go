package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/google/uuid"
	minio "github.com/minio/minio-go"
)

func main() {
	ctx := context.Background()
	ctx, cancel := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)
	defer cancel()

	server := NewServer("ceph3.ts.k8s.nori.ninja", 8080)
	err := server.Start(ctx)
	if err != nil {
		fmt.Printf("error starting server: %s\n", err)
		os.Exit(1)
	}
	<-ctx.Done()
	server.Stop()
	os.Exit(0)
}

type Credentials struct {
	AccessKeyId     string
	SecretAccessKey string
}

type Object struct {
	Name        string `json:"name"`
	Key         string `json:"key"`
	IsDirectory bool   `json:"isDirectory"`
}

type ObjectCacheEntry struct {
	Objects    <-chan minio.ObjectInfo
	Expiration time.Time
}

type Server struct {
	EndPoint string

	mux    *http.ServeMux
	server *http.Server

	cancel context.CancelFunc
	done   chan error

	objectCache      map[string]ObjectCacheEntry
	objectCacheMutex sync.Mutex
}

func NewServer(endPoint string, port int) *Server {
	if port == 0 {
		port = 8080
	}
	s := &Server{
		EndPoint:         endPoint,
		mux:              http.NewServeMux(),
		objectCache:      make(map[string]ObjectCacheEntry),
		objectCacheMutex: sync.Mutex{},
	}
	s.setupRoutes()
	s.server = &http.Server{
		Addr:    fmt.Sprintf(":%d", port),
		Handler: s.mux,
	}
	return s
}

func (s *Server) setupRoutes() {
	if s.mux == nil {
		s.mux = http.NewServeMux()
	}
	s.mux.HandleFunc("GET /api/v1/buckets", s.ListBuckets)
	s.mux.HandleFunc("GET /api/v1/objects/{bucket}/{prefix...}", s.ListObjects)
	s.mux.HandleFunc("GET /api/v1/object-info/{bucket}/{object...}", s.GetObjectInfo)
	s.mux.HandleFunc("GET /api/v1/object-data/{bucket}/{object...}", s.GetObjectData)

	s.mux.HandleFunc("DELETE /api/v1/objects/{bucket}/{object...}", s.DeleteObjects)
	s.mux.HandleFunc("/", s.NotFound)
}

func (s *Server) NotFound(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("not found: %s %s\n", r.Method, r.URL.Path)
	http.Error(w, "Not Found", http.StatusNotFound)
}

func (s *Server) Start(ctx context.Context) error {
	fmt.Println("starting server")
	if s.cancel != nil {
		return fmt.Errorf("server already started")
	}
	ctx, s.cancel = context.WithCancel(ctx)
	defer s.cancel()
	s.done = make(chan error, 1)
	go func() {
		defer s.cancel()
		fmt.Println("listening on port", s.server.Addr)
		if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Printf("listen error: %s\n", err)
		}
		fmt.Println("server stopped")
	}()
	<-ctx.Done()
	ctxErr := ctx.Err()
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 10*time.Second)
	defer cancel()
	fmt.Println("shutting down server")
	err := s.server.Shutdown(ctx)
	if err != nil {
		fmt.Printf("shutdown error: %s\n", err)
	}
	s.done <- err
	close(s.done)
	fmt.Println("server stopped", ctxErr)
	return ctxErr
}

func (s *Server) Stop() error {
	if s.cancel == nil {
		return nil
	}
	fmt.Println("stopping server")
	s.cancel()
	err := <-s.done
	fmt.Println("server stopped", err)
	return err
}

func (s *Server) extractCredentials(r *http.Request) (Credentials, error) {
	creds := Credentials{
		AccessKeyId:     r.Header.Get("AccessKeyId"),
		SecretAccessKey: r.Header.Get("SecretAccessKey"),
	}
	if creds.AccessKeyId == "" || creds.SecretAccessKey == "" {
		return Credentials{}, fmt.Errorf("missing credentials")
	}
	return creds, nil
}

func (s *Server) clientForRequest(r *http.Request) (*minio.Client, error) {
	creds, err := s.extractCredentials(r)
	if err != nil {
		return nil, err
	}
	client, err := minio.New(s.EndPoint, creds.AccessKeyId, creds.SecretAccessKey, true)
	if err != nil {
		return nil, err
	}
	return client, nil
}

func (s *Server) ListBuckets(w http.ResponseWriter, r *http.Request) {
	fmt.Println("handling list buckets request")
	client, err := s.clientForRequest(r)
	if err != nil {
		fmt.Printf("error creating client: %s\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	fmt.Printf("client created: %+v\n", client)
	buckets, err := client.ListBuckets()
	if err != nil {
		fmt.Printf("error listing buckets: %s\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	body, err := json.Marshal(buckets)
	if err != nil {
		fmt.Printf("error marshalling buckets: %s\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	fmt.Printf("buckets: %s\n", string(body))
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(body)
	fmt.Println("handled list buckets request")
}

func (s *Server) ListObjects(w http.ResponseWriter, r *http.Request) {
	fmt.Println("handling list objects request")
	client, err := s.clientForRequest(r)
	if err != nil {
		fmt.Printf("error creating client: %s\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	bucket := r.PathValue("bucket")
	prefix := r.PathValue("prefix")
	if !strings.HasSuffix(prefix, "/") {
		prefix = prefix + "/"
	}
	continuationToken := r.URL.Query().Get("continuationToken")
	limitQuery := r.URL.Query().Get("limit")
	skipQuery := r.URL.Query().Get("skip")
	skip := 0
	if skipQuery != "" {
		skip, err = strconv.Atoi(skipQuery)
		if err != nil {
			skip = 0
		}
	}
	limit := -1
	if limitQuery != "" {
		limit, err = strconv.Atoi(limitQuery)
		if err != nil {
			limit = -1
		}
	}
	token, objects, err := s.getNextObjects(r.Context(), client, bucket, prefix, continuationToken, skip, limit)
	if err != nil {
		fmt.Printf("error getting next objects: %s\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	body, err := json.Marshal(objects)
	if err != nil {
		fmt.Printf("error marshalling objects: %s\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if token != "" {
		w.Header().Set("X-Continuation-Token", token)
	}
	w.WriteHeader(http.StatusOK)
	w.Write(body)
	names := make([]string, 0)
	for _, object := range objects {
		names = append(names, object.Name)
	}
	fmt.Println("handled list objects request", strings.Join(names, ", "))
}

func (s *Server) getNextObjects(ctx context.Context, client *minio.Client, bucket string, prefix string, continuationToken string, skip int, limit int) (string, []Object, error) {
	s.objectCacheMutex.Lock()
	defer s.objectCacheMutex.Unlock()
	var entry ObjectCacheEntry
	// if continuationToken != "" {
	// 	var ok bool
	// 	entry, ok = s.objectCache[continuationToken]
	// 	if !ok {
	// 		return "", nil, fmt.Errorf("no cache entry found")
	// 	}
	// 	if time.Now().After(entry.Expiration) {
	// 		delete(s.objectCache, continuationToken)
	// 		return "", nil, fmt.Errorf("cache entry expired")
	// 	}
	// 	fmt.Printf("using cache entry: %+v\n", entry)
	// } else {
	fmt.Println("no continuation token, creating new cache entry")
	objectsCh := client.ListObjectsV2(bucket, prefix, false, make(chan struct{}))
	continuationToken = uuid.New().String()
	entry = ObjectCacheEntry{
		Objects:    objectsCh,
		Expiration: time.Now().Add(60 * time.Second),
	}
	// s.objectCache[continuationToken] = entry
	// }
	objects := make([]Object, 0)
	for obj := range entry.Objects {
		if obj.Err != nil {
			fmt.Printf("error listing objects: %s\n", obj.Err)
			continue
		}
		name := strings.TrimPrefix(obj.Key, prefix)
		objects = append(objects, Object{
			Name:        name,
			Key:         obj.Key,
			IsDirectory: strings.HasSuffix(obj.Key, "/"),
		})
	}
	fmt.Printf("listing objects with limit: %d\n", limit)
	if skip >= len(objects) {
		skip = len(objects)
	}
	if skip < 0 {
		skip = 0
	}
	objects = objects[skip:]
	if limit <= 0 {
		return "", objects, nil
	}
	if limit > len(objects) {
		limit = len(objects)
	}
	return "", objects[:limit], nil
}

func (s *Server) GetObjectInfo(w http.ResponseWriter, r *http.Request) {
	fmt.Println("handling get object info request")
	client, err := s.clientForRequest(r)
	if err != nil {
		fmt.Printf("error creating client: %s\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	bucket := r.PathValue("bucket")
	key := strings.TrimSuffix(r.PathValue("object"), "/")
	fmt.Printf("getting object info for bucket: %s, key: %s\n", bucket, key)
	object, err := client.StatObject(bucket, key, minio.StatObjectOptions{})
	if err != nil {
		fmt.Printf("error getting object info: %s\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	body, err := json.Marshal(object)
	if err != nil {
		fmt.Printf("error marshalling object info: %s\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(body)
	fmt.Println("handled get object info request")
}

func (s *Server) GetObjectData(w http.ResponseWriter, r *http.Request) {
	fmt.Println("handling get object data request")
	client, err := s.clientForRequest(r)
	if err != nil {
		fmt.Printf("error creating client: %s\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	bucket := r.PathValue("bucket")
	key := r.PathValue("object")
	object, err := client.GetObject(bucket, key, minio.GetObjectOptions{})
	if err != nil {
		fmt.Printf("error getting object data: %s\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	body, err := io.ReadAll(object)
	if err != nil {
		fmt.Printf("error reading object data: %s\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer object.Close()
	w.Header().Set("Content-Type", "application/octet-stream")
	w.WriteHeader(http.StatusOK)
	w.Write(body)
	fmt.Println("handled get object data request")
}

func (s *Server) DeleteObjects(w http.ResponseWriter, r *http.Request) {
	fmt.Println("handling delete objects request")
	client, err := s.clientForRequest(r)
	if err != nil {
		fmt.Printf("error creating client: %s\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	bucket := r.PathValue("bucket")
	objects := r.PathValue("object")
	fmt.Printf("deleting objects for bucket: %s, objects: %s\n", bucket, objects)
	err = client.RemoveObject(bucket, objects)
	if err != nil {
		fmt.Printf("error deleting object: %s\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	okay, _ := json.Marshal("OK")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(okay)
	fmt.Println("handled delete objects request")
}
