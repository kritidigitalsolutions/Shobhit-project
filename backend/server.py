from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import random
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr


# -------- DB --------
def get_required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


mongo_url = get_required_env("MONGO_URL")
client = AsyncIOMotorClient(mongo_url)
db = client[get_required_env("DB_NAME")]

JWT_SECRET = get_required_env("JWT_SECRET")
JWT_ALGORITHM = "HS256"

app = FastAPI()
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

# Add CORS middleware BEFORE adding routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------- Helpers --------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> dict:
    token = None
    if creds and creds.scheme.lower() == "bearer":
        token = creds.credentials
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="Account suspended. Contact support.")
    user.setdefault("role", "investor")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# -------- Models --------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class InvestIn(BaseModel):
    fund_id: str
    amount: float


class SIPIn(BaseModel):
    fund_id: str
    amount: float
    frequency: str = "monthly"  # monthly | weekly | quarterly


class WatchlistIn(BaseModel):
    fund_id: str


class KYCUpdateIn(BaseModel):
    pan: Optional[str] = None
    aadhaar: Optional[str] = None
    bank_account: Optional[str] = None
    ifsc: Optional[str] = None
    address: Optional[str] = None


# -------- Sample Funds --------
SAMPLE_FUNDS = [
    {"id": "MF001", "name": "Axis Bluechip Fund - Direct Growth", "amc": "Axis Mutual Fund", "category": "Large Cap", "risk": "Moderate", "nav": 58.42, "aum_cr": 33245, "expense_ratio": 0.55, "returns_1y": 14.2, "returns_3y": 18.9, "returns_5y": 16.4, "rating": 4.5, "min_sip": 500, "min_lumpsum": 5000},
    {"id": "MF002", "name": "Mirae Asset Large Cap Fund - Direct Growth", "amc": "Mirae Asset", "category": "Large Cap", "risk": "Moderate", "nav": 92.15, "aum_cr": 41218, "expense_ratio": 0.54, "returns_1y": 13.8, "returns_3y": 17.5, "returns_5y": 15.9, "rating": 4.7, "min_sip": 500, "min_lumpsum": 5000},
    {"id": "MF003", "name": "Parag Parikh Flexi Cap Fund - Direct Growth", "amc": "PPFAS Mutual Fund", "category": "Flexi Cap", "risk": "Moderate", "nav": 78.34, "aum_cr": 67230, "expense_ratio": 0.62, "returns_1y": 22.4, "returns_3y": 24.1, "returns_5y": 21.8, "rating": 5.0, "min_sip": 1000, "min_lumpsum": 1000},
    {"id": "MF004", "name": "SBI Small Cap Fund - Direct Growth", "amc": "SBI Mutual Fund", "category": "Small Cap", "risk": "High", "nav": 162.55, "aum_cr": 25789, "expense_ratio": 0.71, "returns_1y": 28.9, "returns_3y": 31.2, "returns_5y": 26.5, "rating": 4.8, "min_sip": 500, "min_lumpsum": 5000},
    {"id": "MF005", "name": "Nippon India Small Cap Fund - Direct Growth", "amc": "Nippon India", "category": "Small Cap", "risk": "High", "nav": 174.10, "aum_cr": 48312, "expense_ratio": 0.65, "returns_1y": 31.5, "returns_3y": 34.7, "returns_5y": 28.1, "rating": 5.0, "min_sip": 100, "min_lumpsum": 5000},
    {"id": "MF006", "name": "HDFC Mid-Cap Opportunities Fund - Direct Growth", "amc": "HDFC Mutual Fund", "category": "Mid Cap", "risk": "High", "nav": 145.78, "aum_cr": 58904, "expense_ratio": 0.74, "returns_1y": 25.6, "returns_3y": 27.3, "returns_5y": 22.9, "rating": 4.6, "min_sip": 100, "min_lumpsum": 100},
    {"id": "MF007", "name": "ICICI Prudential Bluechip Fund - Direct Growth", "amc": "ICICI Prudential", "category": "Large Cap", "risk": "Moderate", "nav": 88.23, "aum_cr": 52341, "expense_ratio": 0.58, "returns_1y": 15.1, "returns_3y": 17.8, "returns_5y": 15.2, "rating": 4.4, "min_sip": 100, "min_lumpsum": 100},
    {"id": "MF008", "name": "Kotak Equity Opportunities Fund - Direct Growth", "amc": "Kotak Mutual Fund", "category": "Large & Mid Cap", "risk": "Moderate", "nav": 295.41, "aum_cr": 19872, "expense_ratio": 0.66, "returns_1y": 19.7, "returns_3y": 21.4, "returns_5y": 18.6, "rating": 4.5, "min_sip": 1000, "min_lumpsum": 5000},
    {"id": "MF009", "name": "Quant Active Fund - Direct Growth", "amc": "Quant Mutual Fund", "category": "Flexi Cap", "risk": "High", "nav": 689.32, "aum_cr": 9921, "expense_ratio": 0.77, "returns_1y": 35.8, "returns_3y": 32.5, "returns_5y": 29.4, "rating": 4.9, "min_sip": 1000, "min_lumpsum": 5000},
    {"id": "MF010", "name": "UTI Nifty 50 Index Fund - Direct Growth", "amc": "UTI Mutual Fund", "category": "Index", "risk": "Moderate", "nav": 142.05, "aum_cr": 16235, "expense_ratio": 0.21, "returns_1y": 12.4, "returns_3y": 15.1, "returns_5y": 13.8, "rating": 4.3, "min_sip": 500, "min_lumpsum": 5000},
    {"id": "MF011", "name": "Aditya Birla SL Corporate Bond Fund - Direct Growth", "amc": "Aditya Birla Sun Life", "category": "Debt", "risk": "Low", "nav": 102.78, "aum_cr": 22145, "expense_ratio": 0.32, "returns_1y": 7.8, "returns_3y": 6.9, "returns_5y": 7.2, "rating": 4.5, "min_sip": 1000, "min_lumpsum": 1000},
    {"id": "MF012", "name": "HDFC Hybrid Equity Fund - Direct Growth", "amc": "HDFC Mutual Fund", "category": "Hybrid", "risk": "Moderate", "nav": 105.34, "aum_cr": 24189, "expense_ratio": 0.95, "returns_1y": 13.2, "returns_3y": 14.8, "returns_5y": 12.6, "rating": 4.2, "min_sip": 500, "min_lumpsum": 5000},
    {"id": "MF013", "name": "Mirae Asset Tax Saver Fund - Direct Growth (ELSS)", "amc": "Mirae Asset", "category": "ELSS", "risk": "Moderate", "nav": 48.92, "aum_cr": 24310, "expense_ratio": 0.55, "returns_1y": 19.4, "returns_3y": 21.8, "returns_5y": 19.2, "rating": 4.7, "min_sip": 500, "min_lumpsum": 500},
    {"id": "MF014", "name": "Axis Long Term Equity Fund - Direct Growth (ELSS)", "amc": "Axis Mutual Fund", "category": "ELSS", "risk": "Moderate", "nav": 92.14, "aum_cr": 36850, "expense_ratio": 0.79, "returns_1y": 16.8, "returns_3y": 18.5, "returns_5y": 17.4, "rating": 4.5, "min_sip": 500, "min_lumpsum": 500},
    {"id": "MF015", "name": "Quant ELSS Tax Saver Fund - Direct Growth", "amc": "Quant Mutual Fund", "category": "ELSS", "risk": "High", "nav": 412.06, "aum_cr": 6892, "expense_ratio": 0.76, "returns_1y": 32.4, "returns_3y": 29.8, "returns_5y": 26.1, "rating": 4.8, "min_sip": 500, "min_lumpsum": 500},
]

FUND_HOLDINGS = {
    "MF001": ["HDFC Bank", "ICICI Bank", "Reliance", "Infosys", "TCS"],
    "MF003": ["Bajaj Holdings", "ITC", "Power Grid", "Coal India", "ICICI Bank"],
    "MF004": ["Krishna Institute", "City Union Bank", "Cholamandalam", "Blue Star", "Carborundum"],
    "MF005": ["Tube Investments", "Multi Commodity Exchange", "Power Mech", "HBL Power", "ELGI Equipments"],
}


