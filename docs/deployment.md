# Deployment Guide

This guide covers different deployment options for the JasperReports MCP Server.

## Table of Contents

- [NPM Package Deployment](#npm-package-deployment)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Development Deployment](#development-deployment)
- [Configuration Management](#configuration-management)
- [CI/CD Pipeline](#cicd-pipeline)

## NPM Package Deployment

### Global Installation

Install the package globally to use as a command-line tool:

```bash
npm install -g jasperreports-mcp-server
```

### Local Installation

Install in your project:

```bash
npm install jasperreports-mcp-server
```

### Usage

After installation, configure your MCP client with the appropriate configuration:

**Production Configuration:**
```json
{
  "mcpServers": {
    "jasperreports-server": {
      "command": "npx",
      "args": ["jasperreports-mcp-server@latest"],
      "env": {
        "JASPER_URL": "https://reports.company.com/jasperserver",
        "JASPER_AUTH_TYPE": "basic",
        "JASPER_USERNAME": "service_account",
        "JASPER_PASSWORD": "secure_password"
      }
    }
  }
}
```

## Docker Deployment

### Quick Start

1. **Pull the image:**
   ```bash
   docker pull ghcr.io/user/jasperreports-mcp-server:latest
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run the container:**
   ```bash
   docker run -p 3000:3000 --env-file .env ghcr.io/user/jasperreports-mcp-server:latest
   ```

### Docker Compose

Use the provided `docker-compose.yml`:

```bash
# Production deployment
docker-compose up -d

# Development deployment with hot reload
docker-compose --profile dev up -d
```

### Custom Docker Build

Build your own image:

```bash
docker build -t my-jasperreports-mcp-server .
docker run -p 3000:3000 --env-file .env my-jasperreports-mcp-server
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (v1.20+)
- kubectl configured
- NGINX Ingress Controller (optional)
- cert-manager (optional, for TLS)

### Quick Deployment

1. **Update configuration:**
   ```bash
   # Edit k8s/secret.yaml with your JasperReports Server details
   kubectl apply -f k8s/secret.yaml
   ```

2. **Deploy all resources:**
   ```bash
   kubectl apply -f k8s/
   ```

3. **Verify deployment:**
   ```bash
   kubectl get pods -n jasperreports-mcp
   kubectl logs -f deployment/jasperreports-mcp-server -n jasperreports-mcp
   ```

### Configuration

Update the secret with your JasperReports Server details:

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: jasperreports-mcp-secret
  namespace: jasperreports-mcp
type: Opaque
stringData:
  JASPER_URL: "https://your-jasperserver.com/jasperserver"
  JASPER_USERNAME: "your_username"
  JASPER_PASSWORD: "your_password"
  JASPER_ORGANIZATION: "your_organization"
```

### Scaling

Scale the deployment based on your needs:

```bash
kubectl scale deployment jasperreports-mcp-server --replicas=3 -n jasperreports-mcp
```

### External Access

**Using Ingress (Recommended):**
```bash
# Update k8s/ingress.yaml with your domain
kubectl apply -f k8s/ingress.yaml
```

**Using Port Forward (Development):**
```bash
kubectl port-forward service/jasperreports-mcp-server 3000:80 -n jasperreports-mcp
```

## Development Deployment

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/user/jasperreports-mcp-server.git
   cd jasperreports-mcp-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your JasperReports Server details
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Start test server (optional):**
   ```bash
   npm run test-server
   ```

### Development with Docker

Use the development Docker configuration:

```bash
docker-compose --profile dev up --build
```

This provides:
- Hot reload for code changes
- Debug logging enabled
- Test server enabled
- Volume mounting for live development

## Configuration Management

### Environment Variables

All deployment methods support these environment variables:

#### Required
- `JASPER_URL`: JasperReports Server URL
- `JASPER_USERNAME`: Username for authentication
- `JASPER_PASSWORD`: Password for authentication

#### Optional
- `JASPER_AUTH_TYPE`: Authentication method (basic, login, argument)
- `JASPER_ORGANIZATION`: Organization for multi-tenant setups
- `JASPER_TIMEOUT`: Request timeout in milliseconds
- `JASPER_SSL_VERIFY`: Enable/disable SSL certificate verification
- `JASPER_DEBUG_MODE`: Enable debug logging
- `TEST_SERVER_ENABLED`: Enable HTTP test server
- `TEST_SERVER_PORT`: Port for test server
- `NODE_ENV`: Node.js environment
- `LOG_LEVEL`: Logging level

### Configuration Validation

Validate your configuration before deployment:

```bash
# Validate environment variables
npm run validate-config

# Validate specific environment
npm run validate-config production

# Validate configuration file
npm run validate-config development config/mcp-development.json
```

### Environment-Specific Configurations

Use the provided configuration templates:

- `config/mcp-production.json`: Production deployment
- `config/mcp-development.json`: Development environment
- `config/mcp-docker.json`: Docker deployment

## CI/CD Pipeline

The project includes a comprehensive GitHub Actions pipeline that:

### Continuous Integration
- Runs tests on multiple Node.js versions
- Performs security audits
- Validates configuration
- Builds and packages the application
- Runs integration tests against JasperReports Server

### Continuous Deployment
- Publishes to NPM registry on version tags
- Builds and pushes Docker images
- Creates GitHub releases with artifacts
- Supports deployment to Kubernetes

### Pipeline Configuration

The pipeline is triggered by:
- Push to `main` or `develop` branches
- Pull requests
- Version tags (e.g., `v1.0.0`)

### Required Secrets

Configure these secrets in your GitHub repository:

- `NPM_TOKEN`: NPM registry authentication token
- `SNYK_TOKEN`: Snyk security scanning token (optional)
- `DOCKER_USERNAME`: Docker registry username (optional)
- `DOCKER_PASSWORD`: Docker registry password (optional)

### Manual Deployment

Use the deployment script for manual deployments:

```bash
# Deploy to NPM
./scripts/deploy.sh npm

# Deploy Docker image
./scripts/deploy.sh docker

# Deploy to Kubernetes
./scripts/deploy.sh k8s

# Deploy to all targets
./scripts/deploy.sh all

# Dry run to see what would be deployed
./scripts/deploy.sh all --dry-run
```

## Production Considerations

### Security

1. **Use service accounts** with minimal required permissions
2. **Enable SSL verification** in production environments
3. **Store sensitive credentials** in secure environment variable stores
4. **Use organization-specific authentication** when available
5. **Limit auto-approved tools** to reduce security risks

### Performance

1. **Configure appropriate timeouts** for your network conditions
2. **Scale horizontally** using multiple replicas in Kubernetes
3. **Monitor resource usage** and adjust limits accordingly
4. **Use connection pooling** for high-concurrency scenarios

### Monitoring

1. **Enable structured logging** with appropriate log levels
2. **Set up health checks** for container orchestration
3. **Monitor application metrics** using Prometheus/Grafana
4. **Set up alerting** for critical failures

### Backup and Recovery

1. **Document your configuration** and deployment procedures
2. **Version control all configuration files**
3. **Test disaster recovery procedures** regularly
4. **Maintain rollback procedures** for failed deployments

## Troubleshooting

### Common Issues

1. **Connection timeouts**: Increase `JASPER_TIMEOUT` value
2. **Authentication failures**: Verify credentials and authentication type
3. **SSL certificate errors**: Set `JASPER_SSL_VERIFY=false` for testing
4. **Permission errors**: Check user permissions in JasperReports Server

### Debug Mode

Enable debug mode for detailed logging:

```bash
export JASPER_DEBUG_MODE=true
export LOG_LEVEL=debug
```

### Health Checks

Test server connectivity:

```bash
# Using the test server
curl http://localhost:3000/test_mcp -X POST \
  -H "Content-Type: application/json" \
  -d '{"operation": "jasper_test_connection", "params": {}}'

# Using MCP tools directly
jasper_test_connection
```

### Log Analysis

Check logs for issues:

```bash
# Docker
docker logs jasperreports-mcp-server

# Kubernetes
kubectl logs -f deployment/jasperreports-mcp-server -n jasperreports-mcp

# Local development
tail -f logs/application.log
```

## Support

For additional support:

1. Check the [troubleshooting guide](troubleshooting.md)
2. Review the [API documentation](api.md)
3. Create an issue on GitHub
4. Check existing issues and discussions