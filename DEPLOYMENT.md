# Deploying GrammaCare AI on AWS

This guide covers deploying the **Django backend** and **Next.js frontend** on AWS using **EC2** (recommended for this stack).

---

## Prerequisites

- AWS account
- Domain (optional; you can use the EC2 public IP or an Elastic IP)
- **GEMINI_API_KEY** from [Google AI Studio](https://aistudio.google.com/apikey)

---

## 1. Prepare the codebase

### Backend (Django)

- Ensure `backend/requirements.txt` includes `gunicorn`.
- Production settings are driven by environment variables (see below).

### Frontend (Next.js)

- Build the app with the **production API URL** so the browser calls your deployed Django API:

  ```bash
  cd /path/to/V219
  NEXT_PUBLIC_API_URL=https://api.yourdomain.com npm run build
  ```

  Replace `https://api.yourdomain.com` with your actual Django API base URL (e.g. `http://<EC2-public-IP>:8000` for testing, or your domain with HTTPS later).

---

## 2. Launch an EC2 instance

1. In **AWS Console** → **EC2** → **Launch instance**.
2. **AMI:** Ubuntu 22.04 LTS.
3. **Instance type:** e.g. `t3.micro` or `t3.small`.
4. **Key pair:** Create or select one; you need the `.pem` file to SSH.
5. **Security group:** Allow:
   - **22** (SSH) from your IP
   - **80** (HTTP) from 0.0.0.0/0
   - **443** (HTTPS) from 0.0.0.0/0
   - **8000** (optional; only if you want to hit Django on 8000 before putting Nginx in front)
6. Launch and note the **public IP** (or attach an **Elastic IP** for a fixed address).

---

## 3. Connect and install dependencies

```bash
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

Then on the EC2 instance:

```bash
sudo apt update
sudo apt install -y python3-pip python3-venv nginx nodejs npm
```

(Use Node 18+ if your Next.js requires it; consider `nvm` or NodeSource.)

---

## 4. Deploy the Django backend

1. Copy your project onto the server (from your machine, e.g. with `scp`, or clone from Git):

   ```bash
   scp -i your-key.pem -r /path/to/V219/backend ubuntu@<EC2-IP>:~/app/backend
   ```

2. On the server:

   ```bash
   cd ~/app/backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. Set environment variables (production):

   ```bash
   export DEBUG=False
   export DJANGO_SECRET_KEY="your-long-random-secret-key"
   export GEMINI_API_KEY="your-gemini-api-key"
   export ALLOWED_HOSTS="api.yourdomain.com,yourdomain.com,<EC2-PUBLIC-IP>"
   export CORS_ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
   export CSRF_TRUSTED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
   ```

   For testing with IP only, use `http://<EC2-IP>` in CORS and CSRF origins.

4. Run migrations and start Gunicorn:

   ```bash
   python manage.py migrate
   gunicorn --bind 0.0.0.0:8000 backend.wsgi:application
   ```

   To run in the background (e.g. with `nohup` or a process manager like **systemd**):

   ```bash
   nohup gunicorn --bind 0.0.0.0:8000 --workers 2 backend.wsgi:application &
   ```

   Or create a systemd unit for Gunicorn so it restarts on reboot.

---

## 5. Serve the Next.js frontend

**Option A – Run Next.js on the same EC2 (simplest)**

1. Copy the full project (or at least the Next.js app and its build):

   ```bash
   scp -i your-key.pem -r /path/to/V219 ubuntu@<EC2-IP>:~/app/
   ```

2. On the server, build and run (after setting `NEXT_PUBLIC_API_URL` for production):

   ```bash
   cd ~/app
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com npm run build
   npm run start
   ```

   Run with PM2 or systemd so it stays up. Then put **Nginx** in front to proxy:
   - `https://yourdomain.com` → Next.js (e.g. port 3000)
   - `https://api.yourdomain.com` or `https://yourdomain.com/api/` → Gunicorn (port 8000)

**Option B – Static export + S3 + CloudFront**

- If you switch the Next.js app to a static export (`output: 'export'` and no server-only features), build locally with `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`, then upload the `out/` folder to an S3 bucket and serve it via CloudFront. The frontend will call your Django API URL directly.

---

## 6. Nginx (reverse proxy and HTTPS)

Example Nginx config (adjust domain and paths):

```nginx
# /etc/nginx/sites-available/grammacare
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;  # Next.js
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;   # Django (trailing slash so /api/chat -> backend /api/chat/)
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Cookie $http_cookie;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/grammacare /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

For **HTTPS**, use **Let’s Encrypt** (e.g. `certbot`) or **AWS Certificate Manager (ACM)** with a load balancer.

---

## 7. Environment variables summary

| Variable | Where | Example |
|----------|--------|---------|
| `DEBUG` | Backend (EC2) | `False` |
| `DJANGO_SECRET_KEY` | Backend | Long random string |
| `GEMINI_API_KEY` | Backend | From Google AI Studio |
| `ALLOWED_HOSTS` | Backend | `api.yourdomain.com,yourdomain.com` |
| `CORS_ALLOWED_ORIGINS` | Backend | `https://yourdomain.com` |
| `CSRF_TRUSTED_ORIGINS` | Backend | `https://yourdomain.com` |
| `NEXT_PUBLIC_API_URL` | Frontend (build time) | Leave **empty** if Nginx proxies `/api/` to Django (same-origin). Use `https://api.yourdomain.com` only if the API is on a different subdomain. |

---

## 8. Optional: database and scaling

- **SQLite** (default) is fine for low traffic; ensure the DB file path on EC2 is persistent and backed up.
- For production at scale, switch Django to **PostgreSQL** or **MySQL** (e.g. **Amazon RDS**) and set `DATABASES` in `backend/settings.py` from environment variables.
- Use **Elastic IP** so the server’s public IP doesn’t change after restarts.
- Consider **Elastic Beanstalk** (Python platform) or **ECS** if you prefer managed deployments instead of raw EC2.

---

## Quick test after deployment

1. Open `https://yourdomain.com` (or `http://<EC2-IP>:3000` if no Nginx yet).
2. Log in with a dummy user (e.g. `demo@grammacare.com` / `demo123`).
3. Start a chat; responses should come from Django (Gemini). Check EC2 logs if something fails.

If you want, the next step can be a minimal **systemd** unit file for Gunicorn and a sample **PM2** or **systemd** config for Next.js so both services start on boot.
