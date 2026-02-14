# 🔐 Ghost Drive

A secure end-to-end encrypted file storage system built with **Elysia** and **Bun runtime**. Ghost Drive ensures that only users can decrypt their files - even the development team cannot access user data.

## 🚀 Features

- **True End-to-End Encryption**: Files are encrypted on the client side using AES-256
- **Client-Side Key Generation**: AES keys generated on frontend, preventing backend backdoors
- **PIN-Based Security**: User-defined PINs protect encryption keys (PIN never leaves client)
- **Zero-Knowledge Architecture**: Server cannot decrypt user files even if compromised
- **Per-User Bucket Isolation**: Each user gets their own dedicated MinIO bucket for complete data isolation
- **Virtual Folder Organization**: Files are organized via path field in frontend while maintaining flat storage structure
- **MinIO Integration**: Scalable S3-compatible object storage
- **Modern Stack**: Built with Elysia.js and Bun runtime
- **RESTful API**: Complete file management endpoints
- **JWT Authentication**: Secure user authentication
- **Swagger Documentation**: Interactive API documentation

## 📁 File System Architecture

Ghost Drive implements a unique file system architecture that provides both security and flexibility:

### Per-User Bucket Isolation

When a user registers, the system automatically creates a dedicated MinIO bucket for that user:

```
User Registration Flow:
┌─────────────┐
│    User     │
│  Registers  │
└─────────────┘
        │
        ▼
┌─────────────┐
│   Backend   │
│ Creates     │
│ Bucket:     │
│ ghostdrive- │
│ {username}  │
└─────────────┘
        │
        ▼
┌─────────────┐
│   MinIO     │
│ Storage     │
│             │
│ ghostdrive- │
│ user1/      │
│ ghostdrive- │
│ user2/      │
│ ghostdrive- │
│ user3/      │
└─────────────┘
```

### Virtual Folder Organization

Files are stored in a flat structure within each user's bucket, but users can organize them using virtual folders through the `path` field:

**Storage Reality (MinIO Bucket):**

```
ghostdrive-user1/
├── file1.txt
├── file2.pdf
├── file3.jpg
└── file4.docx
```

**User Experience (Frontend Organization):**

```
📁 Documents/
├── 📄 file1.txt
└── 📄 file2.pdf

📁 Photos/
├── 🖼️ file3.jpg

📁 Work/
└── 📄 file4.docx
```

### File Entity Structure

The `File` entity contains all necessary information for file management:

```typescript
{
  id: number,           // Unique file identifier
  name: string,         // Original filename
  objectKey: string,    // MinIO object key (filename in bucket)
  path: string,         // Virtual path for frontend organization (e.g., "/Documents/Work/")
  size: number,         // File size in bytes
  mimeType: string,     // File MIME type
  userId: number        // Owner user ID
}
```

### Benefits of This Architecture

1. **Complete Data Isolation**: Each user's files are stored in separate buckets
2. **Simplified Storage**: No complex folder hierarchies in MinIO
3. **Flexible Organization**: Users can create unlimited virtual folders
4. **Easy Migration**: Simple to move files between virtual folders
5. **Scalable**: Flat storage structure scales better than nested folders
6. **Security**: Bucket-level access control prevents cross-user data access

## 🔒 How Encryption Works

Ghost Drive implements a sophisticated encryption system that ensures complete privacy:

### Encryption Architecture

1. **PIN-Based Key Derivation**: Users provide a secret PIN (e.g., "123456")
2. **Client-Side AES Key Generation**: Frontend generates a random AES-256 key for file encryption
3. **Key Encryption**: The AES key is encrypted using the user's PIN on the client side
4. **Secure Storage**: Only the encrypted AES key is sent to and stored in the database
5. **Zero-Knowledge**: Backend never sees the plain PIN or plain AES key
6. **Client-Side Processing**: All file encryption/decryption happens on the client

### Step-by-Step Process

#### File Upload (Encryption)

