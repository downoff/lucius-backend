#!/bin/bash
# Backend Deployment Script for LuciusAI

echo "🚀 Deploying LuciusAI Backend..."

# 1. Add all changes
git add .

# 2. Commit with timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
git commit -m "Backend update: $TIMESTAMP - Full automation system deployed"

# 3. Push to main branch
git push origin main

echo "✅ Backend deployed to GitHub!"
echo "Next: Set up Render.com deployment"
echo "1. Connect this repo to Render"
echo "2. Set Build Command: npm install"
echo "3. Set Start Command: node server.js"
echo "4. Add environment variables from .env"
