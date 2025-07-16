# 🚀 Deployment Guide - Render.com

## Quick Deploy to Render

### 1. Push Code to GitHub
```bash
# Make sure all changes are committed and pushed
git add .
git commit -m "prepare: backend for Render deployment"
git push origin main
```

### 2. Deploy on Render

1. **Visit**: https://render.com
2. **Sign in** with your GitHub account
3. **Click "New +"** → **Web Service**
4. **Connect your repository**: `tournoishaq/adp-backend`
5. **Configure the service**:

#### Basic Settings
- **Name**: `adp-backend` (or your preferred name)
- **Region**: `Oregon (US West)` (closest to you)
- **Branch**: `main` (or your deployment branch)
- **Root Directory**: Leave empty (uses root)
- **Runtime**: `Node`

#### Build & Deploy Settings
- **Build Command**: `npm run render:build`
- **Start Command**: `npm run render:start`

#### Environment Variables
Set these in the Render dashboard:

```
NODE_ENV=production
LOBBY_TIME=10
START_TIME=30
PORT=4000
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### 3. Configure Supabase for Production

If using a hosted Supabase instance:
1. Go to your Supabase project dashboard
2. **Settings** → **API**
3. Copy the **Project URL** and **anon/public key**
4. Add these to Render environment variables

### 4. Update Frontend

Update your frontend `.env.local`:
```
NEXT_PUBLIC_SOCKET_SERVER_URL=https://your-render-app.onrender.com
```

## Free Tier Limitations

**Render Free Tier**:
- ✅ 750 hours/month (enough for testing)
- ✅ Automatic SSL
- ✅ Custom domains
- ❌ Spins down after 15 minutes of inactivity
- ❌ Cold start delay (~30 seconds)

**For Production Use**: Consider upgrading to a paid plan for:
- No spin-down
- Faster startup
- More resources

## Endpoints

Once deployed, your backend will be available at:
- **Health Check**: `https://your-app.onrender.com/health`
- **Version Info**: `https://your-app.onrender.com/`
- **Timer Inspector**: `https://your-app.onrender.com/inspector`
- **Socket.IO**: `wss://your-app.onrender.com/socket.io/`

## Environment Variables Explained

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port (set by Render) | `4000` |
| `LOBBY_TIME` | Lobby timer duration (seconds) | `10` |
| `START_TIME` | Turn timer duration (seconds) | `30` |
| `SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase public API key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `FRONTEND_URL` | Frontend domain for CORS | `https://app.vercel.app` |

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify TypeScript compiles locally: `npm run compile`
- Check build logs in Render dashboard

### Service Won't Start
- Check start command: `npm run render:start`
- Verify environment variables are set
- Check application logs in Render dashboard

### Socket Connection Issues
- Ensure `FRONTEND_URL` is set correctly
- Check CORS configuration
- Verify WebSocket support is enabled

### Database Connection Issues
- Confirm Supabase environment variables
- Check Supabase project is running
- Verify API keys are correct

## Monitoring

**Render Dashboard**:
- View deployment logs
- Monitor resource usage
- Check service health

**Health Endpoints**:
- `GET /health` - Service health check
- `GET /` - Version and status info
- `GET /inspector` - Timer states (admin)

## Rolling Back

If deployment fails:
1. Go to Render dashboard
2. **Deploys** tab
3. **Rollback** to previous version
4. Fix issues and redeploy

## Scaling

**Free Tier**: 1 instance
**Paid Plans**: Multiple instances, load balancing, auto-scaling

For high traffic, consider:
- Upgrading to paid plan
- Using Redis for session storage
- Implementing connection pooling