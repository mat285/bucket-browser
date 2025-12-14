GIT_SHA := $(shell git rev-parse --short HEAD)

ifeq ($(GIT_SHA),"")
	GIT_SHA = "unknown"
endif
export GIT_SHA


.PHONY: run-backend
run-backend:
	cd backend && go run main.go

.PHONY: run-frontend
run-frontend:
	pnpm run dev


.PHONY: deploy
deploy: docker-build helm-release

.PHONY: helm-release
helm-release:
	helm upgrade --install bucket-browser \
	  --create-namespace \
	  --namespace bucket-browser \
	  --values _infra/helm/values.yaml \
	  --set image.tag=${GIT_SHA} \
	  _infra/helm
	kubectl delete pods -n bucket-browser -l app=bucket-browser

.PHONY: docker-build
docker-build:
	docker build \
	--cache-from registry.k8s.nori.ninja/bucket-browser:latest \
	-t registry.k8s.nori.ninja/bucket-browser:latest \
	-t registry.k8s.nori.ninja/bucket-browser:$(GIT_SHA) \
	--platform linux/amd64,linux/arm64 \
	-f Dockerfile \
	--push \
	.
