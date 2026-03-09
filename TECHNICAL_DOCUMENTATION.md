# Technical Documentation – Todo App on AWS EC2

## 1. Overview

This document describes the architecture, components, and deployment of the Todo application when hosted on **AWS EC2**. The stack runs with **Docker Compose** and includes a React frontend, Django REST API, PostgreSQL, Nginx, Adminer, and AWS S3 for image storage.

---

## 2. System Architecture

### 2.1 Components

| Component | Technology | Port (host) | Role |
|-----------|------------|-------------|------|
| **Nginx** | nginx:alpine | 80 | Reverse proxy; forwards `/api/` to Django. |
| **Frontend** | React (Vite), nginx | 3000 | SPA; serves UI and proxies `/api/` to backend. |
| **Backend** | Django + DRF + Gunicorn | (internal 8000) | REST API: todos CRUD, health, S3 presigned URLs. |
| **PostgreSQL** | postgres:16-alpine | 5432 | Persistent data store. |
| **Adminer** | adminer:latest | 8080 | Web UI for database management. |
| **S3** | AWS S3 | — | Image uploads (browser → S3 via presigned URL). |

### 2.2 Traffic Modes

- **Port 80 (Nginx)**  
  - Proxies only `/api/*` to the backend.  
  - Does not serve the React app unless you add a `location /` and static/SPA config.

- **Port 3000 (Frontend container)**  
  - Serves the React SPA and proxies `/api/*` to the backend.  
  - Typical use: point users to `http://<ec2>:3000` for the full app.

For a single entry point on port 80, you can extend the main Nginx config to serve the built frontend and keep `/api/` proxied to the backend (see Section 6).

---

## 3. Data Flow

### 3.1 API Requests

1. Client sends request to Nginx (port 80) or Frontend (port 3000).
2. Path `/api/*` is proxied to Django (e.g. `/api/todos/` → backend `http://backend:8000/todos/`).
3. Django (Gunicorn) handles the request; DRF viewset talks to PostgreSQL as needed.
4. Response is returned through the proxy to the client.

### 3.2 Image Upload (S3)

1. Client requests a presigned URL: `POST /api/todos/upload-url` with `filename` and `content_type`.
2. Backend (using boto3 and AWS credentials) generates a presigned PUT URL and the final S3 object URL.
3. Client uploads the file with `PUT` directly to S3 using the presigned URL.
4. Client creates the todo: `POST /api/todos/` with `image: object_url`.
5. Backend stores the S3 URL in the `Todo` model; no file passes through the server.

### 3.3 Database

- PostgreSQL stores todos (id, title, description, image URL, created_at).
- Backend connects using env vars: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`.
- Adminer (port 8080) connects to the same Postgres container for admin tasks.

---

## 4. Environment Variables

### 4.1 Backend (Django)

| Variable | Description | Example |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret | Strong random value in production |
| `DEBUG` | Debug mode | `False` on EC2 |
| `ALLOWED_HOSTS` | Comma-separated hosts | `your-domain.com,ec2-xx-xx.compute.amazonaws.com` |
| `POSTGRES_HOST` | DB host (Compose: `postgres`) | `postgres` |
| `POSTGRES_PORT` | DB port | `5432` |
| `POSTGRES_DB` | Database name | `app` |
| `POSTGRES_USER` | DB user | `app` |
| `POSTGRES_PASSWORD` | DB password | Strong password |
| `AWS_ACCESS_KEY_ID` | IAM key for S3 | From IAM user |
| `AWS_SECRET_ACCESS_KEY` | IAM secret | From IAM user |
| `AWS_STORAGE_BUCKET_NAME` | S3 bucket name | `my-todo-images` |
| `AWS_S3_REGION_NAME` | AWS region | `us-east-1` |
| `AWS_S3_CUSTOM_DOMAIN` | Optional (e.g. CloudFront) | `d123.cloudfront.net` |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins | `http://localhost:3000,https://your-domain.com` |

### 4.2 Frontend (build-time / runtime)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_IMAGE_BASE_URL` | Optional CDN/base for image URLs | `https://d123.cloudfront.net` |

### 4.3 Docker Compose

- Use a `.env` file in the project root; Compose substitutes `${VAR}` in `docker-compose.yml`.
- Do not commit `.env`; use `.env.example` as a template.

---

## 5. AWS EC2 Deployment

### 5.1 Prerequisites

- EC2 instance (e.g. Amazon Linux 2 or Ubuntu) with:
  - Docker and Docker Compose installed.
  - Security group allowing:
    - Inbound: 80 (HTTP), 3000 (app), 8080 (Adminer; optional), 22 (SSH).
