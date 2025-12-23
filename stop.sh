# clear

###

stop_process() {
    local process="$1"
    
    if [ -z "$process" ]; then
        echo "Error: No process name provided to stop_process function"
        return 1
    fi
    
    echo "Stopping $process..."

    # Find all process IDs matching the pattern
    PIDS=$(ps aux | grep "$process" | grep -v grep | awk '{print $2}')

    # Check if PIDs were found
    if [ -n "$PIDS" ]; then
        echo "Found process(es) with PID(s): $PIDS"
        
        # First, try graceful shutdown for all PIDs
        for PID in $PIDS; do
            sudo kill -TERM $PID 2>/dev/null || true
        done
        sleep 2
        
        # Check if any processes are still running and force kill them
        for PID in $PIDS; do
            if ps -p $PID > /dev/null 2>&1; then
                echo "Process $PID still running, forcing shutdown..."
                sudo kill -KILL $PID 2>/dev/null || true
            fi
        done
        
        echo "Process(es) $process have been stopped."
        return 0
    else
        echo "No process $process found."
        return 1
    fi
}

# Function to kill processes using a specific port
stop_port() {
    local port="$1"
    
    if [ -z "$port" ]; then
        echo "Error: No port number provided to stop_port function"
        return 1
    fi
    
    echo "Stopping processes using port $port..."
    
    # Find PIDs using the port
    PIDS=$(lsof -ti:$port 2>/dev/null)
    
    if [ -n "$PIDS" ]; then
        echo "Found process(es) using port $port with PID(s): $PIDS"
        
        # Try graceful shutdown first
        for PID in $PIDS; do
            kill -TERM $PID 2>/dev/null || true
        done
        sleep 2
        
        # Force kill if still running
        REMAINING=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$REMAINING" ]; then
            echo "Some processes still running on port $port, forcing shutdown..."
            for PID in $REMAINING; do
                kill -KILL $PID 2>/dev/null || true
            done
        fi
        
        echo "All processes using port $port have been stopped."
        return 0
    else
        echo "No processes found using port $port."
        return 1
    fi
}

###

# Stop processes by name
# stop_process 'next dev'
# stop_process 'next-server'
# stop_process 'npm run dev'
# stop_process 'npm start'

# Also stop any process using port 6000
# stop_port 6000
# stop_port 6001

echo ""
echo "✅ All processes stopped successfully!"

