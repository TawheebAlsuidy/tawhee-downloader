# Deploying to Render.com (Free)

This project requires a server with Python, FFmpeg, and Node.js. The easiest free way to host this is using **Render.com** with Docker.

## Prerequisite
1. Push your code to a GitHub repository.

## Step 1: Create Web Service on Render
1. Go to [Render.com](https://render.com/) and sign up/login.
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.

## Step 2: Configuration
Render should automatically detect the `Dockerfile`.
- **Name**: `tawheeb-downloader` (or anything)
- **Runtime**: **Docker** (Important!)
- **Region**: Frankfurt (or closest to you)
- **Branch**: `main`
- **Instance Type**: **Free**

## Step 3: Deploy
1. Click **Create Web Service**.
2. Render will build the Docker container. This might take 3-5 minutes because it installs FFmpeg and Python.
3. Once valid, your app will be live at `https://your-app-name.onrender.com`.

## Important Notes for Free Tier
- **Spin Down**: On the free tier, the server will "sleep" after 15 minutes of inactivity. The first request after sleep might take 30-50 seconds to load.
- **Disk Space**: The disk is ephemeral. Downloaded files are deleted when the server restarts (which is good for privacy/cleanup).
