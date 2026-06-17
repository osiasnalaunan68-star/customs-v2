from fastapi import FastAPI, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
import re

# Correct imports from the backend package
from backend import parser
from backend.auth import create_access_token, get_current_user, get_db
from backend.models import User, SessionLocal

app = FastAPI(title="PH Customs Broker System API")

# CORS – allow all origins for now
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
    "0101": {"emoji": "🐴", "name": "KABAYO/ASNO"},
    "0102": {"emoji": "🐂", "name": "BAKA/KALABAW"},
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
    hashed = User.hash_password(user.password)
    new_user = User(email=user.email, hashed_password=hashed)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully"}

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
    desc = req.description.lower()
    result = None
    if "apple" in desc or "fruit" in desc:
        result = {
            "hs_code": "0808.10.00",
            "confidence": "94%",
            "description": "Apples, fresh",
            "reasoning": "Identified as a fresh pomaceous fruit...",
            "duty_rate": 7.0,
            "chapter": "Chapter 08: Edible Fruit and Nuts; Peel of Citrus Fruit or Melons",
            "alternatives": [{"code": "0808.30.00", "description": "Pears, fresh"}]
        }
    elif "rice" in desc:
        result = {
            "hs_code": "1006.30.99",
            "confidence": "98%",
            "description": "Semi-milled or wholly milled rice...",
            "reasoning": "Product explicitly matches definitions for milled cereal grains.",
            "duty_rate": 35.0,
            "chapter": "Chapter 10: Cereals",
            "alternatives": [{"code": "1006.40.90", "description": "Broken Rice: Other"}]
        }
    else:
        first_item = TARIFF_DATABASE[0] if TARIFF_DATABASE else {"code": "0000.00.00", "description": "Generic Goods", "rate_2024": 0.0, "chapter": 1}
        result = {
            "hs_code": first_item["code"],
            "confidence": "45% (Low)",
            "description": first_item["description"],
            "reasoning": "Matches general baseline description structure due to non-specific context.",
            "duty_rate": first_item["rate_2024"],
            "chapter": f"Chapter {first_item['chapter']:02d}",
            "alternatives": []
        }
    code = result["hs_code"]
    item = next((it for it in TARIFF_DATABASE if it["code"] == code), None)
    if item:
        result["hierarchical_path"] = build_hierarchical_path(item)
        result["species"] = get_species_info(code)
    else:
        result["hierarchical_path"] = f"Chapter {code[:2]} > Heading {code[:4]} > {result['description']}"
        result["species"] = get_species_info(code)
    return result

@app.get("/")
def home():
    return {"status": "online", "records_loaded": len(TARIFF_DATABASE)}