# -------- Commission defaults (typical Indian MF distributor economics) --------
# Annual percentages used to compute both upfront (on every fresh investment)
# and trail (annualised, paid on AUM) commission for the portfolio manager.
COMMISSION_DEFAULTS = {
    "Large Cap":        {"upfront_pct": 1.00, "trail_pct": 1.00},
    "Large & Mid Cap":  {"upfront_pct": 1.10, "trail_pct": 1.10},
    "Mid Cap":          {"upfront_pct": 1.20, "trail_pct": 1.20},
    "Small Cap":        {"upfront_pct": 1.30, "trail_pct": 1.30},
    "Flexi Cap":        {"upfront_pct": 1.10, "trail_pct": 1.10},
    "ELSS":             {"upfront_pct": 1.20, "trail_pct": 1.10},
    "Hybrid":           {"upfront_pct": 0.80, "trail_pct": 0.80},
    "Debt":             {"upfront_pct": 0.40, "trail_pct": 0.40},
    "Index":            {"upfront_pct": 0.20, "trail_pct": 0.20},
}


def default_commission_for(category: str) -> dict:
    return COMMISSION_DEFAULTS.get(category, {"upfront_pct": 0.80, "trail_pct": 0.80})


def gen_nav_history(current_nav: float, days: int = 365) -> List[dict]:
    rng = random.Random(int(current_nav * 100))
    history = []
    nav = current_nav * 0.78
    base = datetime.now(timezone.utc) - timedelta(days=days)
    for i in range(days):
        drift = rng.uniform(-0.015, 0.022)
        nav = max(nav * (1 + drift), 1.0)
        if i == days - 1:
            nav = current_nav
        history.append({"date": (base + timedelta(days=i)).strftime("%Y-%m-%d"), "nav": round(nav, 4)})
    return history


# -------- Startup --------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.funds.create_index("id", unique=True)

    # Ensure existing users have the new fields (back-fill)
    await db.users.update_many({"role": {"$exists": False}}, {"$set": {"role": "investor", "status": "active"}})

    # Seed admin user
    admin_email = "admin@shobhitcapital.com"
    admin_existing = await db.users.find_one({"email": admin_email})
    if not admin_existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Admin",
            "email": admin_email,
            "password_hash": hash_password("Admin@1234"),
            "role": "admin",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Seed funds - drop & reseed when count mismatches expected (allows adding new funds via SAMPLE_FUNDS)
    count = await db.funds.count_documents({})
    if count != len(SAMPLE_FUNDS):
        await db.funds.delete_many({})
        seeded = []
        for f in SAMPLE_FUNDS:
            doc = {**f, **default_commission_for(f.get("category", ""))}
            seeded.append(doc)
        await db.funds.insert_many(seeded)
    else:
        # Back-fill commission columns for existing funds that pre-date this feature
        async for f in db.funds.find({"$or": [{"upfront_pct": {"$exists": False}}, {"trail_pct": {"$exists": False}}]}, {"_id": 0, "id": 1, "category": 1}):
            defaults = default_commission_for(f.get("category", ""))
            await db.funds.update_one({"id": f["id"]}, {"$set": defaults})

    # Seed demo user with sample portfolio
    demo_email = "demo@shobhitcapital.com"
    existing = await db.users.find_one({"email": demo_email})
    if not existing:
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid,
            "name": "Amit Jain",
            "email": demo_email,
            "password_hash": hash_password("Demo@1234"),
            "role": "investor",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        # Seed holdings
        sample_holdings = [
            {"fund_id": "MF003", "units": 425.14, "avg_nav": 62.10, "invested": 26400},
            {"fund_id": "MF005", "units": 142.50, "avg_nav": 142.30, "invested": 20278},
            {"fund_id": "MF001", "units": 312.80, "avg_nav": 51.20, "invested": 16015},
            {"fund_id": "MF010", "units": 211.40, "avg_nav": 128.50, "invested": 27165},
            {"fund_id": "MF011", "units": 148.90, "avg_nav": 98.20, "invested": 14622},
        ]
        for h in sample_holdings:
            await db.holdings.insert_one({"id": str(uuid.uuid4()), "user_id": uid, **h, "created_at": datetime.now(timezone.utc).isoformat()})

        # SIPs
        sample_sips = [
            {"fund_id": "MF003", "amount": 5000, "frequency": "monthly", "status": "active", "next_date": (datetime.now(timezone.utc) + timedelta(days=12)).strftime("%Y-%m-%d")},
            {"fund_id": "MF005", "amount": 2500, "frequency": "monthly", "status": "active", "next_date": (datetime.now(timezone.utc) + timedelta(days=5)).strftime("%Y-%m-%d")},
            {"fund_id": "MF001", "amount": 3000, "frequency": "monthly", "status": "paused", "next_date": (datetime.now(timezone.utc) + timedelta(days=22)).strftime("%Y-%m-%d")},
        ]
        for s in sample_sips:
            await db.sips.insert_one({"id": str(uuid.uuid4()), "user_id": uid, **s, "created_at": datetime.now(timezone.utc).isoformat()})

        # Transactions
        now = datetime.now(timezone.utc)
        txns = [
            {"fund_id": "MF003", "type": "SIP", "amount": 5000, "units": 64.12, "nav": 78.0, "date": (now - timedelta(days=30)).strftime("%Y-%m-%d"), "status": "Completed"},
            {"fund_id": "MF003", "type": "SIP", "amount": 5000, "units": 65.84, "nav": 75.9, "date": (now - timedelta(days=60)).strftime("%Y-%m-%d"), "status": "Completed"},
            {"fund_id": "MF005", "type": "Lumpsum", "amount": 10000, "units": 57.45, "nav": 174.1, "date": (now - timedelta(days=15)).strftime("%Y-%m-%d"), "status": "Completed"},
            {"fund_id": "MF001", "type": "SIP", "amount": 3000, "units": 51.35, "nav": 58.4, "date": (now - timedelta(days=20)).strftime("%Y-%m-%d"), "status": "Completed"},
            {"fund_id": "MF010", "type": "Lumpsum", "amount": 15000, "units": 105.59, "nav": 142.05, "date": (now - timedelta(days=90)).strftime("%Y-%m-%d"), "status": "Completed"},
            {"fund_id": "MF011", "type": "Lumpsum", "amount": 5000, "units": 48.65, "nav": 102.78, "date": (now - timedelta(days=45)).strftime("%Y-%m-%d"), "status": "Completed"},
            {"fund_id": "MF013", "type": "Lumpsum", "amount": 4678, "units": 102.45, "nav": 45.65, "date": (now - timedelta(days=120)).strftime("%Y-%m-%d"), "status": "Completed"},
        ]
        for t in txns:
            await db.transactions.insert_one({"id": str(uuid.uuid4()), "user_id": uid, **t, "created_at": datetime.now(timezone.utc).isoformat()})

        # KYC
        await db.kyc.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "pan": "ABCDE1234F",
            "aadhaar": "XXXX-XXXX-1234",
            "bank_account": "XXXXXX5678",
            "ifsc": "HDFC0001234",
            "address": "Mumbai, Maharashtra, India",
            "pan_verified": True,
            "aadhaar_verified": True,
            "bank_verified": True,
            "address_verified": False,
            "status": "In Progress",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

        # Watchlist
        await db.watchlist.insert_one({"id": str(uuid.uuid4()), "user_id": uid, "fund_id": "MF009", "created_at": datetime.now(timezone.utc).isoformat()})
        await db.watchlist.insert_one({"id": str(uuid.uuid4()), "user_id": uid, "fund_id": "MF006", "created_at": datetime.now(timezone.utc).isoformat()})


