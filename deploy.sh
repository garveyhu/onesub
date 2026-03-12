#!/bin/bash
set -e

IMAGE_NAME="congcong510/onesub"
TAG="latest"
FULL_IMAGE="${IMAGE_NAME}:${TAG}"

echo "🔨 开始构建镜像 ${FULL_IMAGE} ..."
docker buildx build --platform linux/amd64 -f docker/Dockerfile -t "${FULL_IMAGE}" --load .

echo ""
echo "🚀 推送镜像到 Docker Hub ..."
docker push "${FULL_IMAGE}"

echo ""
echo "🧹 清理本地镜像 ..."
docker rmi "${FULL_IMAGE}"
# 清理构建缓存中的悬空镜像
docker image prune -f

echo ""
echo "✅ 完成！镜像已推送到 Docker Hub 并已清理本地缓存"
echo "   NAS 上执行以下命令更新："
echo "   docker compose pull && docker compose up -d"