- Domain (optional): Route 53 or other DNS pointing to the EC2 public IP.
- S3 bucket with CORS and bucket policy (or CloudFront) so the app can upload and read images.

### 5.2 Deployment Steps

1. **Launch EC2**  
   - Choose AMI, instance type, attach a key pair.  
   - Configure security group as above.

2. **Install Docker & Docker Compose** (if not using an image that has them):

   ```bash
   # Amazon Linux 2 example
   sudo yum update -y
   sudo yum install -y docker
   sudo systemctl start docker && sudo systemctl enable docker
   sudo usermod -aG docker ec2-user
   # Install Docker Compose v2 (or download compose binary)
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Clone the repo and set env**  
   - Copy `.env.example` to `.env` and fill in production values (see Section 4).

4. **Run the stack**  
   - From the project root (where `docker-compose.yml` is):

   ```bash
   docker compose up -d --build
   ```

5. **Run migrations** (first run only):

   ```bash
   docker compose exec backend python manage.py migrate
   ```

6. **Access**  
   - App (SPA + API): `http://<ec2-public-ip>:3000`  
   - API only (Nginx): `http://<ec2-public-ip>:80/api/`  
   - Adminer: `http://<ec2-public-ip>:8080` (restrict in production).

### 5.3 S3 Setup (summary)

- Create a bucket; enable CORS (e.g. allow `PUT`, `GET`, and your frontend origins).
- For public read of images: bucket policy allowing `s3:GetObject` for the relevant prefix, or use CloudFront in front of S3 and set `AWS_S3_CUSTOM_DOMAIN` / `VITE_IMAGE_BASE_URL`.
- IAM user used by the backend needs `s3:PutObject` (and optionally `s3:GetObject`) on that bucket; provide keys via `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

---

## 6. Optional: Single Entry Point on Port 80

To serve both the SPA and the API on port 80 from the main Nginx:

1. Build the frontend and copy the build output into a volume or into an image the main Nginx can serve.
2. Update the main **Nginx** config (e.g. `nginx/nginx.conf`) to:
   - Keep `location /api/` proxying to `http://backend:8000/`.
   - Add `location /` that serves the SPA root (e.g. `alias` or `root` to the built `index.html` and assets) with `try_files $uri $uri/ /index.html;`.
3. Optionally remove or keep the separate frontend container on 3000 (e.g. for dev or alternate access).

---

## 7. Security Considerations

- Set `DEBUG=False` and a strong `SECRET_KEY` in production.
- Restrict `ALLOWED_HOSTS` to your domain(s) and EC2 hostname.
- Use strong `POSTGRES_PASSWORD` and limit Adminer (e.g. firewall or remove in prod).
- Prefer HTTPS: put ALB or CloudFront in front and terminate TLS; redirect HTTP → HTTPS.
- Restrict security groups to minimal required ports; avoid exposing 5432 and 8000 to the internet.
- Store secrets in `.env` or a secrets manager; never commit them.

---

## 8. API Endpoints (Reference)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/todos/` | List todos |
| POST | `/api/todos/` | Create todo |
| GET | `/api/todos/<id>` | Get todo |
| PUT | `/api/todos/<id>` | Update todo |
| DELETE | `/api/todos/<id>` | Delete todo |
| POST | `/api/todos/upload-url` | Get S3 presigned upload URL (body: `filename`, `content_type`) |

---

## 9. Repository Layout (relevant to deployment)

```
.
├── docker-compose.yml      # Service definitions
├── nginx/
│   └── nginx.conf          # Main reverse proxy
├── backend/                # Django app
│   ├── Dockerfile
│   ├── config/             # Settings, URLs
│   └── todos/              # App + S3 presign
├── frontend/               # React app
│   ├── Dockerfile
│   ├── nginx.conf          # SPA + /api proxy
│   └── src/
└── docs/
    ├── ARCHITECTURE.md     # Diagrams
    └── TECHNICAL_DOCUMENTATION.md  # This file
```

---

## 10. Troubleshooting

- **CORS errors**  
  - From API: ensure `CORS_ALLOWED_ORIGINS` includes the origin the browser uses (e.g. `http://<ec2>:3000`).  
  - From S3: fix bucket CORS to allow the frontend origin and `PUT`/`GET` as needed.

- **Images not loading**  
  - Ensure S3 bucket (or CloudFront) allows public read for the stored URLs, or use `VITE_IMAGE_BASE_URL` to point to a CDN that has access.

- **502 Bad Gateway**  
  - Check that the backend container is running and that Nginx/Frontend can resolve `backend:8000` on the Compose network.

- **DB connection errors**  
  - Confirm `POSTGRES_*` env vars and that the backend container can reach the `postgres` service; run migrations if the DB is new.
