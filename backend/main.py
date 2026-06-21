from fastapi import FastAPI, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import os
import re
import httpx
from sqlalchemy.orm import Session

from backend import parser
from backend.auth import create_access_token, get_current_user, get_db
from backend.models import User, SessionLocal

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

app = FastAPI(title="PH Customs Broker System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global Data ──────────────────────────────────────────────────────────
TARIFF_DATABASE = []
CHAPTER_TITLES = {}
HEADING_DESCRIPTIONS = {}
SPECIES_MAP = {
    "0101": {"emoji": "🐴", "name": "EQUINE (Horses, Asses, Mules, Hinnies)"},
    "0102": {"emoji": "🐂", "name": "BOVINE (Cattle, Buffalo)"},
    "0103": {"emoji": "🐖", "name": "PORCINE (Swine/Pigs)"},
    "0104": {"emoji": "🐑", "name": "OVINE (Sheep)"},
    "0105": {"emoji": "🐓", "name": "POULTRY (Fowls, Ducks, Geese, Turkeys)"},
    "0106": {"emoji": "🦎", "name": "OTHER LIVE ANIMALS (Reptiles, Birds, etc.)"},
}

TARIFF_FILE = "backend/ph_tariff_organized.txt"
if os.path.exists(TARIFF_FILE):
    print("Parsing tariff database...")
    TARIFF_DATABASE = parser.parse_tariff(TARIFF_FILE)
    CHAPTER_TITLES = parser.get_chapter_titles(TARIFF_FILE)
    for item in TARIFF_DATABASE:
        hd = item["code"][:4]
        if hd not in HEADING_DESCRIPTIONS:
            HEADING_DESCRIPTIONS[hd] = item["description"]
    print(f"Loaded {len(TARIFF_DATABASE)} records, {len(CHAPTER_TITLES)} chapters, {len(HEADING_DESCRIPTIONS)} headings.")
else:
    print("Warning: tariff file not found.")

# ─── Helper Functions ──────────────────────────────────────────────────────
def get_species_info(code: str):
    hd = code[:4]
    return SPECIES_MAP.get(hd, {"emoji": "📦", "name": "OTHER"})

def build_hierarchical_path(item):
    code = item["code"]
    chapter = code[:2]
    heading = code[:4]
    ch_title = CHAPTER_TITLES.get(int(chapter), f"Chapter {chapter}")
    hd_desc = HEADING_DESCRIPTIONS.get(heading, "")
    path = f"{ch_title} > {hd_desc} > {item['description']}"
    return re.sub(r'\s+', ' ', path).strip()

def get_entry_type(fob_usd: float) -> str:
    return "informal" if fob_usd <= 200 else "formal"

# ─── Pydantic Models ──────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class ClassificationRequest(BaseModel):
    description: str

class CustomsCalculationRequest(BaseModel):
    fob_fca_value: float
    exchange_rate: float
    freight_cost: float
    insurance_cost: float = 0.0
    rate_of_duty: float
    is_dangerous_goods: bool = False
    excise_tax: float = 0.0
    brokerage_fee: float = 700.0
    import_processing_fee: float = 0.0
    ahtn_code: str = "0000.00.00"

# ─── Auth Endpoints ───────────────────────────────────────────────────────
@app.post("/register", status_code=201)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    try:
        hashed = User.hash_password(user.password)
        new_user = User(email=user.email, hashed_password=hashed)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {"message": "User created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Registration failed")

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not user.verify_password(form_data.password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# ─── Tariff Endpoints ─────────────────────────────────────────────────────
@app.get("/search")
def search_tariff(
    q: str = Query(..., min_length=2),
    species: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    query = q.lower().strip()
    results = []
    for item in TARIFF_DATABASE:
        if species:
            sp_info = get_species_info(item["code"])
            if sp_info["name"] != species.upper():
                continue
        if query in item["code"] or query in item["description"].lower():
            item_copy = item.copy()
            item_copy["hierarchical_path"] = build_hierarchical_path(item)
            item_copy["species"] = get_species_info(item["code"])
            # Always expose rate_2026 as the primary rate
            item_copy["rate"] = item.get("rate_2026", 0)
            results.append(item_copy)
            if len(results) >= limit:
                break
    return {"results": results}

@app.get("/species")
def get_species_list(current_user: User = Depends(get_current_user)):
    present = set()
    for item in TARIFF_DATABASE:
        sp = get_species_info(item["code"])
        present.add(sp["name"])
    species_list = []
    for name in present:
        emoji = "📦"
        for k, v in SPECIES_MAP.items():
            if v["name"] == name:
                emoji = v["emoji"]
                break
        species_list.append({"name": name, "emoji": emoji})
    return {"species": species_list}

@app.get("/chapters")
def get_chapters(current_user: User = Depends(get_current_user)):
    chapters_list = []
    for ch_num in range(1, 98):
        title = CHAPTER_TITLES.get(ch_num, "Specialized Commodities / Mixed Categories")
        chapters_list.append({"number": ch_num, "title": title})
    return {"chapters": chapters_list}

@app.get("/chapter/{ch_num}")
def get_chapter_details(ch_num: int, current_user: User = Depends(get_current_user)):
    if ch_num < 1 or ch_num > 97:
        raise HTTPException(status_code=400, detail="Invalid Chapter Number")
    chapter_items = [item for item in TARIFF_DATABASE if item["chapter"] == ch_num]
    enhanced = []
    for item in chapter_items:
        copy = item.copy()
        copy["hierarchical_path"] = build_hierarchical_path(item)
        copy["species"] = get_species_info(item["code"])
        copy["rate"] = item.get("rate_2026", 0)
        enhanced.append(copy)
    return {"items": enhanced}

# ─── AI Classifier ────────────────────────────────────────────────────────
@app.post("/classify")
async def classify_goods(req: ClassificationRequest, current_user: User = Depends(get_current_user)):
    desc = req.description.strip()
    if not desc:
        raise HTTPException(status_code=400, detail="Description is required")

    # Build tariff context: top 80 entries as reference sample
    sample_entries = TARIFF_DATABASE[:80]
    tariff_context = "\n".join(
        f"{item['code']} | {item['description']} | {item.get('rate_2026', 0)}%"
        for item in sample_entries
    )

    system_prompt = """You are an expert Philippine customs classifier using AHTN 2022 and CMTA (RA 10863).
Given a cargo description, return exactly 3 HS code predictions as JSON array.
Each prediction must have: code, description, confidence, reasoning, duty_rate, chapter.
Respond ONLY with a raw JSON array. No markdown, no explanation, no backticks."""

    user_prompt = f"""Classify this cargo: "{desc}"

Reference tariff entries (AHTN 2022):
{tariff_context}

Return JSON array of 3 predictions:
[
  {{
    "code": "XXXX.XX.XX",
    "description": "tariff description",
    "confidence": "High/Medium/Low",
    "reasoning": "brief explanation referencing AHTN/CMTA",
    "duty_rate": 0.0,
    "chapter": "Chapter XX: Title"
  }}
]"""

    # Try AI classification first
    if ANTHROPIC_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-haiku-4-5-20251001",
                        "max_tokens": 1000,
                        "system": system_prompt,
                        "messages": [{"role": "user", "content": user_prompt}],
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    raw = data["content"][0]["text"].strip()
                    raw = re.sub(r"```json|```", "", raw).strip()
                    predictions = eval(raw) if raw.startswith("[") else []
                    if predictions:
                        return {"predictions": predictions[:3], "source": "ai"}
        except Exception as e:
            print(f"AI classify error: {e}")

    # Fallback: keyword search
    desc_lower = desc.lower()
    predictions = []
    for item in TARIFF_DATABASE:
        if any(word in item["description"].lower() for word in desc_lower.split()):
            r = item.get("rate_2026", 0)
            predictions.append({
                "code": item["code"],
                "confidence": "Low",
                "description": item["description"],
                "reasoning": "Keyword fallback match (AI unavailable).",
                "duty_rate": r,
                "chapter": f"Chapter {item['code'][:2]}"
            })
            if len(predictions) >= 3:
                break

    if not predictions:
        predictions.append({
            "code": "0000.00.00",
            "confidence": "Low",
            "description": "Unclassified",
            "reasoning": "No match found. Please refine description.",
            "duty_rate": 0.0,
            "chapter": "Unknown"
        })

    return {"predictions": predictions[:3], "source": "keyword"}

# ─── Calculator ───────────────────────────────────────────────────────────
@app.post("/calculator/compute-boc-taxes")
def compute_boc_taxes(req: CustomsCalculationRequest):
    try:
        insurance_multiplier = 0.04 if req.is_dangerous_goods else 0.02
        insurance_foreign = req.fob_fca_value * insurance_multiplier if req.insurance_cost == 0 else req.insurance_cost

        total_dutiable_foreign = req.fob_fca_value + req.freight_cost + insurance_foreign
        total_dutiable_php = total_dutiable_foreign * req.exchange_rate
        customs_duty_php = total_dutiable_php * (req.rate_of_duty / 100.0)

        bir_doc_stamp = 30.00
        customs_doc_stamp = 100.00

        total_landed_cost = (
            total_dutiable_php + customs_duty_php + req.excise_tax +
            req.brokerage_fee + req.import_processing_fee + customs_doc_stamp + bir_doc_stamp
        )
        vat_php = total_landed_cost * 0.12
        total_tax_payable = customs_duty_php + vat_php + req.excise_tax + req.import_processing_fee + bir_doc_stamp + customs_doc_stamp

        entry_type = get_entry_type(req.fob_fca_value)
        if entry_type == "informal":
            legal_clause = "Section 400, CMTA: De Minimis Importations value under PHP 10,000 exempt from basic duty."
            customs_duty_php = 0.0
            total_landed_cost = total_dutiable_php + req.excise_tax + req.brokerage_fee + req.import_processing_fee + customs_doc_stamp + bir_doc_stamp
            vat_php = total_landed_cost * 0.12
            total_tax_payable = vat_php + req.excise_tax + req.import_processing_fee + bir_doc_stamp + customs_doc_stamp
        else:
            legal_clause = "Section 401, CMTA: Formal Entry guidelines subject to full assessment workflows."

        buffered_exchange_rate = req.exchange_rate * 1.015
        buffered_dutiable_php = total_dutiable_foreign * buffered_exchange_rate
        buffered_duty = buffered_dutiable_php * (req.rate_of_duty / 100.0)
        if entry_type == "informal":
            buffered_duty = 0.0
        buffered_landed_cost = buffered_dutiable_php + buffered_duty + req.excise_tax + req.brokerage_fee + req.import_processing_fee + customs_doc_stamp + bir_doc_stamp
        buffered_vat = buffered_landed_cost * 0.12
        buffered_total_tax = buffered_duty + buffered_vat + req.excise_tax + req.import_processing_fee + bir_doc_stamp + customs_doc_stamp
        volatility_buffer_php = buffered_total_tax - total_tax_payable

        risk_score = 10
        risk_triggers = []
        if req.rate_of_duty > 20:
            risk_score += 30
            risk_triggers.append("High Tariffs Line Item Match")
        if req.fob_fca_value > 50000:
            risk_score += 25
            risk_triggers.append("High Commercial Value Valuation Target")
        if req.is_dangerous_goods:
            risk_score += 35
            risk_triggers.append("Controlled/Hazardous Commodity Pathway")

        risk_level = "LOW" if risk_score < 40 else "MEDIUM" if risk_score < 70 else "CRITICAL"

        return {
            "status": "success",
            "entry_type": entry_type,
            "legal_justification": legal_clause,
            "valuation": {
                "insurance_foreign": round(insurance_foreign, 2),
                "dutiable_value_foreign": round(total_dutiable_foreign, 2),
                "dutiable_value_php": round(total_dutiable_php, 2)
            },
            "assessment": {
                "customs_duty": round(customs_duty_php, 2),
                "vat_12": round(vat_php, 2),
                "bir_doc_stamp": bir_doc_stamp,
                "customs_doc_stamp": customs_doc_stamp,
                "total_landed_cost": round(total_landed_cost, 2),
                "total_tax_payable": round(total_tax_payable, 2)
            },
            "volatility_buffer": {
                "suggested_buffer_php": round(volatility_buffer_php, 2),
                "buffered_total_tax_php": round(buffered_total_tax, 2)
            },
            "risk_profile": {
                "score": risk_score,
                "level": risk_level,
                "triggers": risk_triggers
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Engine Calculation Failure: {str(e)}")

@app.get("/")
def home():
    return {"status": "online", "records_loaded": len(TARIFF_DATABASE)}

@app.get("/debug")
def debug_info():
    return {"records": len(TARIFF_DATABASE), "anthropic_key_set": bool(ANTHROPIC_API_KEY)}

