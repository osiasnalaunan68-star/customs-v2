from fastapi import FastAPI, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
import re
from sqlalchemy.orm import Session

from backend import parser
from backend.auth import create_access_token, get_current_user, get_db
from backend.models import User, SessionLocal

app = FastAPI(title="PH Customs Broker System API")

# CORS
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

# ─── Pydantic Models ──────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class ClassificationRequest(BaseModel):
    description: str

# ─── Authentication Endpoints ─────────────────────────────────────────────
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

# ─── Protected Tariff Endpoints ───────────────────────────────────────────
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
        enhanced.append(copy)
    return {"items": enhanced}

@app.post("/classify")
def classify_goods(req: ClassificationRequest, current_user: User = Depends(get_current_user)):
    desc = req.description.lower().strip()
    predictions = []

    # ─── 1. CHAPTER 10 CEREALS / RICE ──────────────────────────────────
    if any(word in desc for word in ["rice", "arroz", "bigas", "palay", "wheat", "trigo", "corn", "mais", "barley", "cebada", "oats", "avena", "rye", "centeno"]):
        predictions.append({
            "code": "1006.30.99",
            "confidence": "95%",
            "description": "Semi-milled or wholly milled rice",
            "reasoning": "Product identified as rice, classified under Chapter 10: Cereals.",
            "duty_rate": 35.0,
            "chapter": "Chapter 10: Cereals"
        })
        predictions.append({
            "code": "1006.20.90",
            "confidence": "85%",
            "description": "Husked (brown) rice",
            "reasoning": "Alternative: husked rice.",
            "duty_rate": 35.0,
            "chapter": "Chapter 10: Cereals"
        })

    # ─── 2. CHAPTER 8 FRUITS AND NUTS ────────────────────────────────
    elif any(word in desc for word in ["apple", "mango", "banana", "fruit", "prutas", "nut"]):
        predictions.append({
            "code": "0808.10.00",
            "confidence": "92%",
            "description": "Fresh fruit",
            "reasoning": "Product identified as fresh fruit, classified under Chapter 8: Edible Fruit and Nuts.",
            "duty_rate": 7.0,
            "chapter": "Chapter 08: Edible Fruit and Nuts"
        })

    # ─── 3. CHAPTER 1 LIVE ANIMALS (strict) ──────────────────────────
    elif any(word in desc for word in ["live", "buhay"]) and any(word in desc for word in ["animal", "hayop", "cattle", "baka", "horse", "kabayo", "pig", "baboy"]):
        predictions.append({
            "code": "0102.21.00",
            "confidence": "85%",
            "description": "Live bovine animals (pure-bred breeding animals)",
            "reasoning": "Product identified as live animal, classified under Chapter 1.",
            "duty_rate": 0.0,
            "chapter": "Chapter 01: Live animals"
        })

    # ─── 4. FALLBACK – database scan ─────────────────────────────────
    if not predictions:
        for item in TARIFF_DATABASE[:10]:
            if desc in item["description"].lower():
                predictions.append({
                    "code": item["code"],
                    "confidence": "70%",
                    "description": item["description"],
                    "reasoning": "Matched via database keyword scan.",
                    "duty_rate": item.get("rate_2024", 3.0),
                    "chapter": f"Chapter {item['code'][:2]}"
                })
                break

    # ─── 5. ABSOLUTE FALLBACK ────────────────────────────────────────
    if not predictions:
        predictions.append({
            "code": "0000.00.00",
            "confidence": "Low",
            "description": "Unclassified",
            "reasoning": "No specific match. Please refine description.",
            "duty_rate": 0.0,
            "chapter": "Unknown"
        })

    return {"predictions": predictions}

@app.get("/")
def home():
    return {"status": "online", "records_loaded": len(TARIFF_DATABASE)}