# -------- Auth --------
@api.post("/auth/register")
async def register(payload: RegisterIn):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(uuid.uuid4())
    await db.users.insert_one({
        "id": uid,
        "name": payload.name,
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": "investor",
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    token = create_token(uid, email)
    return {"token": token, "user": {"id": uid, "name": payload.name, "email": email, "role": "investor"}}


@api.post("/auth/login")
async def login(payload: LoginIn):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="Account suspended. Contact support.")
    token = create_token(user["id"], email)
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": email, "role": user.get("role", "investor")}}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    return {"ok": True}


# -------- Funds --------
@api.get("/funds")
async def list_funds(category: Optional[str] = None, risk: Optional[str] = None, q: Optional[str] = None):
    query = {}
    if category and category != "All":
        query["category"] = category
    if risk and risk != "All":
        query["risk"] = risk
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    funds = await db.funds.find(query, {"_id": 0}).to_list(500)
    return funds


@api.get("/funds/{fund_id}")
async def get_fund(fund_id: str):
    fund = await db.funds.find_one({"id": fund_id}, {"_id": 0})
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    fund["nav_history"] = gen_nav_history(fund["nav"], 365)
    fund["top_holdings"] = FUND_HOLDINGS.get(fund_id, ["HDFC Bank", "ICICI Bank", "Reliance Industries", "Infosys", "TCS"])
    return fund


# -------- Portfolio --------
@api.get("/portfolio")
async def portfolio(user: dict = Depends(get_current_user)):
    holdings = await db.holdings.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    funds_map = {f["id"]: f async for f in db.funds.find({}, {"_id": 0})}

    total_invested = 0.0
    current_value = 0.0
    items = []
    for h in holdings:
        f = funds_map.get(h["fund_id"])
        if not f:
            continue
        cur_val = round(h["units"] * f["nav"], 2)
        pnl = round(cur_val - h["invested"], 2)
        pnl_pct = round((pnl / h["invested"]) * 100, 2) if h["invested"] else 0
        total_invested += h["invested"]
        current_value += cur_val
        items.append({
            "id": h["id"],
            "fund_id": h["fund_id"],
            "fund_name": f["name"],
            "amc": f["amc"],
            "category": f["category"],
            "units": h["units"],
            "avg_nav": h["avg_nav"],
            "current_nav": f["nav"],
            "invested": h["invested"],
            "current_value": cur_val,
            "pnl": pnl,
            "pnl_pct": pnl_pct,
        })

    summary = {
        "invested": round(total_invested, 2),
        "current_value": round(current_value, 2),
        "pnl": round(current_value - total_invested, 2),
        "pnl_pct": round(((current_value - total_invested) / total_invested) * 100, 2) if total_invested else 0,
        "holdings_count": len(items),
    }

    # Asset allocation by category
    allocation = {}
    for it in items:
        allocation[it["category"]] = allocation.get(it["category"], 0) + it["current_value"]
    summary["allocation"] = [{"name": k, "value": round(v, 2)} for k, v in allocation.items()]

    return {"summary": summary, "holdings": items}


@api.post("/portfolio/invest")
async def invest(payload: InvestIn, user: dict = Depends(get_current_user)):
    fund = await db.funds.find_one({"id": payload.fund_id}, {"_id": 0})
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    if payload.amount < fund["min_lumpsum"]:
        raise HTTPException(status_code=400, detail=f"Minimum lumpsum is ₹{fund['min_lumpsum']}")
    units = round(payload.amount / fund["nav"], 4)

    existing = await db.holdings.find_one({"user_id": user["id"], "fund_id": payload.fund_id})
    if existing:
        new_units = existing["units"] + units
        new_invested = existing["invested"] + payload.amount
        new_avg_nav = round(new_invested / new_units, 4)
        await db.holdings.update_one(
            {"id": existing["id"]},
            {"$set": {"units": new_units, "invested": new_invested, "avg_nav": new_avg_nav}},
        )
    else:
        await db.holdings.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "fund_id": payload.fund_id,
            "units": units,
            "avg_nav": fund["nav"],
            "invested": payload.amount,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "fund_id": payload.fund_id,
        "type": "Lumpsum",
        "amount": payload.amount,
        "units": units,
        "nav": fund["nav"],
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "status": "Completed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "units": units, "fund": fund["name"]}


# -------- SIPs --------
@api.get("/sips")
async def list_sips(user: dict = Depends(get_current_user)):
    sips = await db.sips.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    funds_map = {f["id"]: f async for f in db.funds.find({}, {"_id": 0})}
    for s in sips:
        f = funds_map.get(s["fund_id"])
        if f:
            s["fund_name"] = f["name"]
            s["amc"] = f["amc"]
            s["category"] = f["category"]
    return sips


@api.post("/sips")
async def create_sip(payload: SIPIn, user: dict = Depends(get_current_user)):
    fund = await db.funds.find_one({"id": payload.fund_id}, {"_id": 0})
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    if payload.amount < fund["min_sip"]:
        raise HTTPException(status_code=400, detail=f"Minimum SIP is ₹{fund['min_sip']}")
    next_date = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")
    sid = str(uuid.uuid4())
    await db.sips.insert_one({
        "id": sid,
        "user_id": user["id"],
        "fund_id": payload.fund_id,
        "amount": payload.amount,
        "frequency": payload.frequency,
        "status": "active",
        "next_date": next_date,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "id": sid}


@api.patch("/sips/{sip_id}")
async def update_sip(sip_id: str, action: str, user: dict = Depends(get_current_user)):
    if action not in ("pause", "resume", "stop"):
        raise HTTPException(status_code=400, detail="Invalid action")
    status_map = {"pause": "paused", "resume": "active", "stop": "stopped"}
    res = await db.sips.update_one(
        {"id": sip_id, "user_id": user["id"]},
        {"$set": {"status": status_map[action]}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="SIP not found")
    return {"ok": True, "status": status_map[action]}


# -------- Transactions --------
@api.get("/transactions")
async def list_transactions(user: dict = Depends(get_current_user)):
    txns = await db.transactions.find({"user_id": user["id"]}, {"_id": 0}).sort("date", -1).to_list(500)
    funds_map = {f["id"]: f async for f in db.funds.find({}, {"_id": 0})}
    for t in txns:
        f = funds_map.get(t["fund_id"])
        if f:
            t["fund_name"] = f["name"]
            t["amc"] = f["amc"]
    return txns


# -------- Watchlist --------
@api.get("/watchlist")
async def get_watchlist(user: dict = Depends(get_current_user)):
    items = await db.watchlist.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    if not items:
        return []
    fund_ids = [i["fund_id"] for i in items]
    funds = await db.funds.find({"id": {"$in": fund_ids}}, {"_id": 0}).to_list(500)
    return funds


@api.post("/watchlist")
async def add_watchlist(payload: WatchlistIn, user: dict = Depends(get_current_user)):
    if await db.watchlist.find_one({"user_id": user["id"], "fund_id": payload.fund_id}):
        return {"ok": True, "already": True}
    await db.watchlist.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "fund_id": payload.fund_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


@api.delete("/watchlist/{fund_id}")
async def remove_watchlist(fund_id: str, user: dict = Depends(get_current_user)):
    await db.watchlist.delete_one({"user_id": user["id"], "fund_id": fund_id})
    return {"ok": True}


# -------- KYC --------
@api.get("/kyc")
async def get_kyc(user: dict = Depends(get_current_user)):
    kyc = await db.kyc.find_one({"user_id": user["id"]}, {"_id": 0})
    if not kyc:
        return {
            "pan": None, "aadhaar": None, "bank_account": None, "ifsc": None, "address": None,
            "pan_verified": False, "aadhaar_verified": False, "bank_verified": False, "address_verified": False,
            "status": "Not Started",
        }
    return kyc


@api.put("/kyc")
async def update_kyc(payload: KYCUpdateIn, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "pan" in update:
        update["pan_verified"] = True
    if "aadhaar" in update:
        update["aadhaar_verified"] = True
    if "bank_account" in update:
        update["bank_verified"] = True
    if "address" in update:
        update["address_verified"] = True
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    existing = await db.kyc.find_one({"user_id": user["id"]})
    if existing:
        await db.kyc.update_one({"user_id": user["id"]}, {"$set": update})
    else:
        update["id"] = str(uuid.uuid4())
        update["user_id"] = user["id"]
        await db.kyc.insert_one(update)

    new = await db.kyc.find_one({"user_id": user["id"]}, {"_id": 0})
    verified_count = sum([new.get("pan_verified", False), new.get("aadhaar_verified", False), new.get("bank_verified", False), new.get("address_verified", False)])
    new["status"] = "Completed" if verified_count == 4 else ("In Progress" if verified_count else "Not Started")
    await db.kyc.update_one({"user_id": user["id"]}, {"$set": {"status": new["status"]}})
    return new


# -------- Goals --------
class GoalIn(BaseModel):
    name: str
    target_amount: float
    target_date: str  # YYYY-MM-DD
    current_amount: float = 0
    icon: Optional[str] = "target"


@api.get("/goals")
async def list_goals(user: dict = Depends(get_current_user)):
    goals = await db.goals.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    for g in goals:
        progress = (g.get("current_amount", 0) / g["target_amount"] * 100) if g["target_amount"] else 0
        g["progress_pct"] = round(min(progress, 100), 1)
    return goals


@api.post("/goals")
async def create_goal(payload: GoalIn, user: dict = Depends(get_current_user)):
    gid = str(uuid.uuid4())
    await db.goals.insert_one({
        "id": gid,
        "user_id": user["id"],
        "name": payload.name,
        "target_amount": payload.target_amount,
        "current_amount": payload.current_amount,
        "target_date": payload.target_date,
        "icon": payload.icon or "target",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "id": gid}


@api.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user: dict = Depends(get_current_user)):
    await db.goals.delete_one({"id": goal_id, "user_id": user["id"]})
    return {"ok": True}


# -------- Tax Center --------
@api.get("/tax")
async def tax_center(user: dict = Depends(get_current_user)):
    txns = await db.transactions.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    funds_map = {f["id"]: f async for f in db.funds.find({}, {"_id": 0})}

    # Add ELSS category to the filter list
    elss_invested = 0.0
    total_invested = 0.0
    realized_stcg = 0.0
    realized_ltcg = 0.0
    for t in txns:
        total_invested += t.get("amount", 0)
        f = funds_map.get(t["fund_id"])
        if f and f.get("category") == "ELSS":
            elss_invested += t.get("amount", 0)

    # Unrealized gains from holdings
    holdings = await db.holdings.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    unrealized = 0.0
    for h in holdings:
        f = funds_map.get(h["fund_id"])
        if f:
            unrealized += (h["units"] * f["nav"]) - h["invested"]

    # 80C utilization (max 1.5L)
    section_80c_limit = 150000
    section_80c_remaining = max(0, section_80c_limit - elss_invested)

    # ELSS recommendations
    elss_funds = [f for f in funds_map.values() if f.get("category") == "ELSS"]
    elss_recs = sorted(elss_funds, key=lambda x: x.get("rating", 0), reverse=True)[:3]
    if not elss_recs:  # fallback
        elss_recs = sorted(
            [f for f in funds_map.values() if f.get("category") in ("Flexi Cap", "Large Cap")],
            key=lambda x: x.get("rating", 0),
            reverse=True,
        )[:3]

    return {
        "summary": {
            "elss_invested": round(elss_invested, 2),
            "section_80c_limit": section_80c_limit,
            "section_80c_remaining": round(section_80c_remaining, 2),
            "section_80c_pct": round(min(elss_invested / section_80c_limit * 100, 100), 1) if section_80c_limit else 0,
            "total_invested": round(total_invested, 2),
            "unrealized_gains": round(unrealized, 2),
            "realized_stcg": round(realized_stcg, 2),
            "realized_ltcg": round(realized_ltcg, 2),
            "estimated_tax_saving": round(min(elss_invested, section_80c_limit) * 0.30, 2),
        },
        "recommendations": elss_recs,
    }


# -------- Reports / Statements --------
@api.get("/reports/statement")
async def account_statement(user: dict = Depends(get_current_user)):
    txns = await db.transactions.find({"user_id": user["id"]}, {"_id": 0}).sort("date", 1).to_list(500)
    funds_map = {f["id"]: f async for f in db.funds.find({}, {"_id": 0})}
    rows = []
    running = 0.0
    for t in txns:
        running += t.get("amount", 0)
        rows.append({
            **t,
            "fund_name": funds_map.get(t["fund_id"], {}).get("name", ""),
            "running_balance": round(running, 2),
        })
    return {
        "user": {"name": user["name"], "email": user["email"]},
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_invested": round(running, 2),
        "rows": rows,
    }


@api.get("/reports/pnl")
async def pnl_report(user: dict = Depends(get_current_user)):
    holdings = await db.holdings.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    funds_map = {f["id"]: f async for f in db.funds.find({}, {"_id": 0})}
    rows = []
    total_inv, total_cur = 0.0, 0.0
    for h in holdings:
        f = funds_map.get(h["fund_id"])
        if not f:
            continue
        cur = h["units"] * f["nav"]
        pnl = cur - h["invested"]
        days_held = 180  # mock holding period
        rows.append({
            "fund_id": h["fund_id"],
            "fund_name": f["name"],
            "category": f["category"],
            "units": h["units"],
            "avg_nav": h["avg_nav"],
            "current_nav": f["nav"],
            "invested": h["invested"],
            "current_value": round(cur, 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl / h["invested"] * 100, 2) if h["invested"] else 0,
            "holding_type": "Long Term" if days_held > 365 else "Short Term",
        })
        total_inv += h["invested"]
        total_cur += cur
    return {
        "total_invested": round(total_inv, 2),
        "total_current": round(total_cur, 2),
        "total_pnl": round(total_cur - total_inv, 2),
        "rows": rows,
    }


# -------- Insights / News --------
SAMPLE_NEWS = [
    {"id": "N001", "title": "RBI keeps repo rate unchanged at 6.5% — what it means for debt funds", "source": "Mint", "category": "Debt", "summary": "The central bank's status quo signals continued stability for short-term debt funds; long-duration bets remain attractive ahead of an expected rate cut cycle.", "url": "#", "published": "2 hours ago"},
    {"id": "N002", "title": "Small-cap funds deliver 31% average returns this year — caution advised", "source": "Economic Times", "category": "Small Cap", "summary": "While returns look attractive, valuations in small caps are at decade highs. SIPs are recommended over lumpsum to spread risk.", "url": "#", "published": "5 hours ago"},
    {"id": "N003", "title": "Parag Parikh Flexi Cap announces new international allocation strategy", "source": "Moneycontrol", "category": "Flexi Cap", "summary": "The fund will increase its overseas equity exposure to 25% with a focus on US tech and emerging-market consumer names.", "url": "#", "published": "1 day ago"},
    {"id": "N004", "title": "Budget 2026 highlights: LTCG threshold raised to ₹1.25L", "source": "Business Standard", "category": "Tax", "summary": "Investors can now book up to ₹1.25 lakh in long-term equity gains tax-free per year. Plan systematic withdrawals accordingly.", "url": "#", "published": "1 day ago"},
    {"id": "N005", "title": "Index funds see record inflows in Q1 — UTI Nifty 50 tops the list", "source": "Mint", "category": "Index", "summary": "Passive investing continues its momentum with ₹12,400 crore flowing into index funds, led by Nifty 50 trackers.", "url": "#", "published": "2 days ago"},
    {"id": "N006", "title": "How to rebalance your portfolio in a volatile market", "source": "Shobhit Capital Research", "category": "Education", "summary": "A simple 60/30/10 framework can help you ride out volatility while keeping long-term goals intact.", "url": "#", "published": "3 days ago"},
]


@api.get("/insights")
async def insights(user: dict = Depends(get_current_user)):
    # Personalize: surface news matching held fund categories
    holdings = await db.holdings.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    funds_map = {f["id"]: f async for f in db.funds.find({}, {"_id": 0})}
    user_cats = {funds_map.get(h["fund_id"], {}).get("category") for h in holdings}
    items = []
    for n in SAMPLE_NEWS:
        items.append({**n, "relevant": n["category"] in user_cats})
    items.sort(key=lambda x: (not x["relevant"], x["id"]))
    return items


# -------- Compare Funds --------
@api.get("/compare")
async def compare_funds(ids: str, user: dict = Depends(get_current_user)):
    fund_ids = [i.strip() for i in ids.split(",") if i.strip()][:3]
    funds = []
    for fid in fund_ids:
        f = await db.funds.find_one({"id": fid}, {"_id": 0})
        if f:
            f["nav_history"] = gen_nav_history(f["nav"], 365)
            funds.append(f)
    return funds


# -------- Notifications --------
@api.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    notifs = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    if not notifs:
        # Seed on first read
        seed_notifs = [
            {"type": "sip", "title": "SIP installment in 3 days", "body": "Your ₹5,000 SIP for Parag Parikh Flexi Cap is scheduled.", "icon": "calendar"},
            {"type": "kyc", "title": "Complete your KYC", "body": "Submit your address proof to fully activate investing.", "icon": "shield"},
            {"type": "nav", "title": "NAV alert — Quant Active Fund", "body": "Quant Active is up +3.2% today. Check it out.", "icon": "trending"},
            {"type": "tax", "title": "Tax saving reminder", "body": "You've used 0% of your 80C limit this year. Consider ELSS.", "icon": "receipt"},
            {"type": "advisor", "title": "New AI insight for your portfolio", "body": "Your allocation is overweight on small caps. Tap to review.", "icon": "sparkles"},
        ]
        for s in seed_notifs:
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                **s,
            })
        notifs = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return notifs


@api.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": notif_id, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# -------- Referrals --------
@api.get("/referrals")
async def referrals(user: dict = Depends(get_current_user)):
    code = "SHOBHIT" + user["id"].replace("-", "")[:6].upper()
    referred = await db.referrals.count_documents({"referrer_user_id": user["id"]})
    return {
        "code": code,
        "share_url": f"https://shobhitcapital.app/r/{code}",
        "referred_count": referred,
        "rewards_earned": referred * 250,
        "tiers": [
            {"count": 1, "reward": 250, "label": "First Friend"},
            {"count": 5, "reward": 1500, "label": "Champion"},
            {"count": 10, "reward": 4000, "label": "Wealth Builder"},
        ],
    }


# -------- AI Advisor (Claude Sonnet 4.5) --------
class ChatIn(BaseModel):
    message: str
    session_id: Optional[str] = None


@api.post("/advisor/chat")
async def advisor_chat(payload: ChatIn, user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError:
        # Fallback response when emergentintegrations is not available
        session_id = payload.session_id or str(uuid.uuid4())
        fallback_reply = "I'm Sage, your AI investment advisor. I help with mutual fund guidance, SIP planning, and tax-saving strategies. Please note: I'm in demo mode and cannot provide AI responses right now. Please try again later."
        now = datetime.now(timezone.utc).isoformat()
        await db.chat_messages.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "session_id": session_id, "role": "user", "content": payload.message, "created_at": now})
        await db.chat_messages.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "session_id": session_id, "role": "assistant", "content": fallback_reply, "created_at": now})
        return {"session_id": session_id, "reply": fallback_reply}

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    session_id = payload.session_id or str(uuid.uuid4())

    # Build context with portfolio summary
    holdings = await db.holdings.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    funds_map = {f["id"]: f async for f in db.funds.find({}, {"_id": 0})}
    portfolio_lines = []
    total_inv, total_cur = 0.0, 0.0
    for h in holdings:
        f = funds_map.get(h["fund_id"])
        if f:
            cur = h["units"] * f["nav"]
            total_inv += h["invested"]
            total_cur += cur
            portfolio_lines.append(f"- {f['name']} ({f['category']}, {f['risk']} risk): invested ₹{h['invested']:.0f}, current ₹{cur:.0f}")
    portfolio_summary = "\n".join(portfolio_lines) if portfolio_lines else "No holdings yet."

    system_msg = (
        "You are 'Sage', the AI advisor for Shobhit Capital, an Indian mutual fund investment platform. "
        "You give concise, balanced, regulatory-safe guidance about mutual funds, SIPs, tax-saving (80C/ELSS), "
        "asset allocation, and goal planning — always in INR (₹) context for Indian investors. "
        "Never promise specific returns. Always end recommendations with a brief risk disclaimer when suggesting funds. "
        "Keep replies under 180 words. Use plain text — no markdown headings, but you may use short bullet lists with '•'.\n\n"
        f"User context:\nName: {user['name']}\n"
        f"Total invested: ₹{total_inv:.0f}\nCurrent value: ₹{total_cur:.0f}\n"
        f"Holdings:\n{portfolio_summary}"
    )

    # Note: per-message context lives in system_msg (portfolio summary); we keep DB history for UI replay
    # rather than replaying it into the LLM session to avoid double-billing.
    chat = LlmChat(api_key=api_key, session_id=session_id, system_message=system_msg).with_model("anthropic", "claude-sonnet-4-5-20250929")

    reply: str = ""
    try:
        reply = await chat.send_message(UserMessage(text=payload.message))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("advisor_chat failed")
        err = str(e)
        if "Budget" in err or "budget" in err:
            raise HTTPException(status_code=402, detail="AI Advisor is temporarily unavailable — the service quota has been reached. Please try again later.")
        raise HTTPException(status_code=500, detail=f"Advisor error: {err[:200]}")

    if not reply:
        raise HTTPException(status_code=500, detail="Advisor returned an empty response")

    now = datetime.now(timezone.utc).isoformat()
    await db.chat_messages.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "session_id": session_id, "role": "user", "content": payload.message, "created_at": now})
    await db.chat_messages.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "session_id": session_id, "role": "assistant", "content": reply, "created_at": now})
    return {"session_id": session_id, "reply": reply}


