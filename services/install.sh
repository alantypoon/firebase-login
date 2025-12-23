#!/bin/bash
# services/install.sh

# Get absolute path to project root (parent of services dir)
PROJECT_ROOT=$(dirname $(dirname $(realpath $0)))
SERVICE_DIR="$PROJECT_ROOT/services"

echo "Project Root: $PROJECT_ROOT"
echo "Service Dir: $SERVICE_DIR"

# 1. Stop existing
echo "Stopping existing processes..."
bash "$SERVICE_DIR/stop.sh"

# 2. Install Services
echo "Installing Systemd Services..."

# Copy service files
sudo cp "$SERVICE_DIR/firebase-backend.service" /etc/systemd/system/
sudo cp "$SERVICE_DIR/firebase-frontend.service" /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable and Start
echo "Starting Backend..."
sudo systemctl enable firebase-backend
sudo systemctl start firebase-backend

echo "Starting Frontend..."
sudo systemctl enable firebase-frontend
sudo systemctl start firebase-frontend

echo "✅ Installation Complete."
echo "Running check.sh to verify status..."
bash "$SERVICE_DIR/check.sh"
