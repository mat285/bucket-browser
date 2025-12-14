import { getCredentials, type Credentials } from "@/state/credentials";
import { type Bucket, type ListObjectsResponse, type Object } from "./types";

export interface Client {
    listBuckets: () => Promise<Bucket[]>;
    listObjects: (bucketName: string, prefix: string, continuationToken?: string) => Promise<ListObjectsResponse>;
    getObjectInfo: (bucketName: string, objectKey: string) => Promise<Object>;
    getObjectData: (bucketName: string, objectKey: string) => Promise<Blob>;
    deleteObject: (bucketName: string, objectKey: string) => Promise<void>;
}

export const useOptionalApiClient = (credentials?: Credentials): Client | null => {
    try {
        return useApiClient(credentials);
    } catch (error: unknown) {
        console.error(error);
        return null;
    }
}

export const useApiClient = (credentials?: Credentials): Client => {
    credentials = credentials ?? getCredentials() ?? { accessKeyId: '', secretAccessKey: '' };
    const doDelete = async (path: string, headers?: Record<string, string>) => {
        return doReq('DELETE', path, undefined, headers);
    }
    const doGet = async (path: string, queryParams?: Record<string, string>, headers?: Record<string, string>) => {
        return doReq('GET', path, queryParams, headers);
    }
    const doReq = async (method: string, path: string, queryParams?: Record<string, string>, headers?: Record<string, string>) => {
        const urlParams = new URLSearchParams();
        if (queryParams) {
            for (const [key, value] of Object.entries(queryParams)) {
                urlParams.set(key, value);
            }
        }
        const params = urlParams.size > 0 ? ('?' + urlParams.toString()) : '';
        const url = joinPath('/api/v1/', path)  + params;
        console.log('fetching', url);
        const response = await fetch(url, {
            method,
            headers: {
                'AccessKeyId': credentials?.accessKeyId ?? '',
                'SecretAccessKey': credentials?.secretAccessKey ?? '',
                ...headers,
            },            
        });
        if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
        }
        return { body: await response.json(), response };
    }
    return {
        listBuckets: async () => {
            return await doGet('buckets').then(({body: buckets}) => {
                return buckets as Bucket[];
            }).catch((err) => {
                console.error(err);
                throw err;
            });
        },
        listObjects: async (bucketName: string, prefix: string, continuationToken?: string) => {
            if (!prefix.endsWith('/')) {
                prefix = prefix + '/';
            }
            const headers: Record<string, string> = {};
            if (continuationToken) {
                headers['X-Continuation-Token'] = continuationToken;
            }
            return await doGet(`objects/${bucketName}/${prefix}`, undefined, headers).then(({body: objects, response}) => {
                return {objects: objects as Object[], continuationToken: response.headers.get('X-Continuation-Token')} as ListObjectsResponse;
            }).catch((err) => {
                console.error(err);
                throw err;
            });
        },
        getObjectInfo: async (bucketName: string, objectKey: string) => {
            return await doGet(`object-info/${bucketName}/${objectKey}`).then(({body: object}) => {
                return object as Object;
            }).catch((err) => {
                console.error(err);
                throw err;
            });
        },
        getObjectData: async (bucketName: string, objectKey: string) => {
            return await doGet(`object-data/${bucketName}/${objectKey}`).then(({body: blob}) => {
                return blob as Blob;
            }).catch((err) => {
                console.error(err);
                throw err;
            });
        },
        deleteObject: async (bucketName: string, objectKey: string) => {
            const {response} = await doDelete(`objects/${bucketName}/${objectKey}`);
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            return;
        },
    }
}



// const useMinio = (credentials?: Credentials): Minio.Client => {
//     if (!credentials) throw new Error('no credentials configured');
//     const endPoint = 'ceph3.ts.k8s.nori.ninja';
//     const port = 443;
//     const useSSL = true;

//     const client = new Minio.Client({
//         endPoint,
//         port,
//         useSSL,
//         accessKey: credentials.accessKeyId,
//         secretKey: credentials.secretAccessKey,
//     });
//     return client;
// }

const joinPath = (...paths: string[]) => {
    const flat: string[] = [];
    paths.forEach((path) => {
        flat.push(...path.split('/'));
    });
    const trailingSlash = paths[paths.length - 1].endsWith('/') ? '/' : '';
    return '/' + flat.filter((path: string) => path !== '').join('/') + trailingSlash;
}