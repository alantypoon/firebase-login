#!/bin/bash
# services/stop.sh

stop_process() {
    local process="$1"
    if [ -z "$process" ]; then return 1; fi
    PIDS=$(ps aux | grep "$process" | grep -v grep | awk '{print $2}')
    if [ -n "$PIDS" ]; then
        echo "Stopping $process (PIDs: $PIDS)..."
        for PID in $PIDS; do sudo kill -TERM $PID 2>/dev/null || true; done
        sleep 2
        for PID in $PIDS; do
            if ps -p $PID > /dev/null 2>&1; then
                echo "Force killing $PID..."
                sudo kill -KILL $PID 2>/dev/null || true
            fi
        done
    else
        echo "No $process found."
    fi
}

stop_port() {
    local port="$1"
    if [ -z "$port" ]; then return 1; fi
    PIDS=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$PIDS" ]; then
        echo "Stopping port $port (PIDs: $PIDS)..."
        sudo kill -TERM $PIDS 2>/dev/null || true
        sleep 2
        sudo kill -KILL $PIDS 2>/dev/null || true
    fi
}

echo "Stopping existing services..."
# Stop systemd services if they exist
sudo systemctl stop firebase-backend 2>/dev/null || true
sudo systemctl stop firebase-frontend 2>/dev/null || true

# Manual cleanup
stop_process "node server.js"
stop_process "vite"
stop_port 6000
stop_port 6001
stop_port 5173

echo "Cleanup complete."