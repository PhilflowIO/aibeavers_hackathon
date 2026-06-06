#!/usr/bin/env python3
"""
Investor-deck metric calculators — LTV, CAC, NRR/GRR, burn multiple,
magic number, and a cohort-retention table.

Distilled from cosmicstack-labs/pitch-deck-creation, turned into a usable
CLI + importable functions so the builder can compute real numbers for the
Traction / Business Model / Financials slides instead of hand-waving.

Usage:
    python3 metrics.py ltv-cac --arpu 50 --margin 0.8 --churn 0.03 \
            --sm-spend 50000 --new-customers 50
    python3 metrics.py retention --base 100 --expansion 18 --churn 7
    python3 metrics.py burn --net-burn 400000 --net-new-arr 250000
    python3 metrics.py magic --new-arr-q 300000 --sm-prior-q 350000
    python3 metrics.py cohort
"""

import argparse
import json


def ltv_cac(arpu, gross_margin, churn_rate, sm_spend, new_customers):
    """LTV:CAC. arpu monthly $, gross_margin 0-1, churn_rate monthly 0-1."""
    ltv = arpu * gross_margin * (1 / churn_rate) if churn_rate > 0 else 0
    cac = sm_spend / new_customers if new_customers > 0 else 0
    ratio = ltv / cac if cac > 0 else 0
    payback = cac / (arpu * gross_margin) if arpu * gross_margin > 0 else 0
    return {
        "ltv": round(ltv, 2),
        "cac": round(cac, 2),
        "ltv_cac_ratio": round(ratio, 2),
        "cac_payback_months": round(payback, 1),
        "healthy": ratio >= 3.0,  # SaaS rule of thumb
    }


def retention(beginning_mrr, expansion, churn):
    """Net & gross revenue retention (all in same $ unit)."""
    nrr = (beginning_mrr + expansion - churn) / beginning_mrr if beginning_mrr else 0
    grr = (beginning_mrr - churn) / beginning_mrr if beginning_mrr else 0
    return {
        "nrr": round(nrr, 4),
        "grr": round(grr, 4),
        "nrr_pct": f"{nrr:.0%}",
        "grr_pct": f"{grr:.0%}",
        "best_in_class_nrr": nrr >= 1.20,  # >120% NRR is elite
    }


def burn_multiple(net_burn, net_new_arr):
    """Net burn / net new ARR. <1 elite, <2 great, >2 watch."""
    mult = net_burn / net_new_arr if net_new_arr else float("inf")
    rating = "elite" if mult < 1 else "great" if mult < 2 else "watch"
    return {"burn_multiple": round(mult, 2), "rating": rating}


def magic_number(new_arr_quarter, sm_prior_quarter):
    """New ARR in quarter / S&M spend in prior quarter. >0.75 = scale."""
    mn = new_arr_quarter / sm_prior_quarter if sm_prior_quarter else 0
    verdict = "scale spend" if mn >= 0.75 else "fix efficiency first"
    return {"magic_number": round(mn, 2), "verdict": verdict}


def cohort_table(months=6, start_size=300, monthly_decay=0.12):
    """Deterministic, realistic cohort retention table for a traction slide."""
    cohorts = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"][:months]
    rows = []
    for i, c in enumerate(cohorts):
        row = {"cohort": c, "size": start_size + i * 20}
        for m in range(months):
            if m <= (months - 1 - i):
                ret = max(0.30, 1.0 - m * monthly_decay + i * 0.015)
                row[f"M{m + 1}"] = f"{ret:.0%}"
            else:
                row[f"M{m + 1}"] = "—"
        rows.append(row)
    return rows


def main():
    ap = argparse.ArgumentParser(description="Pitch-deck metric calculators")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("ltv-cac")
    p.add_argument("--arpu", type=float, required=True)
    p.add_argument("--margin", type=float, required=True)
    p.add_argument("--churn", type=float, required=True)
    p.add_argument("--sm-spend", type=float, required=True)
    p.add_argument("--new-customers", type=int, required=True)

    p = sub.add_parser("retention")
    p.add_argument("--base", type=float, required=True)
    p.add_argument("--expansion", type=float, required=True)
    p.add_argument("--churn", type=float, required=True)

    p = sub.add_parser("burn")
    p.add_argument("--net-burn", type=float, required=True)
    p.add_argument("--net-new-arr", type=float, required=True)

    p = sub.add_parser("magic")
    p.add_argument("--new-arr-q", type=float, required=True)
    p.add_argument("--sm-prior-q", type=float, required=True)

    sub.add_parser("cohort")

    a = ap.parse_args()
    if a.cmd == "ltv-cac":
        out = ltv_cac(a.arpu, a.margin, a.churn, a.sm_spend, a.new_customers)
    elif a.cmd == "retention":
        out = retention(a.base, a.expansion, a.churn)
    elif a.cmd == "burn":
        out = burn_multiple(a.net_burn, a.net_new_arr)
    elif a.cmd == "magic":
        out = magic_number(a.new_arr_q, a.sm_prior_q)
    elif a.cmd == "cohort":
        out = cohort_table()
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
