#!/bin/bash

# Deployment script for Lambda Performance MCP Server
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_TYPE="${1:-docker-compose}"
ENVIRONMENT="${2:-production}"
NAMESPACE="lambda-mcp"

echo -e "${BLUE}Deploying Lambda Performance MCP Server${NC}"
echo -e "${BLUE}Deployment Type: ${DEPLOYMENT_TYPE}${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"

# Function to check prerequisites
check_prerequisites() {
    case $DEPLOYMENT_TYPE in
        "docker-compose")
            if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
                echo -e "${RED}Docker Compose is not installed${NC}"
                exit 1
            fi
            ;;
        "kubernetes"|"k8s")
            if ! command -v kubectl &> /dev/null; then
                echo -e "${RED}kubectl is not installed${NC}"
                exit 1
            fi
            ;;
        "docker")
            if ! command -v docker &> /dev/null; then
                echo -e "${RED}Docker is not installed${NC}"
                exit 1
            fi
            ;;
    esac
}

# Function to deploy with Docker Compose
deploy_docker_compose() {
    echo -e "${YELLOW}Deploying with Docker Compose...${NC}"
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        echo -e "${YELLOW}.env file not found. Creating from template...${NC}"
        cp .env.example .env
        echo -e "${RED}Please edit .env file with your AWS credentials before running again${NC}"
        exit 1
    fi
    
    # Choose compose file based on environment
    if [ "$ENVIRONMENT" = "development" ]; then
        COMPOSE_FILE="docker-compose.dev.yml"
    else
        COMPOSE_FILE="docker-compose.yml"
    fi
    
    # Deploy
    docker-compose -f "$COMPOSE_FILE" up -d
    
    echo -e "${GREEN}Deployment completed with Docker Compose${NC}"
    echo -e "${BLUE}Check status: docker-compose -f $COMPOSE_FILE ps${NC}"
    echo -e "${BLUE}View logs: docker-compose -f $COMPOSE_FILE logs -f${NC}"
}

# Function to deploy to Kubernetes
deploy_kubernetes() {
    echo -e "${YELLOW}Deploying to Kubernetes...${NC}"
    
    # Check if kubectl can connect to cluster
    if ! kubectl cluster-info &> /dev/null; then
        echo -e "${RED}Cannot connect to Kubernetes cluster${NC}"
        exit 1
    fi
    
    # Create namespace
    echo -e "${YELLOW}Creating namespace...${NC}"
    kubectl apply -f k8s/namespace.yaml
    
    # Apply configurations
    echo -e "${YELLOW}Applying configurations...${NC}"
    kubectl apply -f k8s/configmap.yaml
    
    # Check if secrets need to be created
    if ! kubectl get secret lambda-mcp-aws-credentials -n "$NAMESPACE" &> /dev/null; then
        echo -e "${YELLOW}AWS credentials secret not found${NC}"
        echo -e "${RED}Please create the secret manually or update k8s/secret.yaml${NC}"
        echo -e "${BLUE}Example: kubectl create secret generic lambda-mcp-aws-credentials \\${NC}"
        echo -e "${BLUE}  --from-literal=AWS_ACCESS_KEY_ID=your-key \\${NC}"
        echo -e "${BLUE}  --from-literal=AWS_SECRET_ACCESS_KEY=your-secret \\${NC}"
        echo -e "${BLUE}  -n $NAMESPACE${NC}"
    fi
    
    kubectl apply -f k8s/secret.yaml
    kubectl apply -f k8s/deployment.yaml
    kubectl apply -f k8s/service.yaml
    kubectl apply -f k8s/hpa.yaml
    
    # Wait for deployment to be ready
    echo -e "${YELLOW}Waiting for deployment to be ready...${NC}"
    kubectl wait --for=condition=available --timeout=300s deployment/lambda-performance-mcp -n "$NAMESPACE"
    
    echo -e "${GREEN}Deployment completed to Kubernetes${NC}"
    echo -e "${BLUE}Check status: kubectl get pods -n $NAMESPACE${NC}"
    echo -e "${BLUE}View logs: kubectl logs -f deployment/lambda-performance-mcp -n $NAMESPACE${NC}"
}

# Function to deploy with Docker
deploy_docker() {
    echo -e "${YELLOW}Deploying with Docker...${NC}"
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        echo -e "${YELLOW}.env file not found. Creating from template...${NC}"
        cp .env.example .env
        echo -e "${RED}Please edit .env file with your AWS credentials before running again${NC}"
        exit 1
    fi
    
    # Source environment variables
    set -a
    source .env
    set +a
    
    # Stop existing container if running
    docker stop lambda-performance-mcp 2>/dev/null || true
    docker rm lambda-performance-mcp 2>/dev/null || true
    
    # Run container
    docker run -d \
        --name lambda-performance-mcp \
        --restart unless-stopped \
        --env-file .env \
        -v "${HOME}/.aws:/home/mcp/.aws:ro" \
        -v "$(pwd)/logs:/app/logs" \
        lambda-performance-mcp:latest
    
    echo -e "${GREEN}Deployment completed with Docker${NC}"
    echo -e "${BLUE}Check status: docker ps | grep lambda-performance-mcp${NC}"
    echo -e "${BLUE}View logs: docker logs -f lambda-performance-mcp${NC}"
}

# Function to show deployment status
show_status() {
    echo -e "${BLUE}Deployment Status:${NC}"
    
    case $DEPLOYMENT_TYPE in
        "docker-compose")
            if [ "$ENVIRONMENT" = "development" ]; then
                docker-compose -f docker-compose.dev.yml ps
            else
                docker-compose -f docker-compose.yml ps
            fi
            ;;
        "kubernetes"|"k8s")
            kubectl get pods -n "$NAMESPACE"
            kubectl get services -n "$NAMESPACE"
            ;;
        "docker")
            docker ps | grep lambda-performance-mcp || echo "Container not running"
            ;;
    esac
}

# Main deployment logic
main() {
    check_prerequisites
    
    case $DEPLOYMENT_TYPE in
        "docker-compose")
            deploy_docker_compose
            ;;
        "kubernetes"|"k8s")
            deploy_kubernetes
            ;;
        "docker")
            deploy_docker
            ;;
        *)
            echo -e "${RED}Unknown deployment type: $DEPLOYMENT_TYPE${NC}"
            echo -e "${BLUE}Supported types: docker-compose, kubernetes, docker${NC}"
            exit 1
            ;;
    esac
    
    show_status
    
    echo -e "${GREEN}Deployment completed successfully!${NC}"
}

# Show usage if no arguments
if [ $# -eq 0 ]; then
    echo -e "${BLUE}Usage: $0 <deployment-type> [environment]${NC}"
    echo -e "${BLUE}Deployment types: docker-compose, kubernetes, docker${NC}"
    echo -e "${BLUE}Environments: production, development${NC}"
    echo -e "${BLUE}Examples:${NC}"
    echo -e "  $0 docker-compose production"
    echo -e "  $0 kubernetes"
    echo -e "  $0 docker development"
    exit 1
fi

main