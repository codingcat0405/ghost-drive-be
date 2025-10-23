# Ghost Drive Docker Configuration

This directory contains all Docker-related files for Ghost Drive Backend deployment.

## 📁 Contents

```
Docker/
├── Dockerfile                  # Multi-stage production build
├── docker-compose.dev.yml      # Development infrastructure (DB + MinIO)
├── docker-compose.prod.yml     # Full production stack (DB + MinIO + Backend + Frontend)
├── env.example                 # Environment configuration template
└── README.md                   # This file
```

## 🚀 Usage

### Development Mode

Use `docker-compose.dev.yml` when developing locally with `bun dev`:

```bash
# Navigate to Docker directory
cd Docker

# Copy environment file
cp env.example .env

# Start development infrastructure (PostgreSQL + MinIO only)
docker-compose -f docker-compose.dev.yml --profile all up -d

# Go back to project root and run backend locally
cd ..
bun dev
```

**What runs:**
- ✅ PostgreSQL (port 5432)
- ✅ MinIO (ports 9000, 9001)
- ❌ Backend (run with `bun dev`)
- ❌ Frontend (run separately in frontend repo)

**Access:**
- **Backend** (local): http://localhost:3000
- **PostgreSQL**: localhost:5432
- **MinIO Console**: http://localhost:9001

### Production Mode

Use `docker-compose.prod.yml` for complete full-stack deployment:

```bash
# Navigate to Docker directory
cd Docker

# Copy environment file
cp env.example .env

# Edit configuration
nano .env

# Generate secure secrets
echo "JWT_SECRET=$(openssl rand -base64 64)" >> .env

# Start all services (full stack)
docker-compose -f docker-compose.prod.yml --profile all up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

**What runs:**
- ✅ PostgreSQL (port 5432)
- ✅ MinIO (ports 9000, 9001)
- ✅ Backend (port 3000)
- ✅ Frontend (port 80)

**Access:**
- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:3000
- **MinIO Console**: http://localhost:9001

## 🎛️ Profile Options

Both compose files support selective service deployment using profiles:

### Development Profiles (`docker-compose.dev.yml`)

```bash
# Run both database and storage
docker-compose -f docker-compose.dev.yml --profile all up -d

# Run only database
docker-compose -f docker-compose.dev.yml --profile database up -d

# Run only storage
docker-compose -f docker-compose.dev.yml --profile storage up -d
```

### Production Profiles (`docker-compose.prod.yml`)

```bash
# Run everything (full stack)
docker-compose -f docker-compose.prod.yml --profile all up -d

# Run backend services only (DB + Storage + Backend)
docker-compose -f docker-compose.prod.yml --profile database --profile storage --profile backend up -d

# Run with external database
docker-compose -f docker-compose.prod.yml --profile storage --profile backend --profile frontend up -d

# Run with external storage (S3)
docker-compose -f docker-compose.prod.yml --profile database --profile backend --profile frontend up -d

# Run only infrastructure (DB + Storage)
docker-compose -f docker-compose.prod.yml --profile database --profile storage up -d
```

## 🔧 Configuration

### Required Environment Variables

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=ghost_drive

# Storage
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=secure_secret

# Security (Production only)
JWT_SECRET=your_jwt_secret_min_64_chars
```

### Generate Secure Secrets

```bash
# JWT secret (64 bytes)
openssl rand -base64 64

# Passwords (32 bytes)
openssl rand -base64 32
```

### Optional Environment Variables

See `env.example` for all available options including:
- Custom ports
- External database/storage configuration
- Backend/Frontend image versions
- SSL/TLS settings

## 🐳 Docker Image

### Building Locally

```bash
# Build production image
docker build -f Dockerfile -t ghost-drive-be:local .

# Build for specific platform
docker build --platform linux/amd64 -f Dockerfile -t ghost-drive-be:local .

# Build multi-platform (requires buildx)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f Dockerfile \
  -t ghost-drive-be:latest \
  .
```

### Using Pre-built Images

```bash
# Pull from Docker Hub
docker pull ghostdrive/ghost-drive-be:latest

# Pull specific version
docker pull ghostdrive/ghost-drive-be:v1.0.0

# Run standalone
docker run -d \
  -p 3000:8080 \
  -e POSTGRES_HOST=db \
  -e MINIO_ENDPOINT=storage \
  -e JWT_SECRET=secret \
  ghostdrive/ghost-drive-be:latest
```

