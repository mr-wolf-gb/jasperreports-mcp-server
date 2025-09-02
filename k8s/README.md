# Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the JasperReports MCP Server.

## Prerequisites

- Kubernetes cluster (v1.20+)
- kubectl configured to access your cluster
- NGINX Ingress Controller (optional, for external access)
- cert-manager (optional, for TLS certificates)

## Quick Start

1. **Update configuration:**
   ```bash
   # Edit the secret with your JasperReports Server details
   kubectl edit secret jasperreports-mcp-secret -n jasperreports-mcp
   ```

2. **Deploy to Kubernetes:**
   ```bash
   kubectl apply -f k8s/
   ```

3. **Verify deployment:**
   ```bash
   kubectl get pods -n jasperreports-mcp
   kubectl logs -f deployment/jasperreports-mcp-server -n jasperreports-mcp
   ```

## Configuration

### Required Configuration

Update `k8s/secret.yaml` with your JasperReports Server details:

```yaml
stringData:
  JASPER_URL: "https://your-jasperserver.com/jasperserver"
  JASPER_USERNAME: "your_username"
  JASPER_PASSWORD: "your_password"
  JASPER_ORGANIZATION: "your_organization"  # Optional
```

### Optional Configuration

Modify `k8s/configmap.yaml` for additional settings:

- `JASPER_AUTH_TYPE`: Authentication method (basic, login, argument)
- `JASPER_TIMEOUT`: Request timeout in milliseconds
- `JASPER_SSL_VERIFY`: Enable/disable SSL verification
- `JASPER_DEBUG_MODE`: Enable debug logging
- `LOG_LEVEL`: Logging level (error, warn, info, debug)

## Scaling

Scale the deployment:

```bash
kubectl scale deployment jasperreports-mcp-server --replicas=3 -n jasperreports-mcp
```

## Monitoring

The deployment includes:

- Liveness and readiness probes
- Resource limits and requests
- Prometheus annotations for metrics scraping

View logs:

```bash
kubectl logs -f deployment/jasperreports-mcp-server -n jasperreports-mcp
```

## External Access

### Using Ingress (Recommended)

1. Update `k8s/ingress.yaml` with your domain:
   ```yaml
   spec:
     tls:
     - hosts:
       - your-domain.com
     rules:
     - host: your-domain.com
   ```

2. Apply the ingress:
   ```bash
   kubectl apply -f k8s/ingress.yaml
   ```

### Using Port Forward (Development)

```bash
kubectl port-forward service/jasperreports-mcp-server 3000:80 -n jasperreports-mcp
```

## Security

The deployment follows security best practices:

- Runs as non-root user (UID 1001)
- Read-only root filesystem
- Drops all capabilities
- Uses secrets for sensitive data
- Network policies can be added for additional isolation

## Troubleshooting

### Check pod status:
```bash
kubectl get pods -n jasperreports-mcp
kubectl describe pod <pod-name> -n jasperreports-mcp
```

### View logs:
```bash
kubectl logs <pod-name> -n jasperreports-mcp
```

### Check configuration:
```bash
kubectl get configmap jasperreports-mcp-config -o yaml -n jasperreports-mcp
kubectl get secret jasperreports-mcp-secret -o yaml -n jasperreports-mcp
```

### Test connectivity:
```bash
kubectl exec -it <pod-name> -n jasperreports-mcp -- node -e "console.log('Test connection')"
```

## Cleanup

Remove all resources:

```bash
kubectl delete namespace jasperreports-mcp
```

## Advanced Configuration

### Custom Resource Limits

Modify resource requests and limits in `deployment.yaml`:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "200m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### Persistent Storage

Add persistent volumes for logs or temporary files:

```yaml
volumes:
- name: logs
  persistentVolumeClaim:
    claimName: jasperreports-mcp-logs
```

### Network Policies

Create network policies to restrict traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: jasperreports-mcp-netpol
  namespace: jasperreports-mcp
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: jasperreports-mcp-server
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 80
```