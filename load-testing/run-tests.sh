#!/bin/bash

# Load testing execution script for Event Booking System

echo "==========================================="
echo "Event Booking System - Load Testing Suite"
echo "==========================================="

# Check if docker is running
if ! docker ps >/dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "Error: k6 is not installed. Please install k6 before running this script."
    echo "Installation instructions are in load-testing/README.md"
    exit 1
fi

echo "Starting load testing process..."

# Start the application stack in the background
echo "Starting application stack..."
docker-compose -f ../infrastructure/docker-compose.dev.yml up --build -d

echo "Waiting for services to start (30 seconds)..."
sleep 30

# Check if services are running
echo "Checking if services are running..."
if docker-compose -f ../infrastructure/docker-compose.dev.yml ps | grep -q "Up"; then
    echo "Services are running. Proceeding with load test..."
else
    echo "Warning: Some services may not be running properly."
    docker-compose -f ../infrastructure/docker-compose.dev.yml ps
fi

# Run the load test
echo "Running booking system load test..."
echo "==========================================="
k6 run booking-test.js

# Capture the exit code
exit_code=$?

echo "==========================================="
echo "Load test completed with exit code: $exit_code"

# Optional: Bring down the application stack
echo "Shutting down application stack..."
docker-compose -f ../infrastructure/docker-compose.dev.yml down

echo "Load testing process completed."
exit $exit_code