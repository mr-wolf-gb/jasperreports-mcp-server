#!/bin/bash

# Deployment script for JasperReports MCP Server
# Supports multiple deployment targets: npm, docker, kubernetes

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
VERSION=$(node -p "require('$ROOT_DIR/package.json').version")
REGISTRY=${NPM_REGISTRY:-"https://registry.npmjs.org"}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-""}
DOCKER_IMAGE_NAME=${DOCKER_IMAGE_NAME:-"jasperreports-mcp-server"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
JasperReports MCP Server Deployment Script

Usage: $0 [OPTIONS] TARGET

Targets:
  npm         Deploy to NPM registry
  docker      Build and push Docker image
  k8s         Deploy to Kubernetes cluster
  all         Deploy to all targets

Options:
  -h, --help          Show this help message
  -v, --version       Show version information
  -d, --dry-run       Show what would be done without executing
  -f, --force         Force deployment even if version exists
  --skip-tests        Skip running tests before deployment
  --skip-build        Skip build step
  --tag TAG           Use specific tag for Docker image (default: version)

Environment Variables:
  NPM_REGISTRY        NPM registry URL (default: https://registry.npmjs.org)
  NPM_TOKEN           NPM authentication token
  DOCKER_REGISTRY     Docker registry URL
  DOCKER_USERNAME     Docker registry username
  DOCKER_PASSWORD     Docker registry password
  KUBECONFIG          Kubernetes configuration file path

Examples:
  $0 npm                    # Deploy to NPM
  $0 docker --tag latest    # Build and push Docker image with 'latest' tag
  $0 all --dry-run          # Show what would be deployed to all targets
  $0 k8s                    # Deploy to Kubernetes

EOF
}

# Parse command line arguments
DRY_RUN=false
FORCE=false
SKIP_TESTS=false
SKIP_BUILD=false
DOCKER_TAG="$VERSION"
TARGET=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--version)
            echo "JasperReports MCP Server v$VERSION"
            exit 0
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --tag)
            DOCKER_TAG="$2"
            shift 2
            ;;
        npm|docker|k8s|all)
            TARGET="$1"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

if [[ -z "$TARGET" ]]; then
    log_error "No deployment target specified"
    show_help
    exit 1
fi

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check if we're in the right directory
    if [[ ! -f "$ROOT_DIR/package.json" ]]; then
        log_error "package.json not found. Are you in the right directory?"
        exit 1
    fi
    
    # Check if git working directory is clean
    if [[ -n "$(git status --porcelain)" ]]; then
        log_warning "Git working directory is not clean"
        if [[ "$FORCE" != "true" ]]; then
            log_error "Use --force to deploy with uncommitted changes"
            exit 1
        fi
    fi
    
    # Validate configuration
    log_info "Validating configuration..."
    if [[ "$DRY_RUN" != "true" ]]; then
        node "$SCRIPT_DIR/validate-config.js" production
    fi
    
    log_success "Pre-deployment checks passed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping tests"
        return
    fi
    
    log_info "Running tests..."
    if [[ "$DRY_RUN" != "true" ]]; then
        cd "$ROOT_DIR"
        npm test
        npm run lint
    else
        log_info "[DRY RUN] Would run: npm test && npm run lint"
    fi
    log_success "Tests passed"
}

# Build project
build_project() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        log_warning "Skipping build"
        return
    fi
    
    log_info "Building project..."
    if [[ "$DRY_RUN" != "true" ]]; then
        cd "$ROOT_DIR"
        npm run build
    else
        log_info "[DRY RUN] Would run: npm run build"
    fi
    log_success "Build completed"
}

