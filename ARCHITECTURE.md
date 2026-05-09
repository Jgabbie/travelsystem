# System Architecture: Python AI Service ↔ Node.js Backend

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        MongoDB (travelsystem)                    │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │     tours     │  │ interactions │  │  other collections│      │
│  │   (tags)      │  │ (user_id,    │  │  (bookings, etc) │      │
│  │   (name)      │  │  tour_name,  │  │                  │      │
│  │               │  │  confidence) │  │                  │      │
│  └───────────────┘  └──────────────┘  └──────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
           ↑                                    ↑
           │                                    │ Logs interactions
           │ Reads for model training           │ (bookings, views, ratings)
           │                                    │
      ┌────────────────────────────────────────────────────────┐
      │                Node.js Backend (Express)               │
      │  ┌────────────────────────────────────────────────────┐│
      │  │        routes/recommendations.js (or similar)      ││
      │  │  - POST /recommend - Get recommendations           ││
      │  │  - POST /train - Trigger model retraining          ││
      │  │  - GET /health - Check AI service status           ││
      │  └────────────────────────────────────────────────────┘│
      │              ↓ (HTTP requests via axios)               │
      │  ┌────────────────────────────────────────────────────┐│
      │  │      recommendController.js (UPDATED)              ││
      │  │  - getRecommendations()  [GET /recommend/:id]      ││
      │  │  - trainModels()         [POST /train]             ││
      │  │  - checkHealth()         [GET /health]             ││
      └────────────────────────────────────────────────────────┘
           ↑                                    ↓
           │                          HTTP (port 5000)
           │                                    │
           │ GET recommendations                │ return JSON
           │ POST trigger training              │ {"recommendations": [...]}
           │ GET health check                   │
           │                                    ↓
      ┌────────────────────────────────────────────────────────┐
      │            Python AI Service (FastAPI)                 │
      │  ┌────────────────────────────────────────────────────┐│
      │  │               main.py (UPDATED)                    ││
      │  │  Endpoints:                                        ││
      │  │  - GET  /               (status check)             ││
      │  │  - GET  /recommend/{user_id}   (get recommendations)││
      │  │  - POST /train          (train/retrain models)     ││
      │  │  - GET  /health         (service health)           ││
      │  └────────────────────────────────────────────────────┘│
      │  ┌────────────────────────────────────────────────────┐│
      │  │             model_utils.py (UPDATED)               ││
      │  │  Functions:                                        ││
      │  │  - get_data_from_mongodb()   [fetch tours & logs]  ││
      │  │  - run_training_cycle()      [train ALS + TF-IDF]  ││
      │  │  - train_and_save_models()   [save to models/]     ││
      │  │  - get_hybrid_recs()         [return recommendations]││
      │  │  - models_exist()            [check if trained]    ││
      │  └────────────────────────────────────────────────────┘│
      │  ┌────────────────────────────────────────────────────┐│
      │  │            models/ (Generated)                     ││
      │  │  - als_model.pkl         [Collaborative model]     ││
      │  │  - tfidf_matrix.pkl      [Content-based vectors]   ││
      │  │  - tfidf_vectorizer.pkl  [TF-IDF transformer]      ││
      │  │  - metadata.pkl          [User/tour mappings]      ││
      │  └────────────────────────────────────────────────────┘│
      └────────────────────────────────────────────────────────┘
```

## Setup Checklist

### 1. Python AI Service Setup
- [ ] Install Python 3.8+
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Copy `.env.example` to `.env`
- [ ] Verify MongoDB URI in `.env`
- [ ] Start AI service: `python main.py`
- [ ] Verify service online: `curl http://localhost:5000/`

### 2. Node.js Backend Updates
- [ ] Update `recommendController.js` with new exports
- [ ] Add routes for `/recommendations/*` endpoints
- [ ] Add `AI_SERVICE_URL` to `.env`
- [ ] Ensure `Tour` model exists and can query by name
- [ ] Ensure interactions are being logged to MongoDB

### 3. MongoDB Preparation
- [ ] Create `tours` collection with schema:
  ```
  { name: String, tags: String }
  ```
- [ ] Create `interactions` collection with schema:
  ```
  { user_id: String, tour_name: String, confidence: Number }
  ```
- [ ] Add sample data to both collections

### 4. Testing
- [ ] AI Service status: `GET http://localhost:5000/`
- [ ] Trigger training: `POST http://localhost:5000/train`
- [ ] Get recommendations: `GET http://localhost:5000/recommend/test_user`
- [ ] Backend health check: `GET http://your-backend/recommendations/health`

## Running Both Services

### Terminal 1: MongoDB (if running locally)
```bash
mongod
```

### Terminal 2: Python AI Service
```bash
cd aiservice
python main.py
```

### Terminal 3: Node.js Backend
```bash
cd Backend
npm start
# or
node server.js
```

## Environment Variables

### Python Service (.env in aiservice/)
```
MONGO_URI=mongodb://localhost:27017/
PORT=5000
```

### Node.js Backend (.env in Backend/)
```
AI_SERVICE_URL=http://localhost:5000
# ... other backend env vars
```

## Key Features

✅ **Hybrid Recommendations**
- Collaborative filtering for returning users
- Content-based filtering for new users

✅ **Automatic Model Training**
- Models train on service startup
- Manual retraining endpoint available

✅ **Error Handling**
- Graceful fallbacks when models unavailable
- Detailed error logging
- CORS enabled for frontend communication

✅ **Monitoring**
- Health check endpoints
- Detailed console logging with prefixes
- Model readiness tracking

## Next Steps

1. **Integrate with Frontend**: Update your React app to call `/recommendations` endpoint
2. **Log User Interactions**: Ensure user views, bookings, and ratings are saved to MongoDB
3. **Schedule Training**: Set up periodic model retraining (e.g., daily/weekly)
4. **Monitor Performance**: Track recommendation quality and AI service uptime
