# Quick Reference: Real-Time Webcam Streaming

## 🚀 Start Local Development

```bash
# Terminal 1: Backend
cd /Users/amankush23/Music/Smart-AI-Based-Driver-Safety-Accident-Risk-Prediction
source .venv/bin/activate
export USE_EXTERNAL_FRAMES=true
export ALLOW_LOCAL_CAMERA_FALLBACK=false
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

**Access:** http://localhost:5173

---

## 📋 Production Deployment Checklist

### Before Deploying

- [ ] Read `PRODUCTION_DEPLOYMENT.md`
- [ ] Read `WEBCAM_STREAMING_SUMMARY.md`
- [ ] Create MongoDB Atlas cluster (if not done)
- [ ] Generate JWT secret: `python -c "import secrets; print(secrets.token_urlsafe(48))"`
- [ ] Test locally: `npm run dev` + backend running

### Vercel Frontend Deployment

```bash
# 1. Push to GitHub
git add .
git commit -m "Add production webcam streaming"
git push

# 2. Vercel Dashboard
# - Connect GitHub repo
# - Set build: npm install && npm run build
# - Set output: dist
# - Set env: VITE_API_URL=https://your-api-domain.com
# - Deploy

# 3. Verify
# - Open https://your-vercel-app.com
# - Check console (no CORS errors)
# - Test camera permission
```

### Render Backend Deployment

**Option A: Use render.yaml**
```yaml
services:
  - type: web
    name: driver-safety-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: MONGO_URI
        value: your_connection_string
      - key: JWT_SECRET_KEY
        value: your_generated_secret
      - key: CORS_ORIGINS
        value: https://your-vercel-app.com
      - key: USE_EXTERNAL_FRAMES
        value: "true"
      - key: ALLOW_LOCAL_CAMERA_FALLBACK
        value: "false"
```

**Option B: Render Dashboard**
- Create Web Service
- Connect GitHub repo
- Set build: `pip install -r requirements.txt`
- Set start: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- Add environment variables (see render.yaml)
- Deploy

---

## 🔧 Configuration Quick Reference

### Frontend (.env.local)
```env
# Local
VITE_API_URL=http://localhost:8000

# Production
VITE_API_URL=https://your-api-domain.render.com
```

### Backend (.env or environment)
```env
# CRITICAL: Webcam streaming
USE_EXTERNAL_FRAMES=true
ALLOW_LOCAL_CAMERA_FALLBACK=false

# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/?appName=driver-safety

# Security
JWT_SECRET_KEY=your_secret_key_here

# CORS
CORS_ORIGINS=https://your-frontend-domain.vercel.app

# Optional
LOG_LEVEL=INFO
ENABLE_AUDIO_ALERTS=true
```

---

## 🧪 Testing Endpoints

### Test Frame Processing
```bash
curl -X POST http://localhost:8000/api/process-frame \
  -H "Content-Type: application/json" \
  -d '{"image":"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmY/9k="}'
```

### Test Status Endpoint
```bash
curl http://localhost:8000/api/status
```

### Expected Response
```json
{
  "service": "driver-safety-system",
  "status": "online",
  "modules": {
    "drowsiness": {"active": true},
    "fog": {"active": true},
    "stress": {"active": true},
    "visibility": {"active": true},
    "kid_safety": {"active": true}
  }
}
```

---

## 📊 Frame Optimization Options

### For Slower Networks
```javascript
// frontend/src/pages/LiveRisk.jsx
const FRAME_CAPTURE_INTERVAL_MS = 500;  // Instead of 350
canvas.toDataURL('image/jpeg', 0.60);   // Instead of 0.72
const targetWidth = 480;                 // Instead of 640
```

### For Better Quality
```javascript
const FRAME_CAPTURE_INTERVAL_MS = 300;  // Instead of 350
canvas.toDataURL('image/jpeg', 0.85);   // Instead of 0.72
const targetWidth = 800;                 // Instead of 640
```

---

## ⚠️ Troubleshooting

### Frontend: "Camera permission denied"
**Solution:** Allow camera access in browser settings

### Frontend: "No connection to API"
**Solution:** 
- Check `VITE_API_URL` in `.env.local`
- Verify backend is running
- Check browser console for CORS errors

### Backend: "No camera frame available"
**Solution:** 
- Frontend is not sending frames
- Check browser network tab for POST failures
- Verify API endpoint is correct

### Backend: Attempting VideoCapture
**Solution:** 
- Set `ALLOW_LOCAL_CAMERA_FALLBACK=false`
- Verify `USE_EXTERNAL_FRAMES=true`
- Restart backend

### Production: HTTPS errors
**Solution:**
- Ensure Vercel/Render URLs use HTTPS
- `getUserMedia()` requires HTTPS (except localhost)

---

## 📁 Key Files Reference

| File | Purpose |
|------|---------|
| `frontend/src/pages/LiveRisk.jsx` | Webcam capture & frame transmission |
| `backend/routes/api.py` | `/api/process-frame` endpoint |
| `backend/services/drowsiness_service.py` | External frame processing |
| `backend/services/fog_service.py` | Fog detection on frames |
| `backend/services/visibility_service.py` | Visibility & child detection |
| `backend/services/kid_safety_service.py` | Kid safety detection |
| `.env.production` | Production configuration |
| `PRODUCTION_DEPLOYMENT.md` | Detailed deployment guide |
| `WEBCAM_STREAMING_SUMMARY.md` | Architecture & verification |

---

## 🔗 Environment Variables Summary

### Required for Production
```
USE_EXTERNAL_FRAMES=true
ALLOW_LOCAL_CAMERA_FALLBACK=false
MONGO_URI=<your_connection>
JWT_SECRET_KEY=<generated_secret>
CORS_ORIGINS=<frontend_url>
```

### Optional
```
LOG_LEVEL=INFO
ENABLE_AUDIO_ALERTS=true
ENABLE_DROWSINESS_SERVICE=auto
SMTP_HOST=<email_server>
SMTP_PORT=587
SMTP_USER=<email>
SMTP_PASS=<password>
```

---

## 💡 Performance Tips

1. **Reduce latency:** Decrease `FRAME_CAPTURE_INTERVAL_MS`
2. **Save bandwidth:** Decrease JPEG quality or frame size
3. **Reduce CPU:** Increase frame interval (higher = slower detection)
4. **Mobile:** Use 480×360 frames instead of 640×480

---

## 🎯 What's Included

✅ Frontend captures frames via `getUserMedia()`
✅ Frontend sends base64 frames to backend
✅ Backend accepts frames without local camera
✅ All ML services process external frames
✅ Real-time UI updates with detection results
✅ Error handling & graceful degradation
✅ Audio alerts on dangerous conditions
✅ Kid safety monitoring
✅ Production environment configuration
✅ Deployment documentation

---

## 📚 More Information

- **Architecture Details:** See `WEBCAM_STREAMING_SUMMARY.md`
- **Deployment Guide:** See `PRODUCTION_DEPLOYMENT.md`
- **Backend Config:** See `backend/app/core/config.py`
- **Frontend Config:** See `frontend/.env.local`

---

## ✨ Status

🟢 **READY FOR PRODUCTION**

Your project is fully configured for real-time webcam streaming on Vercel + Render without depending on local camera hardware.
