# Deploying CrimeOS on Render

This guide provides step-by-step instructions for deploying the CrimeOS application (Frontend, Backend, and Database) on [Render](https://render.com).

Render allows us to easily deploy the separate services defined in our `docker-compose.prod.yml` as independent components:
1. **Managed PostgreSQL** (Replaces the `db` container)
2. **Backend Web Service** (Using the backend Dockerfile)
3. **Frontend Web Service** (Using the frontend Dockerfile)

---

## 1. Create a Managed PostgreSQL Database

Instead of running PostgreSQL in a container, it is highly recommended to use Render's managed database service for production.

1. Log in to your Render Dashboard.
2. Click **New** -> **PostgreSQL**.
3. Fill in the details:
   - **Name**: `crimeos-db` (or similar)
   - **Database**: `crime_os`
   - **User**: `crime_os_user`
   - Choose your preferred region and instance type (Free tier is available).
4. Click **Create Database**.
5. Once created, copy the **Internal Database URL** (e.g., `postgres://crime_os_user:password@hostname/crime_os`). You will need this for the backend service.

---

## 2. Deploy the Backend Web Service

1. Go to your Render Dashboard and click **New** -> **Web Service**.
2. Connect your GitHub/GitLab repository containing the CrimeOS code.
3. In the setup page, configure the following:
   - **Name**: `crimeos-backend`
   - **Language / Environment**: `Docker`
   - **Dockerfile Path**: `docker/Dockerfile.backend`
   - **Context Directory**: `.` (the repository root)
4. Set the **Start Command** to run migrations, seed data, and start the app (this mimics the docker-compose command):
   ```bash
   sh -c "alembic upgrade head && python -m app.seeds.run && uvicorn app.main:app --host 0.0.0.0 --port 10000"
   ```
   *(Render dynamically assigns a `PORT` environment variable, usually 10000, so binding to that or `$PORT` is good practice.)*
5. Add the following **Environment Variables**:
   - `DATABASE_URL`: Paste the **Internal Database URL** you copied from step 1.
   - Any other variables present in your `.env` file (e.g., JWT secrets, API keys).
6. Click **Create Web Service**.
7. Wait for the build and deployment to finish. Once done, copy the public URL (e.g., `https://crimeos-backend.onrender.com`).

---

## 3. Deploy the Frontend Web Service

1. Go to your Render Dashboard and click **New** -> **Web Service**.
2. Connect the same GitHub/GitLab repository.
3. In the setup page, configure the following:
   - **Name**: `crimeos-frontend`
   - **Language / Environment**: `Docker`
   - **Dockerfile Path**: `docker/Dockerfile.frontend`
   - **Context Directory**: `.` (the repository root)
4. Add the following **Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: Paste the public URL of your backend service (e.g., `https://crimeos-backend.onrender.com`).
5. Click **Create Web Service**.
6. Wait for the build to complete. Your frontend will now be accessible at the provided Render URL!

---

## Summary of Environment Variables

### Backend
- `DATABASE_URL` (Required: Internal DB URL from Render PostgreSQL)
- *(Optional)* Add any specific tokens, JWT keys, or model configurations needed by your backend.

### Frontend
- `NEXT_PUBLIC_API_URL` (Required: Public URL of the backend web service)

## Notes
- **Uploads/Volumes**: Render web services have ephemeral filesystems unless you attach a persistent disk. If your backend saves files (e.g., `uploads_data` volume in docker-compose), you will need to add a **Disk** to the backend service mapped to `/app/uploads` via the Render dashboard, or switch to object storage (like AWS S3).
- **Cold Starts**: On Render's free tier, web services will spin down after inactivity, causing a delay (cold start) on the next request. Upgrade to a paid plan if you require constant uptime.
