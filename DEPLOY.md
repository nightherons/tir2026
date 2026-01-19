# Deployment Guide - Texas Independence Relay 2026

## Architecture
- **Frontend**: Vercel (free) - https://thenightherons.run
- **Backend**: Railway (free tier) - API + WebSocket server
- **Database**: SQLite (persisted on Railway volume)

---

## Step 1: Create a GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (e.g., `tir2026`)
3. Push your code:
   ```bash
   cd C:\Users\ryan\OneDrive\Documents\TIR2026
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/tir2026.git
   git push -u origin main
   ```

---

## Step 2: Deploy Backend to Railway

1. Go to https://railway.app and sign in with GitHub

2. Click **"New Project"** → **"Deploy from GitHub repo"**

3. Select your `tir2026` repository

4. Railway will detect multiple services. Configure for the **server** folder:
   - Click on the service → Settings → **Root Directory**: `server`

5. Add **Environment Variables** (Settings → Variables):
   ```
   DATABASE_URL=file:./data/tir2026.db
   JWT_SECRET=<generate-a-random-32-char-string>
   FRONTEND_URL=https://thenightherons.run
   NODE_ENV=production
   PORT=3001
   ```

   Generate a JWT secret:
   ```bash
   openssl rand -base64 32
   ```
   Or use: https://generate-secret.vercel.app/32

6. Add a **Volume** for database persistence:
   - Settings → Volumes → Add Volume
   - Mount path: `/app/data`

7. **Deploy** - Railway will automatically:
   - Install dependencies
   - Run `npm run build`
   - Run `prisma migrate deploy`
   - Start the server

8. Get your **Railway URL**:
   - Settings → Networking → Generate Domain
   - Example: `tir2026-production.up.railway.app`

---

## Step 3: Deploy Frontend to Vercel

1. Go to https://vercel.com and sign in with GitHub

2. Click **"Add New Project"** → Import your `tir2026` repo

3. Configure the project:
   - **Root Directory**: `client`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. Add **Environment Variables**:
   ```
   VITE_API_URL=https://YOUR-RAILWAY-URL.up.railway.app/api
   VITE_SOCKET_URL=https://YOUR-RAILWAY-URL.up.railway.app
   ```

5. Click **Deploy**

6. **Add Custom Domain**:
   - Settings → Domains → Add `thenightherons.run`
   - Update your domain DNS:
     - Add CNAME record: `@` → `cname.vercel-dns.com`
     - Or A record: `@` → `76.76.21.21`

---

## Step 4: Initialize Database

After first deployment, you need to seed the database:

1. In Railway, open the service terminal (or use Railway CLI)
2. Run:
   ```bash
   npx prisma migrate deploy
   npx tsx prisma/seed.ts
   ```

Or create an admin manually via the app after deployment.

---

## Step 5: Update Railway CORS

Once your Vercel domain is live, update the Railway environment variable:
```
FRONTEND_URL=https://thenightherons.run
```

---

## Verification Checklist

- [ ] Backend health check: `https://YOUR-RAILWAY-URL/api/health`
- [ ] Frontend loads: `https://thenightherons.run`
- [ ] Admin login works
- [ ] WebSocket connects (check "Live" indicator)
- [ ] Time entry works

---

## Costs

| Service | Free Tier | Your Usage |
|---------|-----------|------------|
| Vercel | Unlimited static hosting | $0 |
| Railway | $5/month credit | ~$0.21 for 21-hour race |
| **Total** | | **$0** |

---

## Troubleshooting

### WebSocket not connecting
- Check FRONTEND_URL in Railway matches your Vercel domain exactly
- Ensure no trailing slash

### Database errors
- Check DATABASE_URL is set correctly
- Verify volume is mounted at `/app/data`
- Run `prisma migrate deploy` if tables don't exist

### CORS errors
- Verify FRONTEND_URL matches your domain
- Clear browser cache after changes

---

## Race Day Checklist

1. Test all admin functions 24 hours before
2. Verify all runners have their PINs
3. Test time entry from mobile devices
4. Check real-time updates on dashboard
5. Have backup plan (spreadsheet) ready

Good luck! 🏃‍♂️
