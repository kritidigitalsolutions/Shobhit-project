"""Tests for iteration 2 new endpoints: goals, tax, reports, insights, compare, notifications, referrals, advisor."""
import os
import uuid
import time
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE:
    import dotenv
    dotenv.load_dotenv("/app/frontend/.env")
    BASE = os.environ.get("REACT_APP_BACKEND_URL")
BASE = BASE.rstrip("/")
API = f"{BASE}/api"

DEMO = {"email": "demo@shobhitcapital.com", "password": "Demo@1234"}


@pytest.fixture(scope="session")
def auth():
    r = requests.post(f"{API}/auth/login", json=DEMO, timeout=30)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


# ----- Goals -----
class TestGoals:
    def test_list_goals(self, auth):
        r = requests.get(f"{API}/goals", headers=auth, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_goal_and_persist(self, auth):
        payload = {
            "name": f"TEST_Goal_{uuid.uuid4().hex[:6]}",
            "target_amount": 500000,
            "target_date": "2030-01-01",
            "current_amount": 25000,
        }
        r = requests.post(f"{API}/goals", json=payload, headers=auth, timeout=15)
        assert r.status_code == 200, r.text
        gid = r.json()["id"]
        # Verify in list with progress_pct
        listed = requests.get(f"{API}/goals", headers=auth, timeout=15).json()
        match = [g for g in listed if g["id"] == gid]
        assert len(match) == 1
        g = match[0]
        assert g["name"] == payload["name"]
        assert g["target_amount"] == 500000
        assert "progress_pct" in g
        assert abs(g["progress_pct"] - 5.0) < 0.1
        # Delete
        d = requests.delete(f"{API}/goals/{gid}", headers=auth, timeout=15)
        assert d.status_code == 200
        listed2 = requests.get(f"{API}/goals", headers=auth, timeout=15).json()
        assert all(x["id"] != gid for x in listed2)


# ----- Tax Center -----
class TestTax:
    def test_tax_summary(self, auth):
        r = requests.get(f"{API}/tax", headers=auth, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "summary" in d and "recommendations" in d
        s = d["summary"]
        for k in ("elss_invested", "section_80c_limit", "section_80c_pct",
                  "estimated_tax_saving", "total_invested", "unrealized_gains"):
            assert k in s, f"missing {k}"
        assert s["section_80c_limit"] == 150000
        assert len(d["recommendations"]) == 3
        for rec in d["recommendations"]:
            assert "id" in rec and "name" in rec


# ----- Reports -----
class TestReports:
    def test_statement(self, auth):
        r = requests.get(f"{API}/reports/statement", headers=auth, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "user" in d and "rows" in d and "total_invested" in d
        assert d["user"]["email"] == DEMO["email"]
        assert len(d["rows"]) >= 1
        # rows should have running_balance and ascending
        balances = [row["running_balance"] for row in d["rows"]]
        assert balances == sorted(balances)

    def test_pnl(self, auth):
        r = requests.get(f"{API}/reports/pnl", headers=auth, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_invested", "total_current", "total_pnl", "rows"):
            assert k in d
        assert len(d["rows"]) >= 1
        for row in d["rows"]:
            assert "holding_type" in row
            assert row["holding_type"] in ("Long Term", "Short Term")


# ----- Insights -----
class TestInsights:
    def test_insights(self, auth):
        r = requests.get(f"{API}/insights", headers=auth, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert len(items) == 6
        # Relevant items must come first
        rels = [bool(i["relevant"]) for i in items]
        # Once we see False, no more True
        seen_false = False
        for v in rels:
            if not v:
                seen_false = True
            elif seen_false and v:
                pytest.fail("Items not sorted with relevant first")


# ----- Compare -----
class TestCompare:
    def test_compare_three(self, auth):
        r = requests.get(f"{API}/compare?ids=MF001,MF003,MF005", headers=auth, timeout=20)
        assert r.status_code == 200
        funds = r.json()
        assert len(funds) == 3
        ids = [f["id"] for f in funds]
        assert set(ids) == {"MF001", "MF003", "MF005"}
        for f in funds:
            assert "nav_history" in f and len(f["nav_history"]) == 365


# ----- Notifications -----
class TestNotifications:
    def test_list_seeds_five(self, auth):
        r = requests.get(f"{API}/notifications", headers=auth, timeout=15)
        assert r.status_code == 200
        notifs = r.json()
        assert len(notifs) >= 5
        for n in notifs:
            assert "id" in n and "read" in n and "title" in n

    def test_mark_read(self, auth):
        notifs = requests.get(f"{API}/notifications", headers=auth, timeout=15).json()
        # mark all unread first via single
        target = notifs[0]
        r = requests.post(f"{API}/notifications/{target['id']}/read", headers=auth, timeout=15)
        assert r.status_code == 200
        # Read all
        r2 = requests.post(f"{API}/notifications/read-all", headers=auth, timeout=15)
        assert r2.status_code == 200
        notifs2 = requests.get(f"{API}/notifications", headers=auth, timeout=15).json()
        assert all(n["read"] is True for n in notifs2)


# ----- Referrals -----
class TestReferrals:
    def test_referrals(self, auth):
        r = requests.get(f"{API}/referrals", headers=auth, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("code", "share_url", "referred_count", "rewards_earned", "tiers"):
            assert k in d
        assert d["code"].startswith("SHOBHIT")
        assert len(d["tiers"]) == 3


# ----- AI Advisor -----
class TestAdvisor:
    def test_chat_flow(self, auth):
        # AI may take up to 30s
        r = requests.post(
            f"{API}/advisor/chat",
            json={"message": "Hello, summarize my portfolio briefly."},
            headers=auth,
            timeout=60,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "session_id" in d and "reply" in d
        assert isinstance(d["reply"], str) and len(d["reply"]) > 0
        sid = d["session_id"]
        # Get session history
        r2 = requests.get(f"{API}/advisor/sessions/{sid}", headers=auth, timeout=15)
        assert r2.status_code == 200
        msgs = r2.json()
        assert len(msgs) >= 2  # user + assistant
        roles = [m["role"] for m in msgs]
        assert "user" in roles and "assistant" in roles