```
┌─────────────┐
│    User     │
│             │
└─────────────┘
        │
        ▼
┌─────────────┐
│ Generate    │
│ Random AES  │
│ Key         │
└─────────────┘
        │
        ▼
┌─────────────┐
│ Encrypt AES │
│ Key with    │
│ PIN         │
└─────────────┘
        │
        ▼
┌─────────────┐    Encrypted    ┌─────────────┐
│    User     │ ───────────────►│   Backend   │
│             │    AES Key      │             │
└─────────────┘                 └─────────────┘
                                    │
                                    ▼
┌─────────────┐    Encrypted    ┌─────────────┐
│  Database   │ ◄────────────── │   Backend   │
│             │    AES Key      │             │
└─────────────┘                 └─────────────┘
                                    │
                                    ▼
┌─────────────┐
│ Encrypt     │
│ File with   │
│ Plain AES   │
│ Key         │
└─────────────┘
        │
        ▼
┌─────────────┐    Encrypted    ┌─────────────┐
│    User     │ ───────────────►│   MinIO     │
│             │      File       │  Storage    │
└─────────────┘                 └─────────────┘
```

**Step-by-step explanation:**

1. **User generates AES key**: Frontend creates a random AES-256 encryption key
2. **Client-side key encryption**: AES key is encrypted using the user's PIN (PIN never leaves client)
3. **Send encrypted key**: Only the encrypted AES key is sent to the backend
4. **Store encrypted key**: Backend saves the encrypted AES key in the database
5. **File encryption**: User encrypts their file with the plain AES key (stored locally)
6. **Upload encrypted file**: Encrypted file is uploaded to user's dedicated MinIO bucket

#### File Download (Decryption)

```
┌─────────────┐    Request     ┌─────────────┐
│    User     │ ──────────────►│   Backend   │
│             │   File ID      │             │
└─────────────┘                └─────────────┘
                                    │
                                    ▼
┌─────────────┐    Encrypted    ┌─────────────┐
│  Database   │ ───────────────►│   Backend   │
│             │    AES Key      │             │
└─────────────┘                 └─────────────┘
                                    │
                                    ▼
┌─────────────┐    Encrypted    ┌─────────────┐
│    User     │ ◄────────────── │   Backend   │
│             │    AES Key      │             │
└─────────────┘                 └─────────────┘
        │
        ▼
┌─────────────┐
│ Decrypt AES │
│ Key with    │
│ PIN         │
└─────────────┘
        │
        ▼
┌─────────────┐    Encrypted    ┌─────────────┐
│    User     │ ───────────────►│   MinIO     │
│             │   File Request  │  Storage    │
└─────────────┘                 └─────────────┘
                                    │
                                    ▼
┌─────────────┐    Encrypted    ┌─────────────┐
│    User     │ ◄────────────── │   MinIO     │
│             │      File       │  Storage    │
└─────────────┘                 └─────────────┘
        │
        ▼
┌─────────────┐
│ Decrypt     │
│ File with   │
│ Plain AES   │
│ Key         │
└─────────────┘
        │
        ▼
┌─────────────┐
│ Original    │
│ File        │
│ Restored    │
└─────────────┘
```

**Step-by-step explanation:**

1. **User requests file**: User asks for a file by ID (no PIN sent to backend)
2. **Backend retrieves key**: Server gets the encrypted AES key from database
3. **Send encrypted key**: Backend sends the encrypted AES key to user
4. **Client decrypts key**: User decrypts the AES key using their PIN (stored locally)
5. **Request encrypted file**: User requests the encrypted file from their MinIO bucket
6. **Receive encrypted file**: MinIO sends the encrypted file to user
7. **File decryption**: User decrypts the file using the plain AES key
8. **Original file restored**: User now has access to the original file

## 🛠️ Technology Stack