## 📊 Common Commands

### Development

```bash
# Start dev infrastructure
docker-compose -f docker-compose.dev.yml --profile all up -d

# Stop dev infrastructure
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Restart a service
docker-compose -f docker-compose.dev.yml restart postgres
```

### Production

```bash
# Start production stack
docker-compose -f docker-compose.prod.yml --profile all up -d

# Stop production stack
docker-compose -f docker-compose.prod.yml --profile all down

# Update images and restart
docker-compose -f docker-compose.prod.yml --profile all pull
docker-compose -f docker-compose.prod.yml --profile all up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Scale services (if needed)
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Maintenance

```bash
# Backup database
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U postgres ghost_drive > backup.sql

# Restore database
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres ghost_drive < backup.sql

# Access database console
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d ghost_drive

# Check service health
docker-compose -f docker-compose.prod.yml ps

# Remove volumes (CAREFUL: deletes data!)
docker-compose -f docker-compose.prod.yml down -v
```

## 🔍 Troubleshooting

### Services Won't Start

```bash
# Check logs for errors
docker-compose -f docker-compose.dev.yml logs

# Verify configuration
docker-compose -f docker-compose.dev.yml config

# Check port conflicts
netstat -tuln | grep -E '5432|9000|3000|80'

# Rebuild images
docker-compose -f docker-compose.prod.yml build --no-cache
```

### Database Connection Issues

```bash
# Verify database is running
docker-compose -f docker-compose.dev.yml ps postgres

# Check database logs
docker-compose -f docker-compose.dev.yml logs postgres

# Test connection
docker-compose -f docker-compose.dev.yml exec postgres \
  psql -U postgres -d ghost_drive -c "SELECT 1"

# Check environment variables
docker-compose -f docker-compose.dev.yml exec backend env | grep POSTGRES
```

### Storage Issues

```bash
# Check MinIO status
docker-compose -f docker-compose.dev.yml ps minio

# View MinIO logs
docker-compose -f docker-compose.dev.yml logs minio

# Access MinIO console
# Open http://localhost:9001 in browser
```

## 📚 Deployment Scenarios

### Scenario 1: Local Development

```bash
# Start infrastructure
cd Docker
docker-compose -f docker-compose.dev.yml --profile all up -d

# Run backend locally
cd ..
bun dev
```

### Scenario 2: Full Local Stack (Testing)

```bash
cd Docker
docker-compose -f docker-compose.prod.yml --profile all up -d
```

### Scenario 3: Production with External Database

```env
# .env
COMPOSE_PROFILES=storage,backend,frontend
POSTGRES_HOST=prod-db.example.com
POSTGRES_PASSWORD=secure_prod_password
```

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Scenario 4: Production with AWS S3

```env
# .env
COMPOSE_PROFILES=database,backend,frontend
MINIO_ENDPOINT=s3.amazonaws.com
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=aws_key
MINIO_SECRET_KEY=aws_secret
```

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🔒 Security Notes

### Development
- Default passwords are acceptable
- Ports can be exposed
- Use `dev` volume names

### Production
- ✅ Change ALL default passwords
- ✅ Use strong JWT secret (64+ chars)
- ✅ Enable HTTPS with reverse proxy
- ✅ Don't expose database/MinIO ports publicly
- ✅ Use environment-specific `.env` files
- ✅ Enable firewall rules
- ✅ Set up automated backups
- ✅ Use specific image versions (not `latest`)

## 📖 Additional Documentation

- **[Complete Docker Guide](../docs/DOCKER.md)** - Comprehensive Docker documentation
- **[Self-Hosting Guide](../docs/SELF_HOSTING.md)** - Production deployment guide
- **[Quick Reference](../docs/QUICK_REFERENCE.md)** - Command cheat sheet
- **[Release Process](../docs/RELEASE_PROCESS.md)** - Creating releases
- **[Main README](../README.md)** - Project overview

## 🆘 Getting Help

If you encounter issues:

1. Check logs: `docker-compose -f docker-compose.*.yml logs -f`
2. Verify environment variables in `.env`
3. Ensure ports are not in use
4. Check Docker resources (RAM, disk)
5. Review documentation
6. Open a GitHub issue with logs

---

**Quick Links:**
- [Dockerfile Reference](Dockerfile)
- [Dev Compose](docker-compose.dev.yml)
- [Prod Compose](docker-compose.prod.yml)
- [Environment Config](env.example)

