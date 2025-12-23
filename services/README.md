# Systemd Services Management

This directory contains scripts to install and manage the application as systemd services on Linux.

## Files

- **`install.sh`**: The main setup script. It stops any running instances, copies the service files to `/etc/systemd/system/`, enables them, and starts the services.
- **`stop.sh`**: Stops the systemd services (`firebase-backend`, `firebase-frontend`) and also forces kills any processes found running on ports 6000, 6001, or 5173 to ensure a clean slate.
- **`check.sh`**: Displays the status and recent logs for both services.
- **`firebase-backend.service`**: Systemd unit file for the Node.js backend using `start-backend.sh`.
- **`firebase-frontend.service`**: Systemd unit file for the frontend (Vite) using `start-frontend.sh`.

## Usage

### 1. Install Services
Run this to set up the services for the first time or to apply updates to the service files.

```bash
bash install.sh
```

### 2. Check Status
Run this to see if services are running and view standard output logs.

```bash
bash check.sh
```

### 3. Stop Services
Run this to stop the services and kill related ports.

```bash
bash stop.sh
```

## Service Details

**Backend Service**
- User: `alan`
- Working Directory: `/var/www/html/firebase-login`
- Helper Script: `start-backend.sh`

**Frontend Service**
- User: `alan`
- Working Directory: `/var/www/html/firebase-login`
- Helper Script: `start-frontend.sh`