@api.get("/advisor/sessions/{session_id}")
async def get_session(session_id: str, user: dict = Depends(get_current_user)):
    msgs = await db.chat_messages.find(
        {"user_id": user["id"], "session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    return msgs


# -------- Weekly Digest (AI-powered) --------
@api.get("/digest/weekly")
async def weekly_digest(user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError:
        LlmChat = None
        UserMessage = None

    api_key = os.environ.get("EMERGENT_LLM_KEY") if LlmChat else None

    # Pull data needed for the digest
    holdings = await db.holdings.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    sips = await db.sips.find({"user_id": user["id"], "status": "active"}, {"_id": 0}).to_list(200)
    txns = await db.transactions.find({"user_id": user["id"]}, {"_id": 0}).sort("date", -1).to_list(20)
    funds_map = {f["id"]: f async for f in db.funds.find({}, {"_id": 0})}

    # Compute movers
    enriched = []
    for h in holdings:
        f = funds_map.get(h["fund_id"])
        if not f:
            continue
        cur = h["units"] * f["nav"]
        pnl = cur - h["invested"]
        pnl_pct = (pnl / h["invested"]) * 100 if h["invested"] else 0
        enriched.append({"fund_id": f["id"], "name": f["name"], "category": f["category"], "pnl": pnl, "pnl_pct": pnl_pct, "current": cur, "invested": h["invested"]})

    top_mover = max(enriched, key=lambda x: x["pnl_pct"], default=None)
    biggest_dip = min(enriched, key=lambda x: x["pnl_pct"], default=None)
    total_invested = sum(h["invested"] for h in enriched)
    total_current = sum(h["current"] for h in enriched)
    week_pnl = total_current - total_invested

    # Upcoming SIPs in next 14 days
    today = datetime.now(timezone.utc).date()
    upcoming = []
    for s in sips:
        try:
            d = datetime.strptime(s["next_date"], "%Y-%m-%d").date()
            if 0 <= (d - today).days <= 14:
                f = funds_map.get(s["fund_id"], {})
                upcoming.append({"fund_name": f.get("name", ""), "amount": s["amount"], "next_date": s["next_date"]})
        except Exception:
            continue

    facts = {
        "investor": user["name"],
        "week_of": today.strftime("%d %b %Y"),
        "total_invested": round(total_invested, 2),
        "current_value": round(total_current, 2),
        "week_pnl": round(week_pnl, 2),
        "top_mover": top_mover and {"name": top_mover["name"], "pnl_pct": round(top_mover["pnl_pct"], 2), "category": top_mover["category"]},
        "biggest_dip": biggest_dip and {"name": biggest_dip["name"], "pnl_pct": round(biggest_dip["pnl_pct"], 2), "category": biggest_dip["category"]},
        "upcoming_sips": upcoming,
        "recent_txns_count": len(txns),
    }

    # Ask Sage to write a friendly digest narrative
    narrative = ""
    if api_key and LlmChat:
        try:
            chat = LlmChat(
                api_key=api_key,
                session_id=f"digest-{user['id']}-{today.isoformat()}",
                system_message=(
                    "You are Sage, the AI advisor for Shobhit Capital. Write a warm, concise weekly portfolio digest "
                    "for an Indian retail mutual fund investor. Tone: friendly, factual, encouraging but never promising returns. "
                    "Format STRICTLY as 4 short sections separated by blank lines, each with a single-line title in Title Case followed by 1-2 sentences. "
                    "Use ₹ for currency. No markdown headings (#), no bold. The 4 sections must be: "
                    "1) This Week — overall portfolio performance. "
                    "2) Spotlight — top mover with category context. "
                    "3) Watch List — biggest dip and what it means. "
                    "4) Tax Tip — one practical Indian tax tip (80C, ELSS, LTCG ₹1.25L threshold, etc.). "
                    "Keep the entire response under 160 words."
                ),
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            narrative = await chat.send_message(UserMessage(text=f"Facts to base the digest on:\n{facts}"))
        except Exception as e:
            logger.warning("digest LLM failed: %s", e)
            narrative = ""

    if not narrative:
        # Deterministic fallback if LLM unavailable
        parts = [
            f"This Week\nYour portfolio is at ₹{facts['current_value']:,.0f} against ₹{facts['total_invested']:,.0f} invested — that's a running gain of ₹{facts['week_pnl']:,.0f}.",
        ]
        if facts["top_mover"]:
            parts.append(f"Spotlight\n{facts['top_mover']['name']} leads with {facts['top_mover']['pnl_pct']}% — a strong showing for your {facts['top_mover']['category']} allocation.")
        if facts["biggest_dip"]:
            parts.append(f"Watch List\n{facts['biggest_dip']['name']} is down {abs(facts['biggest_dip']['pnl_pct'])}%. SIPs help average down — stay patient.")
        parts.append("Tax Tip\nLong-term equity gains are tax-free up to ₹1.25L per year. Consider booking profits in tranches before March 31st.")
        narrative = "\n\n".join(parts)

    return {"facts": facts, "narrative": narrative, "generated_at": datetime.now(timezone.utc).isoformat()}


# -------- Admin Panel --------
async def log_audit(actor: dict, action: str, target: str = "", details: Optional[dict] = None):
    await db.audit_log.insert_one({
        "id": str(uuid.uuid4()),
        "actor_id": actor.get("id"),
        "actor_email": actor.get("email"),
        "action": action,
        "target": target,
        "details": details or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


class FundIn(BaseModel):
    id: Optional[str] = None
    name: str
    amc: str
    category: str
    risk: str
    nav: float
    aum_cr: float
    expense_ratio: float
    returns_1y: float
    returns_3y: float
    returns_5y: float
    rating: float
    min_sip: float
    min_lumpsum: float
    upfront_pct: Optional[float] = None
    trail_pct: Optional[float] = None


class CommissionIn(BaseModel):
    upfront_pct: float
    trail_pct: float


class UserStatusIn(BaseModel):
    status: str  # active | suspended


class BroadcastIn(BaseModel):
    title: str
    body: str
    icon: Optional[str] = "sparkles"
    user_id: Optional[str] = None  # if None, broadcast to all investors


@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({"role": "investor"})
    suspended = await db.users.count_documents({"role": "investor", "status": "suspended"})
    total_funds = await db.funds.count_documents({})
    total_txns = await db.transactions.count_documents({})
    total_sips = await db.sips.count_documents({"status": "active"})

    # AUM across investors
    holdings = await db.holdings.find({}, {"_id": 0}).to_list(10000)
    funds_map = {f["id"]: f async for f in db.funds.find({}, {"_id": 0})}
    aum = 0.0
    invested = 0.0
    for h in holdings:
        f = funds_map.get(h["fund_id"])
        if f:
            aum += h["units"] * f["nav"]
            invested += h["invested"]

    # Recent signups
    recent = await db.users.find(
        {"role": "investor"}, {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).limit(5).to_list(5)

    # Top funds by holdings count
    fund_counts = {}
    for h in holdings:
        fund_counts[h["fund_id"]] = fund_counts.get(h["fund_id"], 0) + 1
    top_funds = sorted(
        [{"fund_id": k, "investors": v, "name": funds_map.get(k, {}).get("name", "")} for k, v in fund_counts.items()],
        key=lambda x: x["investors"],
        reverse=True,
    )[:5]

    # Growth chart: signups per month last 6 months
    now = datetime.now(timezone.utc)
    growth = []
    for i in range(5, -1, -1):
        bucket = (now - timedelta(days=i * 30))
        label = bucket.strftime("%b")
        cnt = await db.users.count_documents({
            "role": "investor",
            "created_at": {"$lt": bucket.replace(day=28).isoformat()},
        })
        growth.append({"month": label, "users": cnt})

    return {
        "totals": {
            "investors": total_users,
            "suspended": suspended,
            "funds": total_funds,
            "transactions": total_txns,
            "active_sips": total_sips,
            "aum": round(aum, 2),
            "invested": round(invested, 2),
            "platform_pnl": round(aum - invested, 2),
        },
        "recent_signups": recent,
        "top_funds": top_funds,
        "growth": growth,
    }


@api.get("/admin/users")
async def admin_list_users(q: Optional[str] = None, admin: dict = Depends(require_admin)):
    query = {"role": "investor"}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)

    # Batch fetch all holdings + SIPs to avoid N+1 queries
    user_ids = [u["id"] for u in users]
    funds_map = {f["id"]: f async for f in db.funds.find({}, {"_id": 0})}
    all_holdings = await db.holdings.find({"user_id": {"$in": user_ids}}, {"_id": 0}).to_list(10000)
    active_sip_ids = await db.sips.find(
        {"user_id": {"$in": user_ids}, "status": "active"}, {"_id": 0, "user_id": 1}
    ).to_list(5000)

    holdings_by_user: dict = {}
    for h in all_holdings:
        holdings_by_user.setdefault(h["user_id"], []).append(h)
    sips_count_by_user: dict = {}
    for s in active_sip_ids:
        sips_count_by_user[s["user_id"]] = sips_count_by_user.get(s["user_id"], 0) + 1

    for u in users:
        holdings = holdings_by_user.get(u["id"], [])
        invested = sum(h["invested"] for h in holdings)
        current = sum(h["units"] * funds_map.get(h["fund_id"], {}).get("nav", 0) for h in holdings)
        u["invested"] = round(invested, 2)
        u["current_value"] = round(current, 2)
        u["holdings_count"] = len(holdings)
        u["active_sips"] = sips_count_by_user.get(u["id"], 0)
    return users


@api.get("/admin/users/{user_id}")
async def admin_get_user(user_id: str, admin: dict = Depends(require_admin)):
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    funds_map = {f["id"]: f async for f in db.funds.find({}, {"_id": 0})}
    holdings = await db.holdings.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    enriched = []
    for h in holdings:
        f = funds_map.get(h["fund_id"], {})
        cur = h["units"] * f.get("nav", 0)
        enriched.append({**h, "fund_name": f.get("name", ""), "current_value": round(cur, 2), "pnl": round(cur - h["invested"], 2)})
    sips = await db.sips.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    for s in sips:
        s["fund_name"] = funds_map.get(s["fund_id"], {}).get("name", "")
    txns = await db.transactions.find({"user_id": user_id}, {"_id": 0}).sort("date", -1).limit(20).to_list(20)
    for t in txns:
        t["fund_name"] = funds_map.get(t["fund_id"], {}).get("name", "")
    kyc = await db.kyc.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": u, "holdings": enriched, "sips": sips, "transactions": txns, "kyc": kyc}


@api.patch("/admin/users/{user_id}/status")
async def admin_update_user_status(user_id: str, payload: UserStatusIn, admin: dict = Depends(require_admin)):
    if payload.status not in ("active", "suspended"):
        raise HTTPException(status_code=400, detail="Invalid status")
    res = await db.users.update_one({"id": user_id, "role": "investor"}, {"$set": {"status": payload.status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await log_audit(admin, f"user.{payload.status}", target=user_id)
    return {"ok": True, "status": payload.status}


# Fund CRUD
@api.post("/admin/funds")
async def admin_create_fund(payload: FundIn, admin: dict = Depends(require_admin)):
    fid = payload.id or f"MF{int(datetime.now(timezone.utc).timestamp()) % 100000:05d}"
    if await db.funds.find_one({"id": fid}):
        raise HTTPException(status_code=400, detail="Fund ID already exists")
    doc = payload.model_dump()
    doc["id"] = fid
    if doc.get("upfront_pct") is None or doc.get("trail_pct") is None:
        defaults = default_commission_for(doc.get("category", ""))
        doc.setdefault("upfront_pct", defaults["upfront_pct"])
        doc.setdefault("trail_pct", defaults["trail_pct"])
    await db.funds.insert_one(doc)
    await log_audit(admin, "fund.create", target=fid, details={"name": payload.name})
    return {"ok": True, "id": fid}


@api.put("/admin/funds/{fund_id}")
async def admin_update_fund(fund_id: str, payload: FundIn, admin: dict = Depends(require_admin)):
    doc = payload.model_dump(exclude={"id"})
    res = await db.funds.update_one({"id": fund_id}, {"$set": doc})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fund not found")
    await log_audit(admin, "fund.update", target=fund_id, details={"name": payload.name})
    return {"ok": True}


@api.delete("/admin/funds/{fund_id}")
async def admin_delete_fund(fund_id: str, admin: dict = Depends(require_admin)):
    in_use = await db.holdings.count_documents({"fund_id": fund_id})
    if in_use:
        raise HTTPException(status_code=400, detail=f"Cannot delete — {in_use} active holding(s) reference this fund")
    await db.funds.delete_one({"id": fund_id})
    await log_audit(admin, "fund.delete", target=fund_id)
    return {"ok": True}


@api.get("/admin/transactions")
async def admin_transactions(limit: int = 100, admin: dict = Depends(require_admin)):
    txns = await db.transactions.find({}, {"_id": 0}).sort("date", -1).to_list(limit)
    funds_map = {f["id"]: f async for f in db.funds.find({}, {"_id": 0})}
    users_map = {u["id"]: u async for u in db.users.find({}, {"_id": 0, "password_hash": 0})}
    for t in txns:
        t["fund_name"] = funds_map.get(t["fund_id"], {}).get("name", "")
        u = users_map.get(t["user_id"], {})
        t["user_name"] = u.get("name", "")
        t["user_email"] = u.get("email", "")
    return txns


@api.get("/admin/kyc")
async def admin_kyc_list(admin: dict = Depends(require_admin)):
    kycs = await db.kyc.find({}, {"_id": 0}).to_list(500)
    users_map = {u["id"]: u async for u in db.users.find({"role": "investor"}, {"_id": 0, "password_hash": 0})}
    out = []
    for k in kycs:
        u = users_map.get(k["user_id"])
        if u:
            out.append({**k, "user_name": u.get("name", ""), "user_email": u.get("email", "")})
    return sorted(out, key=lambda x: x.get("status") == "Completed")


@api.post("/admin/kyc/{user_id}/approve")
async def admin_kyc_approve(user_id: str, admin: dict = Depends(require_admin)):
    await db.kyc.update_one(
        {"user_id": user_id},
        {"$set": {
            "pan_verified": True, "aadhaar_verified": True, "bank_verified": True, "address_verified": True,
            "status": "Completed", "approved_by": admin["email"], "approved_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    await log_audit(admin, "kyc.approve", target=user_id)
    return {"ok": True}


@api.post("/admin/notifications/broadcast")
async def admin_broadcast(payload: BroadcastIn, admin: dict = Depends(require_admin)):
    targets = []
    if payload.user_id:
        targets = [payload.user_id]
    else:
        async for u in db.users.find({"role": "investor"}, {"_id": 0, "id": 1}):
            targets.append(u["id"])
    now = datetime.now(timezone.utc).isoformat()
    docs = [{
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "type": "broadcast",
        "title": payload.title,
        "body": payload.body,
        "icon": payload.icon or "sparkles",
        "read": False,
        "created_at": now,
    } for uid in targets]
    if docs:
        await db.notifications.insert_many(docs)
    await log_audit(admin, "broadcast.send", target=payload.user_id or "all", details={"title": payload.title, "recipients": len(docs)})
    return {"ok": True, "sent": len(docs)}


# -------- Risk Heatmap --------
@api.get("/admin/risk-heatmap")
async def admin_risk_heatmap(admin: dict = Depends(require_admin)):
    holdings = await db.holdings.find({}, {"_id": 0}).to_list(20000)
    funds_map = {f["id"]: f async for f in db.funds.find({}, {"_id": 0})}

    categories_order = ["Large Cap", "Mid Cap", "Small Cap", "Flexi Cap", "Large & Mid Cap", "ELSS", "Index", "Hybrid", "Debt"]
    risks_order = ["Low", "Moderate", "High"]

    grid: dict[str, dict[str, float]] = {c: {r: 0.0 for r in risks_order} for c in categories_order}
    total_aum = 0.0

    for h in holdings:
        f = funds_map.get(h["fund_id"])
        if not f:
            continue
        cat = f.get("category", "")
        risk = f.get("risk", "")
        if cat in grid and risk in grid[cat]:
            val = h["units"] * f["nav"]
            grid[cat][risk] += val
            total_aum += val

    # Flatten to rows for the frontend
    rows = []
    max_val = 0.0
    for c in categories_order:
        row = {"category": c, "cells": []}
        for r in risks_order:
            v = grid[c][r]
            row["cells"].append({"risk": r, "aum": round(v, 2), "pct": round((v / total_aum * 100) if total_aum else 0, 2)})
            if v > max_val:
                max_val = v
        rows.append(row)

    # Concentration warnings (>40% in one cell)
    warnings = []
    for c in categories_order:
        for r in risks_order:
            v = grid[c][r]
            pct = (v / total_aum * 100) if total_aum else 0
            if pct >= 40:
                warnings.append({"category": c, "risk": r, "pct": round(pct, 1)})

    return {
        "total_aum": round(total_aum, 2),
        "max_cell": round(max_val, 2),
        "risks": risks_order,
        "rows": rows,
        "warnings": warnings,
    }


# -------- Commission / Portfolio Manager Earnings --------
def _commission_for_fund(fund: dict) -> dict:
    """Return commission % for a fund, falling back to category defaults."""
    if fund.get("upfront_pct") is not None and fund.get("trail_pct") is not None:
        return {"upfront_pct": fund["upfront_pct"], "trail_pct": fund["trail_pct"]}
    return default_commission_for(fund.get("category", ""))


async def _build_commission_dataset():
    """Compute per-fund commission earnings used by both summary and breakdown endpoints."""
    funds_map = {f["id"]: f async for f in db.funds.find({}, {"_id": 0})}
    holdings = await db.holdings.find({}, {"_id": 0}).to_list(100000)
    txns = await db.transactions.find({}, {"_id": 0}).sort("date", 1).to_list(100000)

    now = datetime.now(timezone.utc)
    today_iso = now.strftime("%Y-%m-%d")

    per_fund = {}
    for fid, f in funds_map.items():
        rates = _commission_for_fund(f)
        per_fund[fid] = {
            "fund_id": fid,
            "name": f.get("name", ""),
            "category": f.get("category", ""),
            "amc": f.get("amc", ""),
            "upfront_pct": rates["upfront_pct"],
            "trail_pct": rates["trail_pct"],
            "aum": 0.0,
            "invested": 0.0,
            "upfront_earned": 0.0,
            "trail_earned": 0.0,
            "annual_trail_runrate": 0.0,
            "monthly_trail_runrate": 0.0,
            "investors": 0,
            "txn_count": 0,
        }

    # AUM & invested per fund
    investor_set_per_fund = {}
    for h in holdings:
        fid = h["fund_id"]
        f = funds_map.get(fid)
        if not f or fid not in per_fund:
            continue
        per_fund[fid]["aum"] += h["units"] * f["nav"]
        per_fund[fid]["invested"] += h.get("invested", 0)
        investor_set_per_fund.setdefault(fid, set()).add(h["user_id"])

    for fid, users in investor_set_per_fund.items():
        per_fund[fid]["investors"] = len(users)

    # Upfront commission from every transaction
    for t in txns:
        fid = t.get("fund_id")
        if fid not in per_fund:
            continue
        per_fund[fid]["txn_count"] += 1
        rate = per_fund[fid]["upfront_pct"] / 100.0
        per_fund[fid]["upfront_earned"] += float(t.get("amount", 0)) * rate

    # Trail earned: approximate by AUM and weighted holding age
    # We estimate average days held per fund using earliest transaction date.
    earliest_per_fund = {}
    for t in txns:
        fid = t.get("fund_id")
        d = t.get("date")
        if not fid or not d:
            continue
        if fid not in earliest_per_fund or d < earliest_per_fund[fid]:
            earliest_per_fund[fid] = d

    for fid, row in per_fund.items():
        # Annualised run-rate trail (what manager earns going forward per year at current AUM)
        row["annual_trail_runrate"] = row["aum"] * (row["trail_pct"] / 100.0)
        row["monthly_trail_runrate"] = row["annual_trail_runrate"] / 12.0

        # Lifetime trail earned (pro-rated by days held since first investment in that fund)
        first = earliest_per_fund.get(fid)
        days_held = 0
        if first:
            try:
                d0 = datetime.strptime(first, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                days_held = max((now - d0).days, 0)
            except ValueError:
                days_held = 0
        row["trail_earned"] = row["aum"] * (row["trail_pct"] / 100.0) * (days_held / 365.0)
        row["total_earned"] = row["upfront_earned"] + row["trail_earned"]

    return {
        "funds_map": funds_map,
        "per_fund": per_fund,
        "txns": txns,
        "holdings": holdings,
        "today_iso": today_iso,
    }


@api.get("/admin/commission/summary")
async def admin_commission_summary(admin: dict = Depends(require_admin)):
    ds = await _build_commission_dataset()
    per_fund = ds["per_fund"]
    txns = ds["txns"]

    total_aum = sum(r["aum"] for r in per_fund.values())
    total_upfront = sum(r["upfront_earned"] for r in per_fund.values())
    total_trail = sum(r["trail_earned"] for r in per_fund.values())
    annual_runrate = sum(r["annual_trail_runrate"] for r in per_fund.values())
    monthly_runrate = annual_runrate / 12.0

    # Current month-to-date upfront from transactions
    now = datetime.now(timezone.utc)
    mtd_prefix = now.strftime("%Y-%m")
    ytd_prefix = now.strftime("%Y")
    mtd_upfront = 0.0
    ytd_upfront = 0.0
    for t in txns:
        fid = t.get("fund_id")
        if fid not in per_fund:
            continue
        rate = per_fund[fid]["upfront_pct"] / 100.0
        amt = float(t.get("amount", 0)) * rate
        d = t.get("date") or ""
        if d.startswith(mtd_prefix):
            mtd_upfront += amt
        if d.startswith(ytd_prefix):
            ytd_upfront += amt

    # Add prorated trail for MTD & YTD (1/12 and N/12 of annual at current AUM)
    day_of_month = now.day
    days_in_month = 30
    mtd_trail = monthly_runrate * (day_of_month / days_in_month)
    ytd_trail = annual_runrate * (now.timetuple().tm_yday / 365.0)

    # Monthly earnings trend, last 12 months (use proper calendar arithmetic)
    trend = []
    cur_y, cur_m = now.year, now.month
    for i in range(11, -1, -1):
        total = cur_y * 12 + (cur_m - 1) - i
        y, m = divmod(total, 12)
        m += 1
        prefix = f"{y:04d}-{m:02d}"
        label = datetime(y, m, 1).strftime("%b %y")
        upfront_m = 0.0
        for t in txns:
            fid = t.get("fund_id")
            if fid not in per_fund:
                continue
            d = t.get("date") or ""
            if d.startswith(prefix):
                upfront_m += float(t.get("amount", 0)) * (per_fund[fid]["upfront_pct"] / 100.0)
        trail_m = monthly_runrate  # approximate constant trail
        trend.append({
            "month": label,
            "upfront": round(upfront_m, 2),
            "trail": round(trail_m, 2),
            "total": round(upfront_m + trail_m, 2),
        })

    # Top funds by earnings
    top_funds = sorted(per_fund.values(), key=lambda r: r["total_earned"], reverse=True)[:5]
    top_funds = [{
        "fund_id": r["fund_id"],
        "name": r["name"],
        "category": r["category"],
        "total_earned": round(r["total_earned"], 2),
        "aum": round(r["aum"], 2),
    } for r in top_funds]

    return {
        "totals": {
            "aum": round(total_aum, 2),
            "lifetime_earned": round(total_upfront + total_trail, 2),
            "lifetime_upfront": round(total_upfront, 2),
            "lifetime_trail": round(total_trail, 2),
            "mtd_earned": round(mtd_upfront + mtd_trail, 2),
            "ytd_earned": round(ytd_upfront + ytd_trail, 2),
            "annual_runrate": round(annual_runrate, 2),
            "monthly_runrate": round(monthly_runrate, 2),
        },
        "trend": trend,
        "top_funds": top_funds,
        "manager": {
            "name": admin.get("name", "Portfolio Manager"),
            "email": admin.get("email", ""),
            "role": "Portfolio Manager / Distributor",
        },
    }


@api.get("/admin/commission/funds")
async def admin_commission_funds(admin: dict = Depends(require_admin)):
    ds = await _build_commission_dataset()
    rows = []
    for r in ds["per_fund"].values():
        rows.append({
            "fund_id": r["fund_id"],
            "name": r["name"],
            "category": r["category"],
            "amc": r["amc"],
            "upfront_pct": round(r["upfront_pct"], 3),
            "trail_pct": round(r["trail_pct"], 3),
            "aum": round(r["aum"], 2),
            "invested": round(r["invested"], 2),
            "upfront_earned": round(r["upfront_earned"], 2),
            "trail_earned": round(r["trail_earned"], 2),
            "total_earned": round(r["upfront_earned"] + r["trail_earned"], 2),
            "annual_trail_runrate": round(r["annual_trail_runrate"], 2),
            "monthly_trail_runrate": round(r["monthly_trail_runrate"], 2),
            "investors": r["investors"],
            "txn_count": r["txn_count"],
        })
    rows.sort(key=lambda x: x["total_earned"], reverse=True)
    return rows


@api.get("/admin/commission/investors")
async def admin_commission_investors(admin: dict = Depends(require_admin)):
    ds = await _build_commission_dataset()
    per_fund = ds["per_fund"]
    funds_map = ds["funds_map"]
    holdings = ds["holdings"]
    txns = ds["txns"]

    # Aggregate per investor
    investor = {}
    for h in holdings:
        uid = h["user_id"]
        fid = h["fund_id"]
        f = funds_map.get(fid)
        rates = per_fund.get(fid)
        if not f or not rates:
            continue
        bucket = investor.setdefault(uid, {"user_id": uid, "aum": 0.0, "invested": 0.0, "upfront_earned": 0.0, "trail_earned": 0.0, "annual_trail": 0.0})
        cur_value = h["units"] * f["nav"]
        bucket["aum"] += cur_value
        bucket["invested"] += h.get("invested", 0)
        bucket["annual_trail"] += cur_value * (rates["trail_pct"] / 100.0)

    for t in txns:
        uid = t.get("user_id")
        fid = t.get("fund_id")
        if uid not in investor or fid not in per_fund:
            continue
        investor[uid]["upfront_earned"] += float(t.get("amount", 0)) * (per_fund[fid]["upfront_pct"] / 100.0)

    # Approximate trail earned by 1 year for the manager dashboard simplicity
    for r in investor.values():
        r["trail_earned"] = r["annual_trail"]  # last 12 month approximation
        r["total_earned"] = r["upfront_earned"] + r["trail_earned"]

    user_ids = list(investor.keys())
    users = {}
    if user_ids:
        async for u in db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1, "email": 1}):
            users[u["id"]] = u

    rows = []
    for uid, r in investor.items():
        u = users.get(uid, {})
        rows.append({
            "user_id": uid,
            "name": u.get("name", "—"),
            "email": u.get("email", ""),
            "aum": round(r["aum"], 2),
            "invested": round(r["invested"], 2),
            "upfront_earned": round(r["upfront_earned"], 2),
            "trail_earned": round(r["trail_earned"], 2),
            "total_earned": round(r["total_earned"], 2),
            "annual_trail": round(r["annual_trail"], 2),
        })
    rows.sort(key=lambda x: x["total_earned"], reverse=True)
    return rows


@api.patch("/admin/funds/{fund_id}/commission")
async def admin_update_fund_commission(fund_id: str, payload: CommissionIn, admin: dict = Depends(require_admin)):
    if payload.upfront_pct < 0 or payload.upfront_pct > 5:
        raise HTTPException(status_code=400, detail="upfront_pct must be between 0 and 5")
    if payload.trail_pct < 0 or payload.trail_pct > 5:
        raise HTTPException(status_code=400, detail="trail_pct must be between 0 and 5")
    res = await db.funds.update_one(
        {"id": fund_id},
        {"$set": {"upfront_pct": payload.upfront_pct, "trail_pct": payload.trail_pct}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fund not found")
    await log_audit(admin, "fund.commission.update", target=fund_id, details={
        "upfront_pct": payload.upfront_pct, "trail_pct": payload.trail_pct,
    })
    return {"ok": True, "upfront_pct": payload.upfront_pct, "trail_pct": payload.trail_pct}


# -------- Audit Log --------
@api.get("/admin/audit")
async def admin_audit_log(limit: int = 200, admin: dict = Depends(require_admin)):
    entries = await db.audit_log.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)

    # Enrich with target name when possible
    user_ids = [e["target"] for e in entries if e.get("action", "").startswith(("user.", "kyc."))]
    users_map = {}
    if user_ids:
        async for u in db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1, "email": 1}):
            users_map[u["id"]] = u

    for e in entries:
        if e.get("action", "").startswith(("user.", "kyc.")) and e.get("target") in users_map:
            u = users_map[e["target"]]
            e["target_name"] = u.get("name", "")
            e["target_email"] = u.get("email", "")
    return entries


# -------- Market Ticker (mock SENSEX/NIFTY) --------
@api.get("/market/ticker")
async def market_ticker():
    # Deterministic-ish jitter so values change slowly each call
    seed_min = int(datetime.now(timezone.utc).timestamp()) // 60
    rng = random.Random(seed_min)
    return [
        {"symbol": "SENSEX", "value": round(80142.45 + rng.uniform(-200, 200), 2), "change_pct": round(rng.uniform(-0.6, 0.9), 2)},
        {"symbol": "NIFTY 50", "value": round(24350.10 + rng.uniform(-80, 80), 2), "change_pct": round(rng.uniform(-0.6, 0.9), 2)},
        {"symbol": "BANK NIFTY", "value": round(52480.30 + rng.uniform(-150, 150), 2), "change_pct": round(rng.uniform(-0.7, 1.1), 2)},
        {"symbol": "USD/INR", "value": round(83.42 + rng.uniform(-0.15, 0.15), 2), "change_pct": round(rng.uniform(-0.3, 0.3), 2)},
    ]


# -------- Health --------
@api.get("/")
async def root():
    return {"status": "ok", "service": "Shobhit Capital API"}


app.include_router(api)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown():
    client.close()
