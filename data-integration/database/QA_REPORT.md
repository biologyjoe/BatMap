# BatMap data quality report

Built 2026-10-05 19:07 by database/build_data.py.

## Bridge workbook

- 45,450 rows, 45,202 unique bridges (SFN)
- 771 survey rows on 542 bridges, 286 rows share an SFN with another row (repeat surveys)
- 13 bridges had a positive longitude; the sign was flipped (marked coord=1 in the data)
    - SFN 2060041: 41.272174, 84.388135
    - SFN 7460040: 41.2424, 83.23543
    - SFN 3741708: 39.52604, 82.46203
    - SFN 2342336: 39.90236, 82.74547
    - SFN 4800700: 41.634441, 83.664541
    - SFN 1807243: 41.313751, 81.695441
    - SFN 5533261: 40.080767, 84.35467
    - SFN 3632602: 39.032664, 83.240371
    - SFN 5534063: 40.17001, 84.28616
    - SFN 3300279: 40.59563, 83.570809
    - SFN 3604211: 39.1605, 83.2608
    - SFN 6334564: 41.208611, 84.476111
    - SFN 7035137: 40.647778, 82.498611
- 2 bridges have coordinates outside Ohio and are left off the map (marked coord=2)
    - SFN 2331058 (FAI): 25.320202, -28.551448
    - SFN 5935459 (MRW): 4.473585, -82.007719
- 0 bridges have an unreadable year built (left blank)
- Columns marked 'Delete' on the field descriptions sheet are not published

## Capture workbook

- 21,747 records, 442 projects, 1993-08-02 to 2024-09-19
- **No coordinates in this file.** Records can be mapped only after database/source/project_locations.csv is filled in (0 of 442 projects located now)
- 40 rows are exact duplicates of another row. Kept, since unbanded bats with the same measurements on the same night are possible. Check with the data owner
- 2 forearm values outside 25 to 60 and 5 mass values outside 2 to 42 (worth checking):
    - 2016-06-09 Myotis lucifugus forearm=7.75 mass=nan (Republic Wind Facility)
    - 2017-06-21 Eptesicus fuscus forearm=20.7 mass=44.0 (Republic Wind Facility)
    - 2023-07-19 Eptesicus fuscus forearm=nan mass=47.0 (Republic Wind Facility)
    - 2012-07-05 Eptesicus fuscus forearm=nan mass=47.0 (Republic Wind Facility)
    - 2011-07-17 Eptesicus fuscus forearm=nan mass=47.0 (Republic Wind Facility)
    - 2021-08-04 Lasiurus borealis forearm=40.0 mass=0.52 (Harpster to Lima pipeline)
- **Check the DATE column.** 8 of 13 projects with 300+ records span 20+ years, and each project's year mix mirrors the whole file. A single thesis or pipeline survey should not run from 1993 to 2024. Species, sex, reproductive status, forearm and mass agree with each other, so the DATE column (or PROJECT) may have been sorted out of line with the other columns:
    - Blue Grass Pipeline: 3472 records across 20 different years (1993 to 2024)
    - Kniowski thesis: 1814 records across 20 different years (1993 to 2024)
    - Ohio Bats: 1276 records across 20 different years (1993 to 2024)
    - Republic Wind Facility: 914 records across 20 different years (1993 to 2024)
    - Crawford County Wind Farm: 840 records across 19 different years (2000 to 2024)
    - Long Prairie Wind Facility: 450 records across 18 different years (1993 to 2024)
    - Monroe Outlet: 362 records across 18 different years (1993 to 2024)
    - Apex Emerson Creek: 358 records across 20 different years (1993 to 2024)
- Project names that differ only by capitalization: BLUE CREEK; Blue Creek; CJAG Bat Inventory; CJAG bat inventory
- Personal fields (surveyor, band number) published: False
