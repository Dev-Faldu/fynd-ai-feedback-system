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
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "anthropic")
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

    def insert_review(self, rating, review_text, ai_response, ai_summary, ai_action):
        review_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO reviews VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (review_id, rating, review_text, ai_response, ai_summary, ai_action, created_at))

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
        if self.provider == "google":
            return await self._call_google(rating, review_text)
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
            return self._parse(text)

    def _build_prompt(self, rating, review):
        return f"""
Return ONLY valid JSON.

Rating: {rating}
Review: {review}

Fields:
user_response
admin_summary
recommended_action
"""

    def _parse(self, text):
        try:
            data = json.loads(text.strip())
            return {
                "ai_response": data["user_response"],
                "ai_summary": data["admin_summary"],
                "ai_recommended_action": data["recommended_action"],
            }
        except:
            return self._fallback(3)

    def _fallback(self, rating):
        return {
            "ai_response": "Thank you for your feedback.",
            "ai_summary": "Manual review needed",
            "ai_recommended_action": "Review manually",
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
            raise ValueError("Empty review")
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
    print("🚀 Backend starting...")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

db = DatabaseManager(Config.DATABASE_PATH)
llm = LLMService(
    Config.LLM_PROVIDER,
    Config.GOOGLE_API_KEY if Config.LLM_PROVIDER == "google" else Config.ANTHROPIC_API_KEY,
)

@app.post("/submit-review", response_model=ReviewSubmissionResponse)
async def submit_review(r: ReviewSubmission):
    feedback = await llm.generate_feedback(r.rating, r.review_text)
    db.insert_review(r.rating, r.review_text, **feedback)
    return {"status": "success", "ai_response": feedback["ai_response"]}

@app.get("/get-reviews", response_model=ReviewsResponse)
async def get_reviews(rating: Optional[int] = Query(None, ge=1, le=5)):
    return {"reviews": db.get_all_reviews(rating)}

@app.get("/health")
async def health():
    return {"status": "healthy"}
