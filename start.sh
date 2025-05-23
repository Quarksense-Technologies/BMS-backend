#!/bin/bash

cd ~/apps/BMS-backend

echo "Pulling latest changes..."
git pull origin main

echo "Shutting down existing containers..."
docker compose down

echo "Rebuilding containers..."
docker compose build --no-cache

echo "Starting containers..."
docker compose up -d
