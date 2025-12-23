# Firebase Login

This project consists of a React frontend (Vite) and a Node.js/Express backend (API). It uses MongoDB for data storage and performs email verification via SMTP or Firebase.

## Prerequisites

- Node.js (v18+ recommended)
- MongoDB Server
- Firebase Project (for Auth)
- SMTP Credential (for email sending)
- `service-account.json` (Firebase Admin SDK Key) for Password Reset functionality

## Environment Variables

Create a `.env` file in the root directory. See `.env.example` (if available) or use the following template:

```ini
# Frontend Port (Vite)
VITE_PORT=6000
# Backend Port (Express)
LISTEN_PORT=6001

# Email Service: 'FIREBASE' or 'SMTP'
VITE_EMAIL_SERVICE=SMTP
EMAIL_SERVICE=SMTP

# Website URL (for email links)
WEBSITE_URL=https://dev.mysuperta.com

# MongoDB
MONGODB_URI=mongodb://root:password@127.0.0.1:2700/firebase?authSource=admin
MONGODB_DB=firebase

# SMTP Configuration (if using SMTP)
SMTP_EMAIL=donotreply.dev@mysuperta.com
SMTP_USERNAME=donotreply.dev@mysuperta.com
SMTP_PASSWORD="your#password"
SMTP_OUTGOING_SERVER=web1012.dataplugs.com
SMTP_OUTGOING_PORT=465
```

## Development

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start Backend**:
    ```bash
    # Runs node server.js on port 6001
    sh start-backend.sh
    # OR
    node server.js
    ```

3.  **Start Frontend**:
    ```bash
    # Runs vite dev server on port 6000
    sh start-frontend.sh
    # OR
    npm run dev
    ```

4.  **Access**:
    Open `http://localhost:6000` (or configured URL).

## UAT / Production Reference

### Building Frontend

To create a production-ready build of the React application:

```bash
npm run build
```

This will generate a `dist/` folder containing static assets (HTML, CSS, JS).

### Serving Frontend

Serve the `dist/` directory using a web server like Nginx, Apache, or a Node static server (e.g., `serve`).

**Example using `serve`:**
```bash
npm install -g serve
serve -s dist -l 6000
```

**Nginx Configuration Example (Snippet):**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html/firebase-login/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Running Backend

The backend should run continuously. Use the provided Systemd services or a process manager like PM2.

```bash
# Using PM2
pm2 start server.js --name "firebase-backend"
```

## Systemd Services (Automatic Startup)

Scripts are provided in `services/` to install and manage the application as systemd services.

1.  **Install Services**:
    ```bash
    bash services/install.sh
    ```
    This script will:
    - Stop existing processes.
    - Install `firebase-backend.service` and `firebase-frontend.service`.
    - Enable and start them.

2.  **Check Status**:
    ```bash
    bash services/check.sh
    ```

3.  **Stop Services**:
    ```bash
    bash services/stop.sh
    ```

## Notes

- **API Proxy**: In development, Vite proxies `/api` requests to the backend (`localhost:6001`). In production, ensure your Nginx/Web Server proxies `/api` requests to the backend similarly.
