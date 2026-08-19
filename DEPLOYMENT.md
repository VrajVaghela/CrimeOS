# Production Deployment Guide (Crime OS AI)

This guide provides comprehensive instructions for deploying the Crime OS AI application in a production-ready containerized environment using Docker and Docker Compose. 

The deployment uses `docker-compose.prod.yml` which handles the orchestration of the PostgreSQL (pgvector) database, FastAPI backend, and Next.js frontend.

---

## 🏗️ Architecture Overview

The production deployment consists of three primary services:
1. **`db` (crimeos_db):** A PostgreSQL database container extended with `pgvector` for vector embeddings. Data is persisted via the `pgdata` volume.
2. **`backend` (crimeos_backend):** The FastAPI application running on Uvicorn. This container automatically handles database migrations (`alembic upgrade head`) and seeding (`app.seeds.run`) on startup. It is connected to a persistent `uploads_data` volume for file storage.
3. **`frontend` (crimeos_frontend):** The Next.js frontend application served on port 3000. It relies on the backend service for API requests.

---

## 📋 Prerequisites

Ensure the deployment server has the following installed:
* [Docker Engine](https://docs.docker.com/engine/install/) (v24.0 or newer recommended)
* [Docker Compose](https://docs.docker.com/compose/install/) (v2.0 or newer)
* Git (to clone the repository)

---

## ⚙️ Environment Setup

1. **Navigate to the project root directory:**
   ```bash
   cd v1/CrimeOS
   ```

2. **Create the Environment Configuration:**
   Copy the example environment file to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Configure Environment Variables:**
   Edit the `.env` file and set the required variables:
   ```env
   # Database Configuration (ensure secure passwords for production)
   POSTGRES_USER=crime_os_user
   POSTGRES_PASSWORD=your_secure_password
   POSTGRES_DB=crime_os

   # API URL for Frontend
   NEXT_PUBLIC_API_URL=http://your_domain_or_ip:8000

   # External Integrations
   GEMINI_API_KEY=your_google_gemini_api_key
   
   # SMTP for LERS (Legal Requests) dispatch
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your_email@gmail.com
   SMTP_PASSWORD=your_app_specific_password
   ```

---

## 🚀 Deployment Instructions

### 1. Build and Start the Stack

Run the following command to build the Docker images and start the services in detached mode:

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 2. Verify Deployment Status

Check the status of the containers to ensure they are healthy:

```bash
docker-compose -f docker-compose.prod.yml ps
```

You should see `crimeos_db`, `crimeos_backend`, and `crimeos_frontend` in a healthy/running state. 
*Note: The frontend will wait for the backend to be healthy, and the backend will wait for the database.*

---

## 🌐 Accessing the Application

Once the deployment is up and running, access the application via your server's IP or domain:

* **Frontend Application:** `http://<server-ip>:3000`
* **Backend API & Swagger Docs:** `http://<server-ip>:8000/docs`

---

## 🛠️ Management & Troubleshooting

### Viewing Logs
To view logs for all services:
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

To view logs for a specific service (e.g., backend):
```bash
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Migrations and Seeding
Database migrations and initial data seeding are executed automatically when the `backend` container starts.
If you need to manually re-run seeding:
```bash
docker exec -it crimeos_backend python -m app.seeds.run
```

### Restarting the Services
To apply changes to `.env` or restart the platform:
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Stopping the Stack
To shut down the platform without losing data (volumes are retained):
```bash
docker-compose -f docker-compose.prod.yml down
```

To shut down and wipe all data (removes volumes):
```bash
docker-compose -f docker-compose.prod.yml down -v
```

---

## 🔒 Security Recommendations

1. **Reverse Proxy:** It is strongly recommended to deploy a reverse proxy (like Nginx or Traefik) in front of the application to handle SSL/TLS termination and secure access to the frontend and backend.
2. **Firewall:** Ensure that only necessary ports (e.g., 80, 443) are exposed publicly. Do not expose the database port (5432) to the public internet.
3. **Secrets Management:** Use secure vaults or Docker Secrets for managing sensitive keys (like `GEMINI_API_KEY` and `SMTP_PASSWORD`) in highly sensitive environments.
