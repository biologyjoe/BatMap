# BatMap 2.0
A smart dashboard for mapping information about bats in the Midwest.

The site is fully static. It runs on any web host that serves plain files (UC web space, GitHub Pages) with no server or database.

## Folder layout

| Path | What it is |
|---|---|
| `BATMAP.html` | Entry page |
| `batmap-app.jsx`, `batmap-ui.jsx`, `batmap-maps.jsx` | Pages and components (UI team works here) |
| `batmap-store.js` | The only file that reads data. Every page gets data from `window.BatMap` |
| `data/*.js` | Generated data files. Do not edit by hand |
| `database/build_data.py` | Turns the Excel workbooks into `data/*.js` |
| `database/source/` | Put the source workbooks here (not committed, see below) |
| `database/QA_REPORT.md` | Data problems found during the last build |
| `database/project_locations_template.csv` | Capture projects that still need coordinates |

## Run it locally

Browsers block the JSX files when the page is opened straight from disk, so serve the folder:

```
python -m http.server 8000
```

Then open http://localhost:8000/BATMAP.html. Demo login: `admin@batmap.com` / `demo`.

## Update the data

1. Copy the new workbooks into `database/source/`.
2. If the file names changed, update `SOURCE_BRIDGES` and `SOURCE_CAPTURES` at the top of `database/build_data.py`.
3. Run `pip install pandas openpyxl` once, then `python database/build_data.py`.
4. Read `database/QA_REPORT.md` and commit the new `data/` files.

## Put capture records on the map

The capture workbook has project names but no coordinates. Fill in `latitude` and `longitude` in `database/project_locations_template.csv`, save it as `database/source/project_locations.csv` and rerun the build. Located projects then appear on the Captures tab and the Bat Species map.

## Publish

Upload everything except the `database/` folder. The site needs only `BATMAP.html`, the three `.jsx` files, `batmap-store.js` and `data/`.

## What is public

Anything in `data/` can be downloaded by anyone who opens the site. The demo login does not protect data. For that reason the build leaves out surveyor names and individual band numbers (`INCLUDE_PERSONAL_FIELDS = False` in the build script). Confirm with Dr. Johnson which fields may be public, especially the Indiana bat and northern long-eared bat records.

The source workbooks are listed in `.gitignore` so they do not end up in a public repository.

## Moving to a server later

Rewrite `load()` in `batmap-store.js` to fetch from the API and return the same object shapes. No page component needs to change.
