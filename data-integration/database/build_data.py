"""
BatMap data build
=================

Reads the source workbooks in database/source/ and writes the static data
files the website loads (data/*.js) plus a data quality report.

    python database/build_data.py

Run it again whenever Dr. Johnson sends a new snapshot. Drop the new .xlsx
files into database/source/ and update the two SOURCE_* names below if the
file names changed.

Requirements: Python 3.9+, pandas, openpyxl
    pip install pandas openpyxl
"""

import csv
import json
import math
import re
from collections import Counter, OrderedDict
from datetime import date, datetime
from pathlib import Path

import pandas as pd

# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "database" / "source"
OUT = ROOT / "data"

SOURCE_BRIDGES = "BatMap_Database_April_2026.xlsx"   # ODOT bridges + bat surveys
SOURCE_CAPTURES = "Bat_Records_Nov_2025.xlsx"        # mist-net capture records
PROJECT_LOCATIONS = "project_locations.csv"           # optional, see README

# The site is public on a static host. Surveyor names and individual band
# numbers stay out of the published files unless this is switched on.
INCLUDE_PERSONAL_FIELDS = False

# Rough Ohio bounding box used to catch broken coordinates.
OHIO_LAT = (38.35, 42.00)
OHIO_LON = (-84.85, -80.50)

# ---------------------------------------------------------------------------
# Lookups (taken from the "field descriptions" sheet of the bridge workbook)
# Codes not listed there are shown as "Code <n>" on the site.
# ---------------------------------------------------------------------------
ROUTE_OWNER = {
    "10": "State (ODOT, toll free)", "11": "ODNR", "12": "State (other, toll free)",
    "20": "Federal", "30": "Toll road (state)", "31": "Toll road (private)",
    "40": "County", "41": "Municipal", "42": "Township", "43": "Park district",
    "44": "Conservancy district", "99": "Non highway", "0": "Other", "00": "Other",
}
MATERIAL = {
    "1": "Concrete", "2": "Concrete continuous", "3": "Steel", "4": "Steel continuous",
    "5": "Prestressed concrete", "6": "Prestressed concrete continuous", "7": "Wood",
    "8": "Masonry", "9": "Aluminum, wrought iron or cast iron", "0": "Other",
}
DESIGN = {
    "1": "Slab", "2": "Stringer/multi-beam or girder", "3": "Girder and floor beam",
    "4": "Tee beam", "5": "Box beam multiple", "6": "Box beam single", "7": "Frame",
    "8": "Orthotropic", "9": "Truss deck", "10": "Truss thru", "11": "Arch deck",
    "12": "Arch thru",
}
SERVICE_ON = {
    "1": "Highway", "2": "Railroad", "3": "Pedestrian/bicycle", "4": "Highway/railroad",
    "5": "Highway/pedestrian", "6": "Overpass (second level)", "7": "Third level",
    "8": "Fourth level", "9": "Building or plaza", "0": "Other",
}
SERVICE_UNDER = {
    "1": "Highway", "2": "Railroad", "3": "Pedestrian/bicycle", "4": "Highway/railroad",
    "5": "Waterway", "6": "Highway/waterway", "7": "Railroad/waterway",
    "8": "Highway/waterway/railroad", "9": "Relief for waterway", "0": "Other",
}
MAINT = {"1": "State", "2": "County", "3": "Township", "4": "Municipal", "31": "Turnpike"}
MAINT_B = {
    "1": "State highway agency (ODOT)", "2": "County highway agency",
    "3": "Town or township highway agency", "4": "City or municipal highway agency",
    "11": "State park, forest or reservation agency (ODNR)",
}
MAIN_MEMBER = {
    "1": "Rolled steel", "2": "Riveted built-up steel", "3": "Welded built-up steel",
    "4": "Concrete tee beam", "5": "Concrete girder", "6": "Prestressed concrete box beam",
    "7": "Prestressed concrete I beam", "8": "Timber",
}