# Deploy to NPM
deploy_npm() {
    log_info "Deploying to NPM registry: $REGISTRY"
    
    if [[ -z "$NPM_TOKEN" ]]; then
        log_error "NPM_TOKEN environment variable is required for NPM deployment"
        exit 1
    fi
    
    if [[ "$DRY_RUN" != "true" ]]; then
        cd "$ROOT_DIR"
        
        # Configure NPM registry and authentication
        npm config set registry "$REGISTRY"
        echo "//$(echo "$REGISTRY" | sed 's|https://||'):_authToken=$NPM_TOKEN" > ~/.npmrc
        
        # Check if version already exists
        if npm view "jasperreports-mcp-server@$VERSION" version &>/dev/null; then
            if [[ "$FORCE" != "true" ]]; then
                log_error "Version $VERSION already exists in registry. Use --force to override."
                exit 1
            fi
            log_warning "Version $VERSION already exists, but --force specified"
        fi
        
        # Publish to NPM
        npm publish --access public
        
        log_success "Published jasperreports-mcp-server@$VERSION to NPM"
    else
        log_info "[DRY RUN] Would publish jasperreports-mcp-server@$VERSION to $REGISTRY"
    fi
}

# Deploy Docker image
deploy_docker() {
    local full_image_name="$DOCKER_IMAGE_NAME:$DOCKER_TAG"
    if [[ -n "$DOCKER_REGISTRY" ]]; then
        full_image_name="$DOCKER_REGISTRY/$full_image_name"
    fi
    
    log_info "Building and pushing Docker image: $full_image_name"
    
    if [[ "$DRY_RUN" != "true" ]]; then
        cd "$ROOT_DIR"
        
        # Login to Docker registry if credentials provided
        if [[ -n "$DOCKER_USERNAME" && -n "$DOCKER_PASSWORD" ]]; then
            echo "$DOCKER_PASSWORD" | docker login "$DOCKER_REGISTRY" -u "$DOCKER_USERNAME" --password-stdin
        fi
        
        # Build Docker image
        docker build -t "$full_image_name" .
        
        # Also tag as latest if deploying a version tag
        if [[ "$DOCKER_TAG" == "$VERSION" ]]; then
            local latest_image_name="$DOCKER_IMAGE_NAME:latest"
            if [[ -n "$DOCKER_REGISTRY" ]]; then
                latest_image_name="$DOCKER_REGISTRY/$latest_image_name"
            fi
            docker tag "$full_image_name" "$latest_image_name"
            docker push "$latest_image_name"
            log_success "Pushed $latest_image_name"
        fi
        
        # Push Docker image
        docker push "$full_image_name"
        
        log_success "Pushed Docker image: $full_image_name"
    else
        log_info "[DRY RUN] Would build and push Docker image: $full_image_name"
    fi
}

# Deploy to Kubernetes
deploy_k8s() {
    log_info "Deploying to Kubernetes cluster"
    
    if [[ ! -f "$ROOT_DIR/k8s/deployment.yaml" ]]; then
        log_error "Kubernetes deployment files not found in k8s/ directory"
        exit 1
    fi
    
    if [[ "$DRY_RUN" != "true" ]]; then
        cd "$ROOT_DIR"
        
        # Apply Kubernetes manifests
        kubectl apply -f k8s/
        
        # Wait for deployment to be ready
        kubectl rollout status deployment/jasperreports-mcp-server
        
        log_success "Deployed to Kubernetes cluster"
    else
        log_info "[DRY RUN] Would apply Kubernetes manifests from k8s/ directory"
    fi
}

# Main deployment function
main() {
    log_info "Starting deployment of JasperReports MCP Server v$VERSION"
    log_info "Target: $TARGET"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN MODE - No actual changes will be made"
    fi
    
    # Run pre-deployment checks
    pre_deployment_checks
    
    # Run tests
    run_tests
    
    # Build project
    build_project
    
    # Deploy based on target
    case $TARGET in
        npm)
            deploy_npm
            ;;
        docker)
            deploy_docker
            ;;
        k8s)
            deploy_k8s
            ;;
        all)
            deploy_npm
            deploy_docker
            deploy_k8s
            ;;
        *)
            log_error "Unknown deployment target: $TARGET"
            exit 1
            ;;
    esac
    
    log_success "Deployment completed successfully!"
}

# Run main function
main