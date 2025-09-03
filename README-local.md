# Local Development Setup

This guide explains how to set up the local development environment for Ghost Drive backend using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed
- Bun runtime installed
- Git repository cloned

## Quick Start

### 1. Environment Setup

Copy the environment template and update values if needed:
```bash
cp env.example .env
```

**Important:** Update the `JWT_SECRET` in `.env` with a secure random string.

### 2. Start Services

Start MinIO and PostgreSQL services:
```bash
docker-compose up -d
```

### 3. Verify Services

Check if services are running:
```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs -f

# Check MinIO health
curl http://localhost:9000/minio/health/live

# Check PostgreSQL connection
docker exec postgres_db pg_isready -U postgres -d ghost_drive
```

### 4. Start Application

In a new terminal, start the Ghost Drive backend:
```bash
bun run dev
```

## Service Details

### MinIO (Object Storage)
- **API Endpoint:** http://localhost:9000
- **Console:** http://localhost:9000
- **Default Credentials:** `minioadmin` / `minioadmin`
- **Ports:** 9000 (API), 3000 (Console)

### PostgreSQL (Database)
- **Host:** localhost
- **Port:** 5432
- **Database:** ghost_drive
- **User:** postgres
- **Password:** 1

## Useful Commands

```bash
# Start services in background
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs for specific service
docker-compose logs -f minio
docker-compose logs -f postgres

# Access PostgreSQL shell
docker exec -it postgres_db psql -U postgres -d ghost_drive

# Access MinIO shell
docker exec -it minio mc
```

## Troubleshooting

### Port Conflicts
If you get port conflicts, check what's using the ports:
```bash
# Windows
netstat -ano | findstr :9000
netstat -ano | findstr :5432

# Linux/Mac
lsof -i :9000
lsof -i :5432
```

### Service Won't Start
Check service logs:
```bash
docker-compose logs minio
docker-compose logs postgres
```

### Reset Everything
To completely reset the environment:
```bash
docker-compose down -v
docker-compose up -d
```

## Next Steps

After services are running:
1. The application will automatically create database tables on first run
2. MinIO buckets will be created automatically when needed
3. Access the API at http://localhost:3000
4. View API documentation at http://localhost:3000/swagger-ui