# Species master list. Keys are the ids used everywhere on the site.
SPECIES = OrderedDict([
    ("Eptesicus fuscus",          ("Big brown bat",            "#d97706")),
    ("Lasiurus borealis",         ("Eastern red bat",          "#b91c1c")),
    ("Myotis lucifugus",          ("Little brown bat",         "#0891b2")),
    ("Myotis septentrionalis",    ("Northern long-eared bat",  "#7c3aed")),
    ("Perimyotis subflavus",      ("Tricolored bat",           "#a16207")),
    ("Myotis sodalis",            ("Indiana bat",              "#dc2626")),
    ("Lasiurus cinereus",         ("Hoary bat",                "#92400e")),
    ("Nycticeius humeralis",      ("Evening bat",              "#15803d")),
    ("Lasionycteris noctivagans", ("Silver-haired bat",        "#475569")),
    ("Myotis leibii",             ("Eastern small-footed bat", "#0f766e")),
    ("Lasiurus seminolus",        ("Seminole bat",             "#be185d")),
    ("Unknown Myotis",            ("Unknown Myotis",           "#64748b")),
    ("Unknown",                   ("Unknown",                  "#94a3b8")),
    ("Unidentified",              ("Unidentified",             "#64748b")),
    ("No bats",                   ("No bats captured",         "#cbd5e1")),
])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def clean(v):
    """Return None for blanks and NaN, stripped text otherwise."""
    if v is None or v is pd.NaT:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    if isinstance(v, str):
        v = v.strip().strip("'").strip()
        return v or None
    return v


def code(v):
    """Normalise a numeric code to a plain string ('5.0' -> '5')."""
    v = clean(v)
    if v is None:
        return None
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    s = str(v).strip()
    if s.upper() == "NA":
        return None
    if re.fullmatch(r"\d+\.0", s):
        s = s[:-2]
    if re.fullmatch(r"0\d", s):
        s = s.lstrip("0") or "0"
    return int(s) if s.isdigit() else s


def year_of(v):
    v = clean(v)
    if v is None:
        return None
    if isinstance(v, (datetime, date, pd.Timestamp)):
        return int(v.year)
    m = re.search(r"(1[6-9]\d\d|20\d\d)", str(v))
    return int(m.group(1)) if m else None


def iso(v):
    v = clean(v)
    if v is None:
        return None
    if isinstance(v, (datetime, date, pd.Timestamp)):
        return v.strftime("%Y-%m-%d")
    return str(v)


def num(v, nd=2):
    v = clean(v)
    if v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if math.isnan(f):
        return None
    return int(f) if f.is_integer() else round(f, nd)


class Dict:
    """String dictionary so repeated text is stored once."""
    def __init__(self):
        self.items, self.index = [], {}

    def __call__(self, v):
        if v is None:
            return -1
        if v not in self.index:
            self.index[v] = len(self.items)
            self.items.append(v)
        return self.index[v]


def species_from_text(text):
    """Turn a survey 'Bat Species' cell into a list of species ids."""
    t = (clean(text) or "").strip()
    low = t.lower()
    if not t or low == "not surveyed":
        return None
    if low == "none seen":
        return []
    if low == "unidentified":
        return ["Unidentified"]
    found = []
    for sci in re.findall(r"\(([^)]+)\)", t):
        sci = " ".join(sci.split())
        key = next((k for k in SPECIES if k.lower() == sci.lower()), None)
        if key and key not in found:
            found.append(key)
    return found or ["Unidentified"]


