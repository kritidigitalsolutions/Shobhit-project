"""Tests for Portfolio Manager / Distributor commission module (iteration 3).

Endpoints covered:
- GET  /api/admin/commission/summary
- GET  /api/admin/commission/funds
- GET  /api/admin/commission/investors
- PATCH /api/admin/funds/{fund_id}/commission
- GET  /api/admin/audit (verify audit log entry on commission update)
"""
import os
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE:
    import dotenv
    dotenv.load_dotenv("/app/frontend/.env")
    BASE = os.environ.get("REACT_APP_BACKEND_URL")
BASE = BASE.rstrip("/")
API = f"{BASE}/api"

ADMIN = {"email": "admin@shobhitcapital.com", "password": "Admin@1234"}
DEMO = {"email": "demo@shobhitcapital.com", "password": "Demo@1234"}


@pytest.fixture(scope="session")
def admin_auth():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="session")
def demo_auth():
    r = requests.post(f"{API}/auth/login", json=DEMO, timeout=30)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


# ----- Summary -----
class TestCommissionSummary:
    def test_summary_admin_keys(self, admin_auth):
        r = requests.get(f"{API}/admin/commission/summary", headers=admin_auth, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        # totals
        assert "totals" in d
        t = d["totals"]
        for k in ("aum", "lifetime_earned", "lifetime_upfront", "lifetime_trail",
                  "mtd_earned", "ytd_earned", "annual_runrate", "monthly_runrate"):
            assert k in t, f"missing totals.{k}"
            assert isinstance(t[k], (int, float))
        # trend 12 items
        assert "trend" in d
        assert len(d["trend"]) == 12
        for item in d["trend"]:
            for k in ("month", "upfront", "trail", "total"):
                assert k in item
        # top_funds <= 5
        assert "top_funds" in d
        assert len(d["top_funds"]) <= 5
        # manager
        assert "manager" in d
        m = d["manager"]
        for k in ("name", "email", "role"):
            assert k in m
        assert m["email"] == ADMIN["email"]

    def test_summary_aum_positive(self, admin_auth):
        d = requests.get(f"{API}/admin/commission/summary", headers=admin_auth, timeout=20).json()
        assert d["totals"]["aum"] > 0, "AUM should be > 0 with seeded demo holdings"
        assert d["totals"]["lifetime_earned"] > 0
        # annual_runrate should equal sum(aum * trail_pct/100) approx; sanity bound
        assert d["totals"]["annual_runrate"] > 0
        assert abs(d["totals"]["monthly_runrate"] * 12 - d["totals"]["annual_runrate"]) < 1.0

    def test_summary_non_admin_forbidden(self, demo_auth):
        r = requests.get(f"{API}/admin/commission/summary", headers=demo_auth, timeout=15)
        assert r.status_code == 403, f"expected 403, got {r.status_code}"

    def test_summary_unauth(self):
        r = requests.get(f"{API}/admin/commission/summary", timeout=15)
        assert r.status_code == 401


# ----- Funds breakdown -----
class TestCommissionFunds:
    def test_funds_breakdown(self, admin_auth):
        r = requests.get(f"{API}/admin/commission/funds", headers=admin_auth, timeout=20)
        assert r.status_code == 200, r.text
        rows = r.json()
        assert isinstance(rows, list)
        # spec says 15 funds
        assert len(rows) == 15, f"expected 15 funds, got {len(rows)}"
        required = {"fund_id", "name", "category", "upfront_pct", "trail_pct",
                    "aum", "invested", "upfront_earned", "trail_earned",
                    "total_earned", "annual_trail_runrate", "monthly_trail_runrate",
                    "investors", "txn_count"}
        for r0 in rows:
            missing = required - set(r0.keys())
            assert not missing, f"row missing keys: {missing}"
        # sorted by total_earned desc
        totals = [r0["total_earned"] for r0 in rows]
        assert totals == sorted(totals, reverse=True), "rows not sorted by total_earned desc"

    def test_funds_non_admin_forbidden(self, demo_auth):
        r = requests.get(f"{API}/admin/commission/funds", headers=demo_auth, timeout=15)
        assert r.status_code == 403

    def test_math_sanity_annual_trail(self, admin_auth):
        rows = requests.get(f"{API}/admin/commission/funds", headers=admin_auth, timeout=20).json()
        for r0 in rows:
            expected = r0["aum"] * r0["trail_pct"] / 100.0
            assert abs(r0["annual_trail_runrate"] - expected) < 0.5, (
                f"fund {r0['fund_id']}: annual_trail_runrate={r0['annual_trail_runrate']} expected~{expected}"
            )


# ----- Investors -----
class TestCommissionInvestors:
    def test_investors_list(self, admin_auth):
        r = requests.get(f"{API}/admin/commission/investors", headers=admin_auth, timeout=20)
        assert r.status_code == 200, r.text
        rows = r.json()
        assert isinstance(rows, list) and len(rows) >= 1
        keys = {"user_id", "name", "email", "aum", "invested",
                "upfront_earned", "trail_earned", "total_earned", "annual_trail"}
        for r0 in rows:
            missing = keys - set(r0.keys())
            assert not missing, f"investor row missing keys: {missing}"
        # Demo Amit Jain should be present
        emails = [r0["email"] for r0 in rows]
        assert DEMO["email"] in emails, f"demo investor missing from list: {emails}"
        # Find demo investor and ensure positive aum
        demo_row = [r0 for r0 in rows if r0["email"] == DEMO["email"]][0]
        assert demo_row["aum"] > 0
        assert demo_row["total_earned"] > 0

    def test_investors_non_admin_forbidden(self, demo_auth):
        r = requests.get(f"{API}/admin/commission/investors", headers=demo_auth, timeout=15)
        assert r.status_code == 403


# ----- PATCH fund commission -----
class TestPatchCommission:
    def test_patch_success_and_reflects(self, admin_auth):
        # pick first fund
        rows = requests.get(f"{API}/admin/commission/funds", headers=admin_auth, timeout=20).json()
        target = rows[0]
        fid = target["fund_id"]
        original = {"upfront_pct": target["upfront_pct"], "trail_pct": target["trail_pct"]}
        try:
            new = {"upfront_pct": 1.5, "trail_pct": 1.2}
            r = requests.patch(
                f"{API}/admin/funds/{fid}/commission", json=new,
                headers=admin_auth, timeout=15,
            )
            assert r.status_code == 200, r.text
            d = r.json()
            assert d.get("ok") is True
            assert abs(d["upfront_pct"] - 1.5) < 0.001
            assert abs(d["trail_pct"] - 1.2) < 0.001
            # Re-fetch funds and check the new pcts surface
            rows2 = requests.get(f"{API}/admin/commission/funds", headers=admin_auth, timeout=20).json()
            updated = [x for x in rows2 if x["fund_id"] == fid][0]
            assert abs(updated["upfront_pct"] - 1.5) < 0.001
            assert abs(updated["trail_pct"] - 1.2) < 0.001
            # annual_trail_runrate should be aum * 1.2 / 100
            assert abs(updated["annual_trail_runrate"] - updated["aum"] * 1.2 / 100.0) < 0.5
        finally:
            # restore
            requests.patch(
                f"{API}/admin/funds/{fid}/commission",
                json=original, headers=admin_auth, timeout=15,
            )

    def test_patch_out_of_range_negative(self, admin_auth):
        rows = requests.get(f"{API}/admin/commission/funds", headers=admin_auth, timeout=20).json()
        fid = rows[0]["fund_id"]
        r = requests.patch(
            f"{API}/admin/funds/{fid}/commission",
            json={"upfront_pct": -1, "trail_pct": 1.0}, headers=admin_auth, timeout=15,
        )
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text}"

    def test_patch_out_of_range_high(self, admin_auth):
        rows = requests.get(f"{API}/admin/commission/funds", headers=admin_auth, timeout=20).json()
        fid = rows[0]["fund_id"]
        r = requests.patch(
            f"{API}/admin/funds/{fid}/commission",
            json={"upfront_pct": 10, "trail_pct": 1.0}, headers=admin_auth, timeout=15,
        )
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text}"

    def test_patch_unknown_fund(self, admin_auth):
        r = requests.patch(
            f"{API}/admin/funds/NOPE_BAD/commission",
            json={"upfront_pct": 1.0, "trail_pct": 1.0}, headers=admin_auth, timeout=15,
        )
        assert r.status_code == 404

    def test_patch_non_admin_forbidden(self, demo_auth):
        r = requests.patch(
            f"{API}/admin/funds/MF001/commission",
            json={"upfront_pct": 1.0, "trail_pct": 1.0}, headers=demo_auth, timeout=15,
        )
        assert r.status_code == 403

    def test_audit_log_records_update(self, admin_auth):
        rows = requests.get(f"{API}/admin/commission/funds", headers=admin_auth, timeout=20).json()
        target = rows[0]
        fid = target["fund_id"]
        original = {"upfront_pct": target["upfront_pct"], "trail_pct": target["trail_pct"]}
        try:
            requests.patch(
                f"{API}/admin/funds/{fid}/commission",
                json={"upfront_pct": 1.11, "trail_pct": 1.22},
                headers=admin_auth, timeout=15,
            )
            r = requests.get(f"{API}/admin/audit", headers=admin_auth, timeout=15)
            assert r.status_code == 200
            entries = r.json()
            # newest first expected; just search whole list
            match = [
                e for e in entries
                if e.get("action") == "fund.commission.update" and e.get("target") == fid
            ]
            assert match, "no audit entry for fund.commission.update"
        finally:
            requests.patch(
                f"{API}/admin/funds/{fid}/commission",
                json=original, headers=admin_auth, timeout=15,
            )


