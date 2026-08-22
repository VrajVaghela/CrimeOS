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
4. **Start Command**: 
   - **Leave BLANK / Default**: The `Dockerfile.backend` already defines the complete startup command (`alembic upgrade head && python -m app.seeds.run && uvicorn ...`). Leaving this field empty in Render ensures Docker's `CMD` runs natively without shell parsing issues.
   - *If overriding in Render UI, do **NOT** wrap the command in quotes `"..."`. Use raw command:*
     ```bash
     alembic upgrade head && python -m app.seeds.run && uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
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

## Troubleshooting

### 1. `sh: python -m app.seeds.run: not found` (Exit Status 127)
**Root Cause**: This occurs when surrounding double quotes (e.g. `"python -m app.seeds.run"`) are pasted into Render's **Start Command** field in the dashboard, or when `sh -c "..."` is passed improperly. The container shell interprets the whole string `"python -m app.seeds.run"` as a single executable filename instead of a command with arguments.
**Fix**: 
- In Render Dashboard -> Service Settings -> **Start Command**:
  - **Option A (Recommended for Docker)**: Clear the Start Command input box completely (leave it empty). Render will use the default `CMD` from `docker/Dockerfile.backend`.
  - **Option B (Manual Override)**: Remove all quotes and set the command to:
    ```bash
    alembic upgrade head && python -m app.seeds.run && uvicorn app.main:app --host 0.0.0.0 --port $PORT
    ```

### 2. Local PowerShell: `uvicorn : The term 'uvicorn' is not recognized`
**Root Cause**: Powershell cannot locate `uvicorn` because the Python virtual environment (`.venv`) is not activated, or `uvicorn` was installed into a specific virtual environment.
**Fix**:
From `backend/` directory in PowerShell:
```powershell
# Activate virtual environment
..\.venv\Scripts\activate
# Or run via python module
python -m uvicorn app.main:app --reload
```

