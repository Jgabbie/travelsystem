import os
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from model_utils import get_hybrid_recs, run_training_cycle, models_exist
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="TRAVEX Recommendation Service")

# Add CORS middleware to allow Node.js backend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize models on startup"""
    logger.info("[Startup] AI Service initializing...")
    if not models_exist():
        logger.info("[Startup] Models not found. Attempting to train...")
        success = run_training_cycle()
        if success:
            logger.info("[Startup] ✓ Models trained successfully")
        else:
            logger.warning(
                "[Startup] ⚠ Models training failed or insufficient data")
    else:
        logger.info("[Startup] ✓ Models loaded successfully")


@app.get("/")
def read_root():
    return {
        "status": "AI Service is Online",
        "models_ready": models_exist()
    }


@app.post("/train")
async def train_models():
    """
    Endpoint to manually trigger model training/retraining.
    The Node.js backend can call this periodically or on-demand.
    """
    logger.info("[Train] Manual training triggered")
    success = run_training_cycle()
    return {
        "status": "success" if success else "failed",
        "message": "Models trained successfully" if success else "Training failed",
        "models_ready": models_exist()
    }


@app.get("/recommend/{user_id}")
async def recommend(user_id: str, last_tour: Optional[str] = None):
    """
    Endpoint for the Node.js backend to fetch recommendations.
    Returns recommendations based on hybrid approach (collaborative + content-based).
    """
    logger.info(f"[Recommend] User {user_id} requested recommendations")
    try:
        recommendations_data = get_hybrid_recs(user_id, last_tour)

        if "error" in recommendations_data:
            logger.warning(
                f"[Recommend] Error: {recommendations_data['error']}")
            return {
                "user_id": user_id,
                "recommendations": [],
                "error": recommendations_data['error']
            }

        logger.info(
            f"[Recommend] Returning {len(recommendations_data['recommendations'])} recommendations")
        return recommendations_data
    except Exception as e:
        logger.error(f"[Recommend] Unexpected error: {e}")
        return {"error": str(e), "recommendations": [], "user_id": user_id}


@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring.
    """
    return {
        "status": "healthy",
        "models_ready": models_exist()
    }


# For local testing and for Render/Heroku compatibility use $PORT when present
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv('PORT', 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)
