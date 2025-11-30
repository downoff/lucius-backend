#!/bin/bash
# Complete GitHub Deployment Script - Backend

echo "🚀 Deploying LuciusAI Backend to GitHub..."

# Navigate to backend directory
cd "c:/LuciusAI/lucius backend/lucius-backend-FINAL/lucius-backend-FINAL"

# Initialize git if needed
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit: LuciusAI Backend - Full automation system"
else
    echo "📦 Git repository exists, adding changes..."
    git add .
    git commit -m "Update: Added success metrics, compliance checker, ROI tracking"
fi

# Ask for remote URL if not set
if ! git remote | grep -q "origin"; then
    echo "Please enter your GitHub repository URL for backend:"
    echo "Example: https://github.com/yourusername/lucius-backend.git"
    read REPO_URL
    git remote add origin "$REPO_URL"
fi

# Push to GitHub
echo "⬆️  Pushing to GitHub..."
git branch -M main
git push -u origin main --force

echo "✅ Backend deployed to GitHub!"
echo "Next: Deploy frontend with deploy-frontend.sh"