# ----- Math sanity: upfront_earned ~= sum(amount * upfront_pct/100) over txns -----
class TestMathSanity:
    def test_upfront_earned_matches_txns(self, admin_auth):
        # Get raw transactions via demo user
        demo_token = requests.post(f"{API}/auth/login", json=DEMO, timeout=20).json()["token"]
        demo_h = {"Authorization": f"Bearer {demo_token}"}
        txns = requests.get(f"{API}/transactions", headers=demo_h, timeout=20).json()
        rows = requests.get(f"{API}/admin/commission/funds", headers=admin_auth, timeout=20).json()
        rate_by_fund = {r["fund_id"]: r["upfront_pct"] for r in rows}
        upfront_by_fund = {r["fund_id"]: r["upfront_earned"] for r in rows}
        # Aggregate from demo txns (only one investor in seed)
        agg = {}
        for t in txns:
            fid = t.get("fund_id")
            if fid not in rate_by_fund:
                continue
            agg[fid] = agg.get(fid, 0) + float(t.get("amount", 0)) * rate_by_fund[fid] / 100.0
        # For each fund the demo user invested in, server's upfront_earned should be >= demo agg
        # (there may be other investors but seed has only Amit). Use loose 1% tolerance.
        for fid, demo_val in agg.items():
            srv = upfront_by_fund.get(fid, 0)
            assert srv >= demo_val - 0.5, f"fund {fid}: server upfront {srv} < demo agg {demo_val}"