- **Runtime**: [Bun](https://bun.sh/) - Fast JavaScript runtime
- **Framework**: [Elysia](https://elysiajs.com/) - Fast web framework
- **Database**: PostgreSQL with [MikroORM](https://mikro-orm.io/)
- **Storage**: [MinIO](https://min.io/) - S3-compatible object storage
- **Authentication**: JWT tokens
- **Documentation**: Swagger/OpenAPI

## 📋 Prerequisites

- [Bun](https://bun.sh/) (v1.0.0 or higher)
- [PostgreSQL](https://www.postgresql.org/) (v12 or higher)
- [MinIO](https://min.io/) server
- [Docker](https://www.docker.com/) (optional)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ghost-drive-be
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/ghost_drive

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key

# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_USE_SSL=false

# Server Configuration
PORT=3000
```

### 4. Database Setup

```bash
# Create database
createdb ghost_drive

# Run migrations (auto-generated by MikroORM)
bun run dev
```

### 5. Start MinIO

```bash
# Using Docker
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=admin" \
  -e "MINIO_ROOT_PASSWORD=password123" \
  minio/minio server /data --console-address ":9001"

# Or download and run MinIO directly
# https://min.io/download
```

### 6. Run the Application

```bash
# Development mode with hot reload
bun dev

# Production mode
bun start
```

The application will be available at:

- **API**: <http://localhost:3000>
- **Swagger Documentation**: <http://localhost:3000/swagger-ui>
- **MinIO Console**: <http://localhost:9001>

## 🐳 Docker Deployment

Ghost Drive can be deployed with Docker in under 5 minutes. Choose your deployment method:

### Option 1: Full Stack with Docker Compose (Recommended)

Deploy everything (database, storage, backend, frontend) with one command:

```bash
# Clone repository
git clone <repository-url>
cd ghost-drive-be

# Configure environment
cp env.example .env
nano .env  # Edit with your settings

# Start all services
npm run docker

# Or manually:
docker-compose -f docker/docker-compose.yml --env-file .env --profile all up -d

# Check status
docker-compose -f docker/docker-compose.yml ps

# View logs
docker-compose -f docker/docker-compose.yml logs -f

# Stop all services
npm run docker:down
```

**Access your instance:**
- **Frontend**: http://localhost (port 80)
- **Backend API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/swagger-ui
- **MinIO Console**: http://localhost:9001

### Option 2: Pre-built Docker Image

Use the published Docker image with your own database and storage:

```bash
# Pull the latest image
docker pull ghostdrive/ghost-drive-be:latest

# Run with your configuration
docker run -d \
  --name ghost-drive-backend \
  -p 3000:8080 \
  -e POSTGRES_HOST=your-db-host \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your-password \
  -e POSTGRES_DB=ghost_drive \
  -e MINIO_ENDPOINT=your-minio-host \
  -e MINIO_ACCESS_KEY=your-access-key \
  -e MINIO_SECRET_KEY=your-secret-key \
  -e JWT_SECRET=your-jwt-secret \
  ghostdrive/ghost-drive-be:latest
```

### Option 3: Build Locally

```bash
# Build the image
docker build -f docker/Dockerfile -t ghost-drive-be:local .

# Run it
docker run -d -p 3000:8080 \
  --env-file .env \
  ghost-drive-be:local
```

### Flexible Deployment Profiles

Use Docker Compose profiles to run only what you need:

```bash
# Everything (default)
docker-compose -f docker/docker-compose.yml --env-file .env --profile all up -d

# Backend only (external DB & storage)
docker-compose -f docker/docker-compose.yml --env-file .env --profile backend up -d

# Infrastructure only (DB + MinIO)
docker-compose -f docker/docker-compose.yml --env-file .env --profile database --profile storage up -d

# Backend + Frontend (external DB & storage)
docker-compose -f docker/docker-compose.yml --env-file .env --profile backend --profile frontend up -d
```

### Required Environment Variables

Create a `.env` file with these minimum requirements:

```env
# Service profiles
COMPOSE_PROFILES=all

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=changeme_secure_password
POSTGRES_DB=ghost_drive
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# MinIO Storage
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=changeme_secure_secret_key
MINIO_BUCKET_NAME=ghost-drive
MINIO_USE_SSL=false

# Security (IMPORTANT: Change these!)
JWT_SECRET=changeme_super_secret_jwt_key_minimum_32_characters

# Application Ports
BACKEND_PORT=3000
FRONTEND_PORT=80
MINIO_CONSOLE_PORT=9001
```

**Generate secure secrets:**
```bash
# JWT secret (64 characters)
openssl rand -base64 64

# Passwords (32 characters)
openssl rand -base64 32
```

### Common Docker Operations

```bash
# Start services
npm run docker

# Stop services
npm run docker:down

# View logs
docker-compose -f docker/docker-compose.yml logs -f backend

# Restart a service
docker-compose -f docker/docker-compose.yml restart backend

# Rebuild after code changes
docker-compose -f docker/docker-compose.yml build --no-cache backend
docker-compose -f docker/docker-compose.yml up -d backend

# Update to latest images
docker-compose -f docker/docker-compose.yml pull
docker-compose -f docker/docker-compose.yml up -d

# Clean up
docker-compose -f docker/docker-compose.yml down -v  # Warning: Deletes data!
docker system prune -a  # Clean unused images
```

### Production Setup

For production deployments:

**1. Use strong secrets:**
```bash
# Generate and update in .env
JWT_SECRET=$(openssl rand -base64 64)
POSTGRES_PASSWORD=$(openssl rand -base64 32)
MINIO_SECRET_KEY=$(openssl rand -base64 32)
```

**2. Use a reverse proxy with SSL:**
```nginx
# Example Nginx configuration
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**3. Configure firewall:**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3000/tcp  # Block direct backend access
sudo ufw deny 9000/tcp  # Block direct MinIO access
```

**4. Set up automated backups:**
```bash
# Database backup
docker-compose -f docker/docker-compose.yml exec postgres \
  pg_dump -U postgres ghost_drive | gzip > backup-$(date +%Y%m%d).sql.gz

# MinIO backup
docker run --rm --volumes-from ghost-drive-minio \
  -v $(pwd):/backup alpine \
  tar czf /backup/minio-backup-$(date +%Y%m%d).tar.gz /data
```

### Publishing Docker Images (For Maintainers)

Ghost Drive automatically builds and publishes to Docker Hub when you create a version tag:

```bash
# Create a release
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions automatically:
# ✅ Builds multi-platform images (amd64, arm64)
# ✅ Pushes to Docker Hub
# ✅ Creates GitHub Release
```

**Available tags:**
- `latest` - Latest stable release
- `v1.2.3` - Specific version (recommended for production)
- `v1.2` - Latest patch
- `v1` - Latest minor
- `v1.0.0-beta` - Pre-releases

**Setup (one-time):**
1. Add GitHub Secrets: `DOCKER_USERNAME` and `DOCKER_PASSWORD`
2. Update image name in `.github/workflows/docker-publish.yml`

### Troubleshooting

**Services won't start:**
```bash
# Check logs
docker-compose -f docker/docker-compose.yml logs backend

# Check configuration
docker-compose -f docker/docker-compose.yml config

# Verify environment variables
cat .env | grep -E 'POSTGRES|MINIO|JWT'

# Restart services
docker-compose -f docker/docker-compose.yml restart
```

**Backend health check fails:**
```bash
# Check if backend is running
docker logs ghost-drive-backend

# Test connection manually
docker exec ghost-drive-backend curl http://localhost:8080

# Verify port mappings
docker ps | grep ghost-drive
```

**Database connection errors:**
```bash
# Test database connection
docker-compose -f docker/docker-compose.yml exec postgres \
  psql -U postgres -d ghost_drive -c "SELECT 1"

# Check database logs
docker-compose -f docker/docker-compose.yml logs postgres

# Verify credentials
docker-compose -f docker/docker-compose.yml exec backend env | grep POSTGRES
```

**Out of disk space:**
```bash
# Check disk usage
docker system df

# Clean up
docker system prune -a --volumes  # Warning: Removes all unused data
```

## 📚 API Documentation

### Authentication

All API endpoints require JWT authentication (except registration/login).

```bash
# Register a new user
POST /api/users/register
{
  "username": "user@example.com",
  "password": "securepassword"
}

# Login
POST /api/users/login
{
  "username": "user@example.com",
  "password": "securepassword"
}
```

### User Management

```bash
# Get user profile
GET /api/users/me
Authorization: Bearer <jwt-token>

# Upload encrypted AES key (setup encryption)
POST /api/users/upload-aes-key-encrypted
Authorization: Bearer <jwt-token>
{
  "aesKeyEncrypted": "encrypted-aes-key-string"
}

# Get encrypted AES key
GET /api/users/get-aes-key-encrypted
Authorization: Bearer <jwt-token>

# Update encrypted AES key
POST /api/users/update-aes-key-encrypted
Authorization: Bearer <jwt-token>
{
  "aesKeyEncrypted": "new-encrypted-aes-key-string"
}

# Update user avatar
POST /api/users/update-avatar
Authorization: Bearer <jwt-token>
{
  "avatar": "base64-encoded-avatar-image"
}
```

### File Operations

**Note**: File operations are currently implemented through MinIO presigned URLs for enhanced security. The frontend should:

1. Get presigned URLs from the backend
2. Upload/download files directly to/from MinIO
3. Store file metadata in the database

```bash
# Get upload presigned URL
GET /api/files/upload-url
Authorization: Bearer <jwt-token>
Query Parameters:
- filename: string (required)
- path: string (optional, default: "/")

# Get download presigned URL
GET /api/files/download-url/:fileId
Authorization: Bearer <jwt-token>

# List user files
GET /api/files
Authorization: Bearer <jwt-token>
Query Parameters:
- path: string (optional, filter by virtual path)

# Delete file
DELETE /api/files/:fileId
Authorization: Bearer <jwt-token>
```

### File Upload Process

1. **Get Upload URL**: Request a presigned URL from the backend
2. **Upload to MinIO**: Use the presigned URL to upload the encrypted file directly to MinIO
3. **Store Metadata**: Send file metadata to the backend to store in the database

```javascript
// Example upload flow
const uploadUrl = await fetch('/api/files/upload-url?filename=document.pdf&path=/Documents/', {
  headers: { 'Authorization': `Bearer ${token}` }
});

await fetch(uploadUrl, {
  method: 'PUT',
  body: encryptedFile
});

// Store file metadata
await fetch('/api/files/metadata', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    name: 'document.pdf',
    objectKey: 'document.pdf',
    path: '/Documents/',
    size: encryptedFile.size,
    mimeType: 'application/pdf'
  })
});
```

### File Download Process

1. **Get Download URL**: Request a presigned URL for the file
2. **Download from MinIO**: Use the presigned URL to download the encrypted file directly from MinIO
3. **Decrypt Locally**: Decrypt the file using the user's AES key and PIN

```javascript
// Example download flow
const downloadUrl = await fetch('/api/files/download-url/123', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const encryptedFile = await fetch(downloadUrl);
// Decrypt file using user's AES key and PIN
```

## 🔧 Development

### Project Structure

```
src/
├── controllers/     # API route handlers
│   └── user.controller.ts
├── entities/        # Database models
│   ├── BaseEntity.ts
│   ├── File.ts
│   └── User.ts
├── macros/          # Elysia macros (auth, etc.)
│   └── auth.ts
├── middlewares/     # Request/response middleware
│   ├── errorMiddleware.ts
│   └── responseMiddleware.ts
├── services/        # Business logic
│   ├── MinioService.ts
│   └── UserService.ts
├── db.ts           # Database configuration
├── index.ts        # Application entry point
└── mikro-orm.config.ts
```

### Available Scripts

```bash
# Development with hot reload
bun dev

# Production mode
bun start

# Run tests
bun test

# Build for production
bun run build
```

### Adding New Features

1. **Create Entity**: Add new models in `src/entities/`
2. **Create Service**: Add business logic in `src/services/`
3. **Create Controller**: Add API endpoints in `src/controllers/`
4. **Update Documentation**: Modify Swagger docs in controller files

## 🔐 Security Considerations

- **PIN Security**: Users should use strong, unique PINs
- **Client-Side Key Generation**: AES keys are generated on the frontend, preventing backend backdoors
- **PIN Never Transmitted**: User PINs never leave the client, preventing man-in-the-middle attacks
- **Zero-Knowledge Architecture**: Backend cannot decrypt files even if compromised
- **Bucket Isolation**: Each user's files are stored in separate buckets for complete isolation
- **Presigned URLs**: File uploads/downloads use presigned URLs for enhanced security
- **Key Rotation**: Consider implementing key rotation mechanisms
- **Rate Limiting**: Implement rate limiting for authentication endpoints
- **HTTPS**: Always use HTTPS in production
- **Audit Logging**: Log access attempts and file operations (without sensitive data)
- **Backup Strategy**: Implement secure backup for encrypted keys

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies for maximum security and performance
- Special thanks to the Elysia.js and Bun communities

---

**⚠️ Important**: This is a security-critical application. Always review the encryption implementation and conduct security audits before deploying to production.

**🔐 Remember**: The strength of your encryption depends on the strength of your PIN. Choose wisely!
