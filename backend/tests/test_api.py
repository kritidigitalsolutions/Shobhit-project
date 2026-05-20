import os, uuid, pytest, requests

BASE = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE:
    import dotenv; dotenv.load_dotenv("/app/frontend/.env")
    BASE = os.environ.get("REACT_APP_BACKEND_URL")
BASE = BASE.rstrip("/")
API = f"{BASE}/api"

DEMO = {"email": "demo@shobhitcapital.com", "password": "Demo@1234"}


@pytest.fixture(scope="session")
def demo_token():
    r = requests.post(f"{API}/auth/login", json=DEMO, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


def test_health():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_login_invalid():
    r = requests.post(f"{API}/auth/login", json={"email": "demo@shobhitcapital.com", "password": "wrong"}, timeout=15)
    assert r.status_code == 401


def test_register_new():
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"name": "T", "email": email, "password": "Pwd@1234"}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["token"] and data["user"]["email"] == email


def test_me(auth):
    r = requests.get(f"{API}/auth/me", headers=auth, timeout=15)
    assert r.status_code == 200
    assert r.json()["email"] == DEMO["email"]


def test_me_unauth():
    r = requests.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 401


def test_funds_list():
    r = requests.get(f"{API}/funds", timeout=15)
    assert r.status_code == 200
    funds = r.json()
    assert len(funds) == 12
    assert all("nav" in f and "_id" not in f for f in funds)


def test_funds_filter():
    r = requests.get(f"{API}/funds", params={"category": "Small Cap"}, timeout=15)
    assert r.status_code == 200
    assert all(f["category"] == "Small Cap" for f in r.json())
    r2 = requests.get(f"{API}/funds", params={"q": "axis"}, timeout=15)
    assert r2.status_code == 200
    assert len(r2.json()) >= 1


def test_fund_detail():
    r = requests.get(f"{API}/funds/MF003", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert len(d["nav_history"]) == 365
    assert len(d["top_holdings"]) >= 1
    # final point equals current nav
    assert abs(d["nav_history"][-1]["nav"] - d["nav"]) < 0.01


def test_fund_not_found():
    r = requests.get(f"{API}/funds/INVALID", timeout=15)
    assert r.status_code == 404


def test_portfolio(auth):
    r = requests.get(f"{API}/portfolio", headers=auth, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert "summary" in d and "holdings" in d
    s = d["summary"]
    for k in ("invested", "current_value", "pnl", "pnl_pct", "allocation"):
        assert k in s
    assert len(d["holdings"]) >= 5
    assert isinstance(s["allocation"], list) and len(s["allocation"]) > 0


def test_invest_and_persist(auth):
    r = requests.post(f"{API}/portfolio/invest", json={"fund_id": "MF001", "amount": 6000}, headers=auth, timeout=15)
    assert r.status_code == 200, r.text
    # min validation
    r2 = requests.post(f"{API}/portfolio/invest", json={"fund_id": "MF001", "amount": 10}, headers=auth, timeout=15)
    assert r2.status_code == 400
    # txn recorded
    tx = requests.get(f"{API}/transactions", headers=auth, timeout=15).json()
    assert any(t["fund_id"] == "MF001" and t["type"] == "Lumpsum" for t in tx)


def test_sips_list(auth):
    r = requests.get(f"{API}/sips", headers=auth, timeout=15)
    assert r.status_code == 200
    sips = r.json()
    assert len(sips) >= 3
    assert all("fund_name" in s for s in sips)


def test_sip_create_and_actions(auth):
    r = requests.post(f"{API}/sips", json={"fund_id": "MF003", "amount": 1500, "frequency": "monthly"}, headers=auth, timeout=15)
    assert r.status_code == 200
    sid = r.json()["id"]
    # min sip validation (MF003 min_sip=1000)
    r_bad = requests.post(f"{API}/sips", json={"fund_id": "MF003", "amount": 100}, headers=auth, timeout=15)
    assert r_bad.status_code == 400
    for act, expected in [("pause", "paused"), ("resume", "active"), ("stop", "stopped")]:
        r2 = requests.patch(f"{API}/sips/{sid}?action={act}", headers=auth, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["status"] == expected
    r_bad2 = requests.patch(f"{API}/sips/{sid}?action=invalid", headers=auth, timeout=15)
    assert r_bad2.status_code == 400


def test_transactions_sorted(auth):
    r = requests.get(f"{API}/transactions", headers=auth, timeout=15)
    assert r.status_code == 200
    txns = r.json()
    assert len(txns) >= 1
    dates = [t["date"] for t in txns]
    assert dates == sorted(dates, reverse=True)


def test_watchlist_flow(auth):
    # add
    r = requests.post(f"{API}/watchlist", json={"fund_id": "MF007"}, headers=auth, timeout=15)
    assert r.status_code == 200
    r2 = requests.get(f"{API}/watchlist", headers=auth, timeout=15)
    assert r2.status_code == 200
    ids = [f["id"] for f in r2.json()]
    assert "MF007" in ids
    # delete
    r3 = requests.delete(f"{API}/watchlist/MF007", headers=auth, timeout=15)
    assert r3.status_code == 200
    r4 = requests.get(f"{API}/watchlist", headers=auth, timeout=15).json()
    assert "MF007" not in [f["id"] for f in r4]


def test_kyc_get_and_update(auth):
    r = requests.get(f"{API}/kyc", headers=auth, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert "status" in body
    # update address -> should set address_verified True and status Completed (others already true)
    r2 = requests.put(f"{API}/kyc", json={"address": "New Delhi, India"}, headers=auth, timeout=15)
    assert r2.status_code == 200
    d = r2.json()
    assert d["address_verified"] is True
    assert d["address"] == "New Delhi, India"
