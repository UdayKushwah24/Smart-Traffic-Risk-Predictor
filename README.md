# AI-Based Driver Safety Risk Prediction System

This project now combines real-time driver monitoring signals into one backend service and a single dashboard interface. The integrated platform supports:

- Driver drowsiness detection
- Fog detection
- Real-time driver emotion detection
- Aggregate driver risk scoring
- Alert history and warning events
- React dashboard monitoring

## New Feature: Real-Time Driver Emotion Detection

The emotion detection pipeline is integrated into the main DriverSafetySystem backend and frontend.

### How it works

1. The dashboard opens a webcam stream in the browser.
2. Frames are sampled and posted to `/api/emotion-detection/predict`.
3. The backend loads the serialized emotion model once and reuses it for all requests.
4. The prediction pipeline preprocesses the frame, extracts the main face region, runs inference, and returns JSON.
5. High-risk emotions trigger a warning banner, alert tone, Mongo alert event, and contribute to the overall safety score.

Example response:

```json
{
  "emotion": "Angry",
  "confidence": 0.87,
  "risk_level": "High",
  "risk_score": 20.88,
  "driver_risk_score": 83,
  "inference_ms": 48.5,
  "icon": "!!",
  "alert": true
}
```

### Risk mapping

- Angry / Stress: High risk
- Sad / Fear: Medium risk
- Neutral / Happy: Low risk

Additional labels such as `disgusted` and `surprised` are treated as moderate-risk emotional instability.

## Project structure

```text
DriverSafetySystem/
  backend/
    emotion_detection/
      emotion_model_loader.py
      emotion_predictor.py
      emotion_routes.py
    routes/
    services/
    database/
    main.py
  frontend/
    src/
      components/
        EmotionMonitor.jsx
        EmotionIndicator.jsx
        EmotionStats.jsx
      pages/
      styles/
  tests/
    test_emotion_detection.py
```

## Install dependencies

Backend:

```bash
cd DriverSafetySystem
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Frontend:

```bash
cd frontend
npm install
```

The backend expects the serialized emotion artifacts in the sibling folder:

```text
../Emotion detection 12.13.53 AM/
  emotion_detection_model.pkl
  label_encoder.pkl
  class_names.pkl
```

You can override this location with the `EMOTION_ASSETS_DIR` environment variable.

## Run the system

Start backend:

```bash
cd DriverSafetySystem/backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Start frontend:

```bash
cd DriverSafetySystem/frontend
npm run dev
```

Open the dashboard in your browser. The system will display:

- drowsiness alerts
- fog alerts
- real-time emotion state
- aggregate safety score

## Testing

```bash
cd DriverSafetySystem
python -m unittest tests.test_emotion_detection
```

The tests cover:

- model loader behavior
- prediction output and risk mapping
- API response contract

## API endpoints

- `GET /api/health`
- `GET /api/analytics/summary`
- `GET /api/alerts`
- `POST /api/emotion-detection/predict`
- `POST /api/emotion-detection/predict-base64`
- `GET /api/emotion-detection/latest`

## Performance notes

- The emotion model is loaded once through a singleton loader.
- Model prediction is guarded with a thread lock for safe reuse.
- Frames are downscaled before upload and resized efficiently before inference.
- The frontend prevents overlapping requests to keep latency low.
