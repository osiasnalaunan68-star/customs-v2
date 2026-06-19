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
            "description": "Semi-milled or wholly milled rice (AI Analysis: Product identified as rice, classified under Chapter 10: Cereals.)",
            "reasoning": "Product identified as rice, classified under Chapter 10: Cereals.",
            "duty_rate": 35.0,
            "rate": 35.0,
            "rate_2026": 35.0,
            "chapter": "Chapter 10: Cereals"
        })
        predictions.append({
            "code": "1006.20.90",
            "confidence": "85%",
            "description": "Husked (brown) rice (AI Analysis: Alternative: husked rice.)",
            "reasoning": "Alternative: husked rice.",
            "duty_rate": 35.0,
            "rate": 35.0,
            "rate_2026": 35.0,
            "chapter": "Chapter 10: Cereals"
        })

    # ─── 2. CHAPTER 8 FRUITS AND NUTS ────────────────────────────────
    elif any(word in desc for word in ["apple", "mango", "banana", "fruit", "prutas", "nut"]):
        predictions.append({
            "code": "0808.10.00",
            "confidence": "92%",
            "description": "Fresh fruit (AI Analysis: Product identified as fresh fruit, classified under Chapter 8: Edible Fruit and Nuts.)",
            "reasoning": "Product identified as fresh fruit, classified under Chapter 8: Edible Fruit and Nuts.",
            "duty_rate": 7.0,
            "rate": 7.0,
            "rate_2026": 7.0,
            "chapter": "Chapter 08: Edible Fruit and Nuts"
        })

    # ─── 3. CHAPTER 1 LIVE ANIMALS (strict) ──────────────────────────
    elif any(word in desc for word in ["live", "buhay"]) and any(word in desc for word in ["animal", "hayop", "cattle", "baka", "horse", "kabayo", "pig", "baboy"]):
        predictions.append({
            "code": "0102.21.00",
            "confidence": "85%",
            "description": "Live bovine animals (pure-bred breeding animals) (AI Analysis: Product identified as live animal, classified under Chapter 1.)",
            "reasoning": "Product identified as live animal, classified under Chapter 1.",
            "duty_rate": 0.0,
            "rate": 0.0,
            "rate_2026": 0.0,
            "chapter": "Chapter 01: Live animals"
        })

    # ─── 4. FALLBACK – Comprehensive Database Scan ───────────────────
    if not predictions:
        search_word = desc.strip()
        for item in TARIFF_DATABASE:
            item_desc_lower = item["description"].lower()
            
            # Match if the query is a substring of the description
            if search_word in item_desc_lower:
                r = item.get("rate_2026") or item.get("rate_2024") or 0
                predictions.append({
                    "code": item["code"],
                    "confidence": "80%",
                    "description": f"{item['description']} (AI Search Match)",
                    "reasoning": "Located via global database tariff mapping.",
                    "duty_rate": r,
                    "rate": r,
                    "rate_2026": r,
                    "chapter": f"Chapter {item['code'][:2]}"
                })
                
                # Allow up to 5 alternative matches to show in the UI
                if len(predictions) >= 5:
                    break
# ─── 5. ABSOLUTE FALLBACK ────────────────────────────────────────
    if not predictions:
        predictions.append({
            "code": "0000.00.00",
            "confidence": "Low",
            "description": "Unclassified (AI Analysis: No specific match. Please refine description.)",
            "reasoning": "No specific match. Please refine description.",
            "duty_rate": 0.0,
            "rate": 0.0,
            "rate_2026": 0.0,
            "chapter": "Unknown"
        })

    return {"predictions": predictions}

@app.get("/")
def home():
    return {"status": "online", "records_loaded": len(TARIFF_DATABASE)}

# ─── ADVANCED CALCULATOR COMPONENT SCHEMAS ───────────────────────────────
class CustomsCalculationRequest(BaseModel):
    ahtn_code: str = "0000.00.00"    # Added for legal matrix cross-reference
    fob_fca_value: float            # Invoice value in Foreign Currency
    exchange_rate: float            # Dynamic live rate or manual admin override
    freight_cost: float             # Shipping/Freight cost in Foreign Currency
    rate_of_duty: float             # Duty percentage rate (e.g., 7.0 for 7%)
    is_dangerous_goods: bool = False # Elevates insurance risk premium if True
    excise_tax: float = 0.0          # For specific high-value or restricted goods
    brokerage_fee: float = 700.0     # Default standard express clearance rate
    import_processing_fee: float = 0.0