def write_js(name, var, payload):
    OUT.mkdir(exist_ok=True)
    body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
    path = OUT / name
    path.write_text(
        "// Generated by database/build_data.py. Do not edit by hand.\n"
        "window.BATMAP_RAW = window.BATMAP_RAW || {};\n"
        f"window.BATMAP_RAW.{var} = {body};\n",
        encoding="utf-8",
    )
    return path


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
def build():
    qa = []
    print("Reading", SOURCE_BRIDGES)
    bdf = pd.read_excel(SRC / SOURCE_BRIDGES, sheet_name=0)
    bdf.columns = [c.strip() for c in bdf.columns]
    print("Reading", SOURCE_CAPTURES)
    cdf = pd.read_excel(SRC / SOURCE_CAPTURES, sheet_name=0)
    cdf.columns = [c.strip() for c in cdf.columns]

    # ---------------- bridges + surveys ----------------
    road, feat, county = Dict(), Dict(), Dict()
    cols = {k: [] for k in [
        "sfn", "lat", "lon", "road", "feature", "county", "district", "owner",
        "rank", "material", "design", "year", "svcOn", "svcUnder", "maint",
        "maintB", "length", "deck", "member", "coord"]}
    rank_d = Dict()
    seen = {}
    surveys = []
    sp_d = list(SPECIES.keys())
    fixed_sign, dropped_coord = [], []
    bad_year = 0
    id_method_d, survey_type_d = Dict(), Dict()

    for row in bdf.itertuples(index=False):
        r = dict(zip(bdf.columns, row))
        sfn = int(r["SFN"])
        stype = clean(r["Survey Type"])

        if stype and stype.lower() != "not surveyed":
            sp = species_from_text(r["Bat Species"])
            pres = clean(r["Presence of Bats"])
            surveys.append([
                sfn,
                survey_type_d(stype),
                iso(r["Survey Date"]),
                pres if isinstance(pres, str) else num(pres),
                [sp_d.index(s) for s in (sp or [])],
                id_method_d(clean(r["Id Confidence"])),
                clean(r["Bat Species"]),
            ])

        if sfn in seen:
            continue
        seen[sfn] = True

        lat, lon = num(r["LATITUDE_DD"], 6), num(r["LONGITUDE_DD"], 6)
        flag = 0
        if lat is not None and lon is not None:
            in_lat = OHIO_LAT[0] <= lat <= OHIO_LAT[1]
            if in_lat and OHIO_LON[0] <= -lon <= OHIO_LON[1] and lon > 0:
                fixed_sign.append((sfn, lat, lon))
                lon = -lon
                flag = 1
            elif not (in_lat and OHIO_LON[0] <= lon <= OHIO_LON[1]):
                dropped_coord.append((sfn, clean(r["COUNTY_CD"]), lat, lon))
                lat = lon = None
                flag = 2

        yr = year_of(r["YR_BUILT"])
        if clean(r["YR_BUILT"]) is not None and yr is None:
            bad_year += 1

        cols["sfn"].append(sfn)
        cols["lat"].append(round(lat, 5) if lat is not None else None)
        cols["lon"].append(round(lon, 5) if lon is not None else None)
        cols["road"].append(road(clean(r["STR_LOC_CARRIED"])))
        cols["feature"].append(feat(clean(r["INVENT_FEAT"])))
        cols["county"].append(county(clean(r["COUNTY_CD"])))
        cols["district"].append(num(r["DISTRICT"]))
        cols["owner"].append(code(r["RTE_ON_BRG_CD"]))
        cols["rank"].append(rank_d(clean(r["All Bat Species Occurence Ranking"])))
        cols["material"].append(code(r["MAIN_STR_MTL_CD"]))
        cols["design"].append(code(r["MAIN_STR_TYPE_CD"]))
        cols["year"].append(yr)
        cols["svcOn"].append(code(r["TYPE_SERV1_CD"]))
        cols["svcUnder"].append(code(r["TYPE_SERV2_CD"]))
        cols["maint"].append(code(r["MAINT_RESP_CD"]))
        cols["maintB"].append(code(r["MAINT_RESP_CD_2"]))
        cols["length"].append(num(r["NBIS_BRIDGE_LENGTH"], 1))
        cols["deck"].append(num(r["DECK_AREA"], 1))
        cols["member"].append(code(r["MAIN_MEM_CD"]))
        cols["coord"].append(flag)

    bridges_payload = {
        "cols": cols,
        "dict": {"road": road.items, "feature": feat.items, "county": county.items,
                 "rank": rank_d.items},
    }
    surveys_payload = {
        "fields": ["sfn", "type", "date", "batsSeen", "species", "idMethod", "speciesText"],
        "rows": surveys,
        "dict": {"type": survey_type_d.items, "idMethod": id_method_d.items},
    }

    # ---------------- captures ----------------
    proj_d, age_d, sex_d, rep_d, band_d, surv_d = Dict(), Dict(), Dict(), Dict(), Dict(), Dict()
    ccols = {k: [] for k in ["date", "species", "age", "sex", "repro", "forearm", "mass", "band", "project"]}
    if INCLUDE_PERSONAL_FIELDS:
        ccols.update({"bandId": [], "surveyor": []})
    unknown_species = Counter()
    proj_stats = OrderedDict()

    for row in cdf.itertuples(index=False):
        r = dict(zip(cdf.columns, row))
        spn = clean(r["Species"])
        if spn not in SPECIES:
            unknown_species[spn] += 1
            spn = "Unknown"
        proj = clean(r["PROJECT"])
        d = iso(r["DATE"])
        ccols["date"].append(d)
        ccols["species"].append(sp_d.index(spn))
        ccols["age"].append(age_d(clean(r["Age"])))
        ccols["sex"].append(sex_d(clean(r["Sex"])))
        ccols["repro"].append(rep_d(clean(r["Reproductive"])))
        ccols["forearm"].append(num(r["Forearm"]))
        ccols["mass"].append(num(r["Mass"]))
        ccols["band"].append(band_d(clean(r["BAND"])))
        ccols["project"].append(proj_d(proj))
        if INCLUDE_PERSONAL_FIELDS:
            ccols["bandId"].append(clean(r["BAND_ID"]))
            ccols["surveyor"].append(surv_d(clean(r["SURVEYOR"])))

        s = proj_stats.setdefault(proj, {"n": 0, "first": d, "last": d})
        s["n"] += 1
        if d and (s["first"] is None or d < s["first"]):
            s["first"] = d
        if d and (s["last"] is None or d > s["last"]):
            s["last"] = d

    # optional project coordinates
    locs = {}
    loc_file = SRC / PROJECT_LOCATIONS
    if loc_file.exists():
        with loc_file.open(newline="", encoding="utf-8-sig") as fh:
            for row in csv.DictReader(fh):
                la, lo = num(row.get("latitude"), 6), num(row.get("longitude"), 6)
                if row.get("project") and la is not None and lo is not None:
                    locs[row["project"].strip()] = (la, lo)

    projects = []
    for name in proj_d.items:
        st = proj_stats.get(name, {"n": 0, "first": None, "last": None})
        la, lo = locs.get(name, (None, None))
        projects.append([name, st["n"], st["first"], st["last"], la, lo])

    captures_payload = {
        "cols": ccols,
        "dict": {"age": age_d.items, "sex": sex_d.items, "repro": rep_d.items,
                 "band": band_d.items, "surveyor": surv_d.items},
        "projects": {"fields": ["name", "records", "first", "last", "lat", "lon"], "rows": projects},
    }

    # template for Dr. Johnson to fill in
    tmpl = ROOT / "database" / "project_locations_template.csv"
    with tmpl.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["project", "records", "first_date", "last_date", "latitude", "longitude", "location_notes"])
        for p in sorted(projects, key=lambda x: -x[1]):
            la, lo = locs.get(p[0], ("", ""))
            w.writerow([p[0], p[1], p[2], p[3], la, lo, ""])

    # ---------------- lookups + meta ----------------
    lookups = {
        "species": [{"id": k, "common": v[0], "color": v[1]} for k, v in SPECIES.items()],
        "codes": {
            "owner": ROUTE_OWNER, "material": MATERIAL, "design": DESIGN,
            "svcOn": SERVICE_ON, "svcUnder": SERVICE_UNDER, "maint": MAINT,
            "maintB": MAINT_B, "member": MAIN_MEMBER,
        },
        "meta": {
            "built": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "sources": [
                {"file": SOURCE_BRIDGES, "rows": int(len(bdf)), "what": "ODOT bridge inventory with bat surveys"},
                {"file": SOURCE_CAPTURES, "rows": int(len(cdf)), "what": "Bat capture records"},
            ],
            "personalFields": INCLUDE_PERSONAL_FIELDS,
            "projectsLocated": sum(1 for p in projects if p[4] is not None),
        },
    }

    paths = [
        write_js("lookups.js", "lookups", lookups),
        write_js("bridges.js", "bridges", bridges_payload),
        write_js("surveys.js", "surveys", surveys_payload),
        write_js("captures.js", "captures", captures_payload),
    ]

    # ---------------- QA report ----------------
    dup_sfn = bdf["SFN"].duplicated(keep=False)
    dup_rows = int(cdf.duplicated().sum())
    fa = pd.to_numeric(cdf["Forearm"], errors="coerce")
    ms = pd.to_numeric(cdf["Mass"], errors="coerce")
    odd_fa = cdf[(fa < 25) | (fa > 60)]
    odd_ms = cdf[(ms < 2) | (ms > 42)]
    lower = Counter(p.lower() for p in proj_d.items if p)
    case_variants = sorted(p for p in proj_d.items if p and lower[p.lower()] > 1)
    surveyed_sfn = {s[0] for s in surveys}

    qa.append("# BatMap data quality report\n")
    qa.append(f"Built {lookups['meta']['built']} by database/build_data.py.\n")
    qa.append("## Bridge workbook\n")
    qa.append(f"- {len(bdf):,} rows, {len(seen):,} unique bridges (SFN)")
    qa.append(f"- {len(surveys):,} survey rows on {len(surveyed_sfn):,} bridges, "
              f"{int(dup_sfn.sum()):,} rows share an SFN with another row (repeat surveys)")
    qa.append(f"- {len(fixed_sign)} bridges had a positive longitude; the sign was flipped "
              "(marked coord=1 in the data)")
    for s in fixed_sign:
        qa.append(f"    - SFN {s[0]}: {s[1]}, {s[2]}")
    qa.append(f"- {len(dropped_coord)} bridges have coordinates outside Ohio and are left off the map "
              "(marked coord=2)")
    for s in dropped_coord:
        qa.append(f"    - SFN {s[0]} ({s[1]}): {s[2]}, {s[3]}")
    qa.append(f"- {bad_year} bridges have an unreadable year built (left blank)")
    qa.append("- Columns marked 'Delete' on the field descriptions sheet are not published\n")
    qa.append("## Capture workbook\n")
    qa.append(f"- {len(cdf):,} records, {len(proj_d.items)} projects, "
              f"{cdf['DATE'].min():%Y-%m-%d} to {cdf['DATE'].max():%Y-%m-%d}")
    qa.append("- **No coordinates in this file.** Records can be mapped only after "
              "database/source/project_locations.csv is filled in "
              f"({lookups['meta']['projectsLocated']} of {len(projects)} projects located now)")
    qa.append(f"- {dup_rows} rows are exact duplicates of another row. Kept, since unbanded bats "
              "with the same measurements on the same night are possible. Check with the data owner")
    qa.append(f"- {len(odd_fa)} forearm values outside 25 to 60 and {len(odd_ms)} mass values outside 2 to 42 (worth checking):")
    for _, r in pd.concat([odd_fa, odd_ms]).drop_duplicates().iterrows():
        qa.append(f"    - {iso(r['DATE'])} {r['Species']} forearm={r['Forearm']} mass={r['Mass']} ({r['PROJECT']})")
    # Date alignment check: a single project should not span decades.
    yrs = cdf.assign(y=cdf["DATE"].dt.year).groupby("PROJECT")["y"].agg(["size", "nunique", "min", "max"])
    big = yrs[yrs["size"] >= 300]
    wide = big[(big["max"] - big["min"]) >= 20]
    if len(wide):
        qa.append(f"- **Check the DATE column.** {len(wide)} of {len(big)} projects with 300+ records span 20+ years, "
                  "and each project's year mix mirrors the whole file. A single thesis or pipeline survey should not "
                  "run from 1993 to 2024. Species, sex, reproductive status, forearm and mass agree with each other, "
                  "so the DATE column (or PROJECT) may have been sorted out of line with the other columns:")
        for name, r in wide.sort_values("size", ascending=False).iterrows():
            qa.append(f"    - {name}: {int(r['size'])} records across {int(r['nunique'])} different years ({int(r['min'])} to {int(r['max'])})")
    if case_variants:
        qa.append("- Project names that differ only by capitalization: " + "; ".join(case_variants))
    if unknown_species:
        qa.append("- Species names not in the species list (stored as Unknown): "
                  + ", ".join(f"{k} ({v})" for k, v in unknown_species.items()))
    qa.append(f"- Personal fields (surveyor, band number) published: {INCLUDE_PERSONAL_FIELDS}")

    (ROOT / "database" / "QA_REPORT.md").write_text("\n".join(qa) + "\n", encoding="utf-8")

    print("\nWrote:")
    for p in paths:
        print(f"  {p.relative_to(ROOT)}  {p.stat().st_size/1024:,.0f} KB")
    print("  database/QA_REPORT.md")
    print("  database/project_locations_template.csv")


if __name__ == "__main__":
    build()
