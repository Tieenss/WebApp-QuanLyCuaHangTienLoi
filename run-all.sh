#!/bin/bash
echo "======================================"
echo "   Khoi dong Backend + Frontend"
echo "======================================"
echo

# Start backend
echo "Khoi dong Backend..."
cd backend && ./mvnw spring-boot:run &
BACKEND_PID=$!

sleep 10

# Start frontend
echo "Khoi dong Frontend..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend dang khoi dong o port 8080 (PID: $BACKEND_PID)"
echo "Frontend dang khoi dong o port 5173 (PID: $FRONTEND_PID)"
echo ""
echo "Dong cua so nay de dung, hoac Ctrl+C de stop"

# Wait for any process to exit
wait