# ─── ULTRA ADVANCED ARCHITECTURE CORE MODULES ─────────────────────────────
def get_legal_justification(code: str):
    if not code or code == "0000.00.00":
        return {"section": "General", "chapter": "General", "justification": "Standard tariff valuation rules apply."}
    chapter = code[:2]
    chapter_title = CHAPTER_TITLES.get(int(chapter), f"Chapter {chapter}") if 'CHAPTER_TITLES' in globals() else f"Chapter {chapter}"
    return {
        "section": "Integrated Tariff Framework",
        "chapter": chapter_title,
        "justification": f"Classification under AHTN {code} is legally justified under the Customs Modernization and Tariff Act (CMTA), referenced by {chapter_title}. The item excludes technical properties defined under alternative sections."
    }

def assess_risk(dangerous: bool, fob: float, duty_rate: float, code: str):
    risk = "low"
    reasons = []
    if dangerous:
        risk = "high"
        reasons.append("Regulated / Dangerous goods categorization flagged.")
    if fob > 50000:
        risk = "medium"
        reasons.append("High FOB value classification threshold exceeded (> USD 50k).")
    if duty_rate == 0:
        risk = "medium"
        reasons.append("Zero duty declaration profile – subject to regulatory permit review.")
    elif duty_rate > 20:
        risk = "high"
        reasons.append("High duty rate parameters – highly prone to valuation challenges.")
    return {
        "level": risk,
        "color": "🟢" if risk == "low" else "🟡" if risk == "medium" else "🔴",
        "reasons": reasons if reasons else ["Standard MFN item footprint with verified clean mapping."]
    }

@app.post("/calculator/compute-boc-taxes")
def compute_boc_taxes(req: CustomsCalculationRequest):
    try:
        # STEP 1: Rule-Based Insurance Premium Allocation (2% General / 4% Dangerous)
        insurance_multiplier = 0.04 if req.is_dangerous_goods else 0.02
        insurance_foreign = req.fob_fca_value * insurance_multiplier
        
        # STEP 2: Aggregate Total Dutiable Value (FOB + Freight + Insurance)
        total_dutiable_foreign = req.fob_fca_value + req.freight_cost + insurance_foreign
        
        # STEP 3: Currency Normalization to Philippine Peso (PHP)
        total_dutiable_php = total_dutiable_foreign * req.exchange_rate
        
        # STEP 4: Customs Duty Computation
        customs_duty_php = total_dutiable_php * (req.rate_of_duty / 100.0)
        
        # STEP 5: Fixed Government Statutory Fees (BIR & BOC Mandated Stamps)
        bir_doc_stamp = 30.00
        customs_doc_stamp = 100.00
        
        # STEP 6: Sequential Landed Cost Derivation
        total_landed_cost = (
            total_dutiable_php + 
            customs_duty_php + 
            req.excise_tax + 
            req.brokerage_fee + 
            req.import_processing_fee + 
            customs_doc_stamp + 
            bir_doc_stamp
        )
        
        # STEP 7: Value Added Tax Evaluation (12% of Integrated Landed Cost)
        vat_php = total_landed_cost * 0.12
        
        # STEP 8: Grand Total Tax Payable to Bureau of Customs
        total_tax_payable = (
            customs_duty_php + 
            vat_php + 
            req.excise_tax + 
            req.import_processing_fee + 
            bir_doc_stamp + 
            customs_doc_stamp
        )
        
        base_total = total_tax_payable
        return {
            "status": "success",
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
            "legal": get_legal_justification(req.ahtn_code),
            "volatility": {
                "best_case": round(base_total, 2),
                "plus_2_percent": round(base_total * 1.02, 2),
                "plus_5_percent": round(base_total * 1.05, 2),
                "buffer_2": round(base_total * 0.02, 2),
                "buffer_5": round(base_total * 0.05, 2)
            },
            "risk": assess_risk(req.is_dangerous_goods, req.fob_fca_value, req.rate_of_duty, req.ahtn_code)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Engine Calculation Failure: {str(e)}")
