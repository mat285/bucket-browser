FROM --platform=$BUILDPLATFORM golang:1.24.11-alpine AS builder

WORKDIR /var/code/
ADD backend/ backend/
WORKDIR /var/code/backend

ARG TARGETARCH
ARG TARGETOS

RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o /backend main.go

FROM node:22-slim AS ui-builder

# ENV PNPM_HOME="/pnpm"
# ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /var/code/frontend

COPY package.json .
COPY pnpm-lock.yaml .
RUN pnpm install
COPY . .
RUN pnpm run build

FROM alpine:latest

WORKDIR /

COPY --from=builder /backend /backend
COPY --from=ui-builder /var/code/frontend/dist /dist

EXPOSE 8080

CMD ["/backend"]