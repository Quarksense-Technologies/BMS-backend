#!/bin/bash
cd ~/apps/BMS-backend
git pull origin main
docker compose down
docker compose build
docker compose up -d
