# BombSquad Client Deployment Guide

## Deploy to Render.com (Free Plan)

### Prerequisites
- GitHub account
- Render.com account (free)
- Your BombSquad server already deployed

### Step-by-Step Instructions

#### 1. Push to GitHub
```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Commit files
git commit -m "Initial BombSquad client deployment"

# Add remote repository (replace with your GitHub repo)
git remote add origin https://github.com/yourusername/bombsquad-client.git

# Push to GitHub
git push -u origin main
```

#### 2. Configure Server URL
Before deploying, update the server URL in:
- `networkManager.js` line 10: Change `https://your-bombsquad-server.onrender.com` to your actual server URL
- `lobby.html` line 182: Update the default server URL

#### 3. Deploy on Render.com

1. **Go to Render.com Dashboard**
   - Visit [render.com](https://render.com)
   - Sign in with GitHub

2. **Choose Deployment Method**

   **Option A: Static Site (Recommended)**
   - Click "New" → "Static Site"
   - Connect your GitHub repository
   - Configure:
     ```
     Name: bombsquad-client
     Build Command: (leave empty)
     Publish Directory: . 
     Plan: Free
     ```

   **Option B: Web Service (Alternative)**
   - Click "New" → "Web Service"  
   - Connect your GitHub repository
   - Configure:
     ```
     Name: bombsquad-client
     Environment: Node
     Build Command: npm install
     Start Command: npm start
     Plan: Free
     ```

4. **Environment Variables** (if needed)
   - No environment variables required for client

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (usually 2-3 minutes)

#### 4. Update CORS on Server
Make sure your BombSquad server allows connections from your client URL:

```javascript
// In your server.js, update CORS settings:
const io = socketIo(server, {
    cors: {
        origin: [
            "http://localhost:3000",
            "https://your-client-app.onrender.com" // Add your client URL
        ],
        methods: ["GET", "POST"]
    }
});
```

### Your Deployed URLs
- **Client**: `https://your-client-app.onrender.com`
- **Server**: `https://your-bombsquad-server.onrender.com`

### Testing
1. Visit your client URL
2. Enter your name
3. Server URL should auto-populate
4. Create or join a room
5. Play with friends!

### Troubleshooting
- **Connection Issues**: Check server URL in browser console
- **CORS Errors**: Update server CORS settings
- **Build Failures**: Check package.json and dependencies
- **Free Plan Limits**: Render free plan has 750 hours/month limit

### Free Plan Notes
- Apps sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- 750 hours/month total usage limit
- No custom domains on free plan