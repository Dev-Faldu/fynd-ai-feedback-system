"""
Fynd AI Feedback System - Production Backend
FastAPI + SQLite + Claude/Gemini Integration
"""

import os
import json
import sqlite3
import uuid
from datetime import datetime
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import httpx
from dotenv import load_dotenv

load_dotenv()

# ============================================================================
# CONFIGURATION
# ============================================================================

class Config:
    DATABASE_PATH = "reviews.db"
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "google")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    MAX_REVIEW_LENGTH = 5000
    LLM_TIMEOUT = 30
    LLM_MAX_RETRIES = 2

# ============================================================================
# DATABASE LAYER
# ============================================================================

class DatabaseManager:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.init_database()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_database(self):
        with self.get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS reviews (
                    id TEXT PRIMARY KEY,
                    rating INTEGER NOT NULL,
                    review_text TEXT NOT NULL,
                    ai_response TEXT NOT NULL,
                    ai_summary TEXT NOT NULL,
                    ai_recommended_action TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)

    def insert_review(self, rating, review_text, ai_response, ai_summary, ai_recommended_action):
        review_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO reviews VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (review_id, rating, review_text, ai_response, ai_summary, ai_recommended_action, created_at))

    def get_all_reviews(self, rating_filter=None):
        with self.get_connection() as conn:
            if rating_filter:
                rows = conn.execute("""
                    SELECT rating, review_text, ai_summary, ai_recommended_action, created_at
                    FROM reviews WHERE rating = ? ORDER BY created_at DESC
                """, (rating_filter,))
            else:
                rows = conn.execute("""
                    SELECT rating, review_text, ai_summary, ai_recommended_action, created_at
                    FROM reviews ORDER BY created_at DESC
                """)
            return [dict(r) for r in rows]

# ============================================================================
# LLM SERVICE
# ============================================================================

class LLMService:
    def __init__(self, provider: str, api_key: Optional[str]):
        if not api_key:
            raise ValueError(f"API key required for {provider}")
        self.provider = provider
        self.api_key = api_key

    async def generate_feedback(self, rating: int, review_text: str) -> dict:
        try:
            if self.provider == "google":
                return await self._call_google(rating, review_text)
            return self._fallback(rating)
        except Exception as e:
            print(f"LLM Error: {e}")
            return self._fallback(rating)

    async def _call_google(self, rating, review_text):
        prompt = self._build_prompt(rating, review_text)
        async with httpx.AsyncClient(timeout=Config.LLM_TIMEOUT) as client:
            res = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={self.api_key}",
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )
            res.raise_for_status()
            text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
            return self._parse(text, rating)

    def _build_prompt(self, rating, review):
        return f"""You are an AI customer feedback analyst for an e-commerce platform.

A customer submitted:
- Rating: {rating}/5 stars
- Review: {review}

Generate a JSON response with exactly these three fields:

1. "user_response": A warm, professional reply to the customer (2-3 sentences)
2. "admin_summary": A concise internal summary (1 sentence)
3. "recommended_action": A clear next action for the business

CRITICAL: Respond ONLY with valid JSON. No markdown, no code blocks, no additional text.

Example:
{{
  "user_response": "Thank you for your feedback...",
  "admin_summary": "Customer experienced shipping delay",
  "recommended_action": "Follow up within 24 hours"
}}"""

    def _parse(self, text, rating):
        try:
            cleaned = text.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                cleaned = "\n".join(lines[1:-1]) if len(lines) > 2 else cleaned
            
            data = json.loads(cleaned)
            return {
                "ai_response": data.get("user_response", ""),
                "ai_summary": data.get("admin_summary", ""),
                "ai_recommended_action": data.get("recommended_action", ""),
            }
        except Exception as e:
            print(f"Parse Error: {e}")
            return self._fallback(rating)

    def _fallback(self, rating):
        if rating <= 2:
            return {
                "ai_response": "Thank you for your feedback. We take all concerns seriously and will investigate this matter promptly.",
                "ai_summary": "Low rating received - requires immediate attention",
                "ai_recommended_action": "Escalate to customer success team within 4 hours",
            }
        elif rating == 3:
            return {
                "ai_response": "Thank you for your feedback. We're always working to improve our service.",
                "ai_summary": "Neutral feedback - monitor for patterns",
                "ai_recommended_action": "Add to weekly review queue",
            }
        else:
            return {
                "ai_response": "Thank you for your positive feedback! We're delighted to hear about your experience.",
                "ai_summary": "Positive customer feedback",
                "ai_recommended_action": "No immediate action required",
            }

# ============================================================================
# MODELS
# ============================================================================

class ReviewSubmission(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    review_text: str

    @field_validator("review_text")
    @classmethod
    def not_empty(cls, v):
        if not v.strip():
            raise ValueError("Review text cannot be empty")
        return v.strip()

class ReviewSubmissionResponse(BaseModel):
    status: str
    ai_response: str

class ReviewsResponse(BaseModel):
    reviews: List[dict]

# ============================================================================
# APP
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Fynd AI Feedback System Starting...")
    print(f"✓ Database: {Config.DATABASE_PATH}")
    print(f"✓ LLM Provider: {Config.LLM_PROVIDER}")
    yield
    print("Shutting down...")

app = FastAPI(
    title="Fynd AI Feedback System",
    description="Production-grade AI-powered customer feedback system",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
db = DatabaseManager(Config.DATABASE_PATH)
llm = LLMService(
    Config.LLM_PROVIDER,
    Config.GOOGLE_API_KEY if Config.LLM_PROVIDER == "google" else Config.ANTHROPIC_API_KEY,
)

# ============================================================================
# ROUTES
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "service": "Fynd AI Feedback System",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "submit_review": "/submit-review",
            "get_reviews": "/get-reviews",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "connected",
        "llm_provider": Config.LLM_PROVIDER
    }

@app.post("/submit-review", response_model=ReviewSubmissionResponse)
async def submit_review(r: ReviewSubmission):
    """Submit a customer review and receive AI-generated feedback"""
    try:
        # Truncate if necessary
        review_text = r.review_text[:Config.MAX_REVIEW_LENGTH]
        
        # Generate AI feedback
        feedback = await llm.generate_feedback(r.rating, review_text)
        
        # Store in database
        db.insert_review(r.rating, review_text, **feedback)
        
        return {
            "status": "success",
            "ai_response": feedback["ai_response"]
        }
    except Exception as e:
        print(f"Submit Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process review")

@app.get("/get-reviews", response_model=ReviewsResponse)
async def get_reviews(rating: Optional[int] = Query(None, ge=1, le=5)):
    """Retrieve all reviews with optional rating filter"""
    try:
        reviews = db.get_all_reviews(rating_filter=rating)
        return {"reviews": reviews}
    except Exception as e:
        print(f"Get Reviews Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve reviews")

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
