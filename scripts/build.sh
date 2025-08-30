#!/bin/bash

# Build script for Lambda Performance MCP Server
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="lambda-performance-mcp"
IMAGE_TAG="${1:-latest}"
REGISTRY="${REGISTRY:-}"
PLATFORM="${PLATFORM:-linux/amd64,linux/arm64}"

echo -e "${BLUE}Building Lambda Performance MCP Server${NC}"
echo -e "${BLUE}Image: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"
echo -e "${BLUE}Platform: ${PLATFORM}${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Build production image
echo -e "${YELLOW}Building production image...${NC}"
if [ -n "$REGISTRY" ]; then
    FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
else
    FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
fi

# Multi-platform build
docker buildx build \
    --platform "${PLATFORM}" \
    --target production \
    --tag "${FULL_IMAGE_NAME}" \
    --tag "${IMAGE_NAME}:latest" \
    --load \
    .

echo -e "${GREEN}Production image built successfully: ${FULL_IMAGE_NAME}${NC}"

# Build development image
echo -e "${YELLOW}Building development image...${NC}"
docker build \
    -f Dockerfile.dev \
    --tag "${IMAGE_NAME}:dev" \
    .

echo -e "${GREEN}Development image built successfully: ${IMAGE_NAME}:dev${NC}"

# Run security scan (if trivy is available)
if command -v trivy &> /dev/null; then
    echo -e "${YELLOW}Running security scan...${NC}"
    trivy image --exit-code 0 --severity HIGH,CRITICAL "${FULL_IMAGE_NAME}"
else
    echo -e "${YELLOW}Trivy not found. Skipping security scan.${NC}"
fi

# Show image information
echo -e "${BLUE}Image Information:${NC}"
docker images | grep "${IMAGE_NAME}" | head -5

# Test the image
echo -e "${YELLOW}Testing the image...${NC}"
CONTAINER_ID=$(docker run -d --rm "${FULL_IMAGE_NAME}")
sleep 5

if docker ps | grep -q "${CONTAINER_ID}"; then
    echo -e "${GREEN}Image test passed - container is running${NC}"
    docker stop "${CONTAINER_ID}" > /dev/null
else
    echo -e "${RED}Image test failed - container is not running${NC}"
    docker logs "${CONTAINER_ID}" 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}Build completed successfully!${NC}"
echo -e "${BLUE}Next steps:${NC}"
echo -e "  • Run locally: ${YELLOW}docker run -it --rm ${FULL_IMAGE_NAME}${NC}"
echo -e "  • Push to registry: ${YELLOW}docker push ${FULL_IMAGE_NAME}${NC}"
echo -e "  • Deploy with compose: ${YELLOW}docker-compose up${NC}"