#!/bin/bash
clear

# services/check.sh

echo "=== Systemd Service Status ==="
echo "Backend:"
systemctl status firebase-backend --no-pager | head -n 10
echo ""
echo "Frontend:"
systemctl status firebase-frontend --no-pager | head -n 10

echo ""
echo "=== Recent Logs ==="
echo "Backend Logs (last 10 lines):"
journalctl -u firebase-backend -n 10 --no-pager
echo ""
echo "Frontend Logs (last 10 lines):"
journalctl -u firebase-frontend -n 10 --no-pager

echo ""
echo "=== Port Status ==="
echo "Port 6001 (Backend):"
lsof -i :6001
echo "Port 6000 (Frontend):"
lsof -i :6000