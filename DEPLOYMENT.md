# Deployment Guide

## Quick Setup for Production

### Phase 1: MongoDB Atlas ✅

**MongoDB URI** (already set up):
```
mongodb+srv://kushwahaman088_db_user:IcjRC01WFdmhqzTh@cluster0.nslmvfi.mongodb.net/?appName=Cluster0
```

### Phase 2: Generate Secrets

**JWT Secret** (generated):
```
57xtIxOm9wENhH8NYZDk35OfiP55ez7s6E8awWly43bybf3l50Em-bDKKgw0jye1
```

### Phase 3: Deploy Backend to Render

1. **Push changes to GitHub**:
   ```bash
   git add .
   git commit -m "fix: configure production-ready API URLs and env vars"
   git push origin main
   ```

2. **Create Render Web Service**:
   - Go to [render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect GitHub repo
   - Configure:
     - **Name**: smart-ai-backend
     - **Environment**: Python 3.11
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
     - **Region**: Oregon (or closest to you)
     - **Plan**: Starter (free tier)

3. **Set Environment Variables** in Render dashboard:

   | Key | Value |
   |-----|-------|
   | MONGO_URI | `mongodb+srv://kushwahaman088_db_user:IcjRC01WFdmhqzTh@cluster0.nslmvfi.mongodb.net/?appName=Cluster0` |
   | JWT_SECRET_KEY | `57xtIxOm9wENhH8NYZDk35OfiP55ez7s6E8awWly43bybf3l50Em-bDKKgw0jye1` |
   | LOG_LEVEL | `INFO` |

4. **Click Deploy** → Wait for build to complete

5. **Test Backend**:
   - Once deployed, you'll get a URL like `https://smart-ai-backend-xxxx.onrender.com`
   - Test: `curl https://smart-ai-backend-xxxx.onrender.com/api/status`

### Phase 4: Deploy Frontend to Vercel

1. **Set Frontend Env** in Vercel dashboard:
   - Go to [vercel.com](https://vercel.com)
   - Import repo
   - Set `VITE_API_URL` to your Render backend URL:
     ```
     https://smart-ai-backend-xxxx.onrender.com
     ```

2. **Deploy** → Vercel auto-builds and deploys

### Phase 5: Test End-to-End

- Open Vercel frontend URL
- Login (or register)
- Navigate to Dashboard → should fetch `/api/status` from Render
- Go to Live Risk → toggle monitoring → WebSocket should connect to Render
- Check browser DevTools Network tab:
  - API calls: `https://smart-ai-backend-xxxx.onrender.com/api/...`
  - WebSocket: `wss://smart-ai-backend-xxxx.onrender.com/ws/risk`

---

## Troubleshooting

### Backend won't start
- Check Render build logs for missing dependencies
- Verify `requirements.txt` is up to date
- Ensure all `.py` files have proper imports

### Frontend can't reach backend
- Verify `VITE_API_URL` is set in Vercel env
- Check browser console for exact error (CORS, 404, timeout)
- Test directly: `curl https://backend-url/api/status`

### WebSocket fails
- Ensure `VITE_API_URL` protocol is `https://` (not `http://`)
- Frontend will auto-convert to `wss://` for secure WebSocket

### Camera detection not working
- This is expected on server-side deployment
- Camera access requires client-side code or frame uploads
- See Architecture section in README.md

---

## Environment Variables Reference

```bash
# Required
MONGO_URI=mongodb+srv://...
JWT_SECRET_KEY=<your-secret>
LOG_LEVEL=INFO

# Optional (defaults provided)
FOG_MODEL_PATH=                    # Path to fog detection model
AUDIO_ALERT_DROWSY_PATH=          # Path to alert sound
AUDIO_ALERT_YAWN_PATH=            # Path to yawn alert sound
```

---

## Next Steps

- [ ] Push to GitHub
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Vercel
- [ ] Test end-to-end (login, dashboard, WebSocket)
- [ ] Monitor Render/Vercel logs for errors
- [ ] Consider CI/CD (GitHub Actions auto-deploy on push)

