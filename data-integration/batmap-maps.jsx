// batmap-maps.jsx — Map pages + Visualization Dashboard
// All data comes from window.BatMap (see batmap-store.js).
const { useState, useEffect, useRef, useMemo } = React;

const SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const VOYAGER   = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const OHIO = [40.4173, -82.9071];
const BM = () => window.BatMap;
const NONE_COLOR = "#94a3b8";
const BG_FILL = "#cbd5b3";

// ── Shared map sidebar shell ──────────────────────────────────────────────────
function MapShell({ title, children, sidebar }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`bm-mapshell ${open ? "open" : ""}`}>
      <div className="bm-mapshell-sidebar">
        <div style={{ padding:"20px 20px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <h2 style={{ fontFamily:"Outfit", fontSize:17, fontWeight:700, color:"var(--text)" }}>{title}</h2>
          <button className="bm-only-mobile" onClick={()=>setOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text2)", fontSize:18 }}>✕</button>
        </div>
        <div style={{ padding:20, flex:1, overflowY:"auto" }}>{sidebar}</div>
      </div>
      <div className="bm-mapshell-main">
        <button className="bm-drawer-toggle" onClick={()=>setOpen(true)}>☰ Filters</button>
        {children}
      </div>
    </div>
  );
}

function Legend({ items }) {
  return (
    <div style={{ marginTop:4 }}>
      <div style={{ fontSize:11, fontWeight:700, color:"var(--text2)", letterSpacing:.6, textTransform:"uppercase", marginBottom:10, marginTop:14 }}>Legend</div>
      {items.map(([color, label, dash]) => (
        <div key={label} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
          {dash
            ? <div style={{ width:20, borderTop:`2px dashed ${color}`, flexShrink:0 }}/>
            : <div style={{ width:11, height:11, borderRadius:"50%", background:color, flexShrink:0 }}/>}
          <span style={{ fontSize:12, color:"var(--text2)" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function InfoBox({ children }) {
  return <div style={{ background:"var(--bg2)", borderRadius:9, padding:"10px 13px", fontSize:12, color:"var(--text2)", lineHeight:1.65, marginTop:16 }}>{children}</div>;
}

function SectionLabel({ children }) {
  return <div style={{ fontSize:11, fontWeight:700, color:"var(--text2)", letterSpacing:.6, textTransform:"uppercase", marginBottom:8, marginTop:16 }}>{children}</div>;
}

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      style={{
        background: active ? "var(--primary)" : "var(--bg2)",
        color: active ? "#fff" : "var(--text2)",
        border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
        borderRadius: 999, padding:"5px 11px", fontSize:12, fontWeight:500, cursor:"pointer",
      }}>{children}</button>
  );
}

// Species found on any surveyed bridge, most frequent first
function speciesOnBridges() {
  const c = {};
  BM().surveyedBridges.forEach(b => b.speciesFound.forEach(s => { c[s] = (c[s] || 0) + 1; }));
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}

function bridgeColor(b) {
  return b.speciesFound.length ? BM().colorFor(b.speciesFound[0]) : NONE_COLOR;
}

function speciesLabel(b) {
  if (!b.surveys.length) return "Not surveyed";
  if (!b.speciesFound.length) return "None seen";
  return b.speciesFound.map(s => BM().nameFor(s)).join(", ");
}

function bridgePopup(b) {
  const col = bridgeColor(b);
  return `<div style="min-width:190px"><b style="color:${col};font-size:14px">${speciesLabel(b)}</b><br/><br/>`
    + `<b>SFN:</b> ${b.sfn}<br/><b>Road:</b> ${b.road || "—"}<br/><b>Over:</b> ${b.feature || "—"}<br/>`
    + `<b>County:</b> ${b.county || "—"}<br/><b>Surveys:</b> ${b.surveys.length} (last ${b.lastSurvey || "—"})</div>`;
}

// ── BAT ACTIVITY MAP (bridge survey results) ──────────────────────────────────
function MapBat() {
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const spList = useMemo(speciesOnBridges, []);
  const years = useMemo(() => [...new Set(BM().surveys.map(s => s.year).filter(Boolean))].sort(), []);
  const [year, setYear] = useState("all");
  const [active, setActive] = useState(() => new Set([...spList.map(s => s[0]), "none"]));

  useEffect(() => {
    if (!mapRef.current) return;
    const map = L.map(mapRef.current, { preferCanvas:true }).setView(OHIO, 7);
    L.tileLayer(SATELLITE, { maxZoom:19, attribution:"© Esri" }).addTo(map);
    window._batMap = map;
    return () => { map.remove(); delete window._batMap; };
  }, []);

  // Bridges with at least one survey in the chosen year
  const shown = useMemo(() => {
    return BM().surveyedBridges.filter(b => {
      if (b.lat == null) return false;
      const sv = year === "all" ? b.surveys : b.surveys.filter(s => s.year === +year);
      if (!sv.length) return false;
      const sp = [...new Set(sv.flatMap(s => s.species))];
      return sp.length ? sp.some(s => active.has(s)) : active.has("none");
    });
  }, [year, active]);

  useEffect(() => {
    const map = window._batMap;
    if (!map) return;
    if (layerRef.current) map.removeLayer(layerRef.current);
    const grp = L.layerGroup();
    // draw "none seen" first so bat finds sit on top
    [...shown].sort((a, b) => a.batsFound - b.batsFound).forEach(b => {
      const col = bridgeColor(b);
      L.circleMarker([b.lat, b.lon], {
        radius: b.batsFound ? 8 : 4.5, color: b.batsFound ? "#fff" : col, weight: b.batsFound ? 2 : 1,
        fillColor: col, fillOpacity: b.batsFound ? .92 : .7,
      }).bindPopup(bridgePopup(b)).addTo(grp);
    });
    grp.addTo(map);
    layerRef.current = grp;
  }, [shown]);

  const toggle = id => setActive(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const withBats = shown.filter(b => b.batsFound).length;

  const sidebar = (
    <>
      <p style={{ fontSize:13, color:"var(--text2)", lineHeight:1.6, marginBottom:4 }}>
        Bat survey results at ODOT bridges. Large markers show bridges where bats were found.
      </p>
      <SectionLabel>Survey year</SectionLabel>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        <Chip active={year==="all"} onClick={()=>setYear("all")}>All</Chip>
        {years.map(y => <Chip key={y} active={year===String(y)} onClick={()=>setYear(String(y))}>{y}</Chip>)}
      </div>
      <SectionLabel>Result</SectionLabel>
      {spList.map(([sp, n]) => (
        <label key={sp} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, cursor:"pointer" }}>
          <input type="checkbox" checked={active.has(sp)} onChange={()=>toggle(sp)} style={{ accentColor: BM().colorFor(sp) }}/>
          <span style={{ width:10, height:10, borderRadius:"50%", background:BM().colorFor(sp), flexShrink:0 }}/>
          <span style={{ fontSize:13, color:"var(--text)", lineHeight:1.3 }}>{BM().nameFor(sp)}</span>
          <span style={{ fontSize:11, color:"var(--text2)", marginLeft:"auto" }}>{n}</span>
        </label>
      ))}
      <label style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, cursor:"pointer" }}>
        <input type="checkbox" checked={active.has("none")} onChange={()=>toggle("none")} style={{ accentColor: NONE_COLOR }}/>
        <span style={{ width:10, height:10, borderRadius:"50%", background:NONE_COLOR, flexShrink:0 }}/>
        <span style={{ fontSize:13, color:"var(--text)" }}>None seen</span>
        <span style={{ fontSize:11, color:"var(--text2)", marginLeft:"auto" }}>{BM().surveyedBridges.filter(b=>!b.batsFound).length}</span>
      </label>
      <InfoBox>
        <b style={{ color:"var(--text)" }}>{shown.length}</b> bridges shown · <b style={{ color:"var(--text)" }}>{withBats}</b> with bats
        <br/>Counts are bridges. Some bridges were surveyed more than once.
      </InfoBox>
    </>
  );

  return (
    <MapShell title="Bat Activity Map" sidebar={sidebar}>
      <div ref={mapRef} style={{ width:"100%", height:"100%" }}/>
    </MapShell>
  );
}

// ── BRIDGES & FIELD DATA MAP ──────────────────────────────────────────────────
function MapBridges() {
  const mapRef = useRef(null);
  const [tab, setTab] = useState("bridges");
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const layers = useRef({});
  const spList = useMemo(speciesOnBridges, []);
  const located = useMemo(() => BM().projects.filter(p => p.lat != null && p.lon != null), []);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = L.map(mapRef.current, { zoomControl:true, preferCanvas:true }).setView(OHIO, 7);
    L.tileLayer(VOYAGER, { maxZoom:19, attribution:"© OSM © CartoDB" }).addTo(map);
    window._bridgeMap = map;
    return () => { map.remove(); delete window._bridgeMap; };
  }, []);

  useEffect(() => {
    const map = window._bridgeMap;
    if (!map) return;
    Object.values(layers.current).forEach(l => map.hasLayer(l) && map.removeLayer(l));
    layers.current = {};

    if (tab === "bridges") {
      // every unsurveyed bridge as a light background dot (canvas, not clickable)
      const bg = L.layerGroup();
      BM().bridges.forEach(b => {
        if (b.surveys.length || b.lat == null) return;
        L.circleMarker([b.lat, b.lon], {
          radius:2.2, color:"#94a884", fillColor:BG_FILL, fillOpacity:.55, weight:.5, interactive:false,
        }).addTo(bg);
      });
      bg.addTo(map);
      layers.current.bg = bg;

      const cluster = L.markerClusterGroup({
        maxClusterRadius: 55,
        showCoverageOnHover: false,
        iconCreateFunction: (c) => {
          const kids = c.getAllChildMarkers();
          const counts = {};
          kids.forEach(m => { const k = m.options._col; counts[k] = (counts[k]||0)+1; });
          const col = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
          const n = c.getChildCount();
          const size = n >= 100 ? 44 : n >= 30 ? 38 : n >= 10 ? 32 : 26;
          return L.divIcon({
            className:"", iconSize:[size,size], iconAnchor:[size/2,size/2],
            html:`<div style="width:${size}px;height:${size}px;border-radius:50%;background:${col};color:#fff;display:flex;align-items:center;justify-content:center;font-family:Outfit,sans-serif;font-weight:700;font-size:${size>=38?15:13}px;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25)">${n}</div>`,
          });
        },
      });
      BM().surveyedBridges
        .filter(b => b.lat != null)
        .filter(b => filter === "all" ? true : filter === "none" ? !b.batsFound : b.speciesFound.includes(filter))
        .forEach(b => {
          const col = bridgeColor(b);
          const m = L.marker([b.lat, b.lon], {
            _col: col,
            icon: L.divIcon({
              className:"", iconSize:[14,14], iconAnchor:[7,7],
              html:`<div style="width:14px;height:14px;background:${col};border:2px solid #fff;border-radius:3px;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
            }),
          });
          m.on("click", () => setSelected({ kind:"bridge", data:b }));
          cluster.addLayer(m);
        });
      cluster.addTo(map);
      layers.current.cluster = cluster;
    }

    if (tab === "captures" && located.length) {
      const grp = L.layerGroup();
      const max = Math.max(...located.map(p => p.records));
      located.forEach(p => {
        const m = L.circleMarker([p.lat, p.lon], {
          radius: 5 + 14 * Math.sqrt(p.records / max), color:"#fff", weight:1.5, fillColor:"#2d6a4f", fillOpacity:.8,
        });
        m.on("click", () => setSelected({ kind:"project", data:p }));
        m.addTo(grp);
      });
      grp.addTo(map);
      layers.current.proj = grp;
    }
  }, [tab, filter]);

  const surveyed = BM().surveyedBridges;
  const tabConfig = {
    bridges:  { label:"Bridges",  count: surveyed.length, sub:"Bridges with bat surveys" },
    captures: { label:"Captures", count: BM().captures.length, sub:"Capture records" },
  };
  const counties = new Set(surveyed.map(b => b.county)).size;
  const unsurveyed = BM().bridges.length - surveyed.length;

  const sidebar = (
    <>
      <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14 }}>
        {Object.entries(tabConfig).map(([id, c]) => (
          <button key={id} onClick={() => { setTab(id); setSelected(null); setFilter("all"); }}
            style={{
              textAlign:"left",
              background: tab===id ? "var(--primary)" : "var(--bg2)",
              color: tab===id ? "#fff" : "var(--text)",
              border: `1px solid ${tab===id ? "var(--primary)" : "var(--border)"}`,
              borderRadius: 10, padding: "10px 13px", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"space-between", gap:8,
            }}>
            <div>
              <div style={{ fontWeight:600, fontSize:14 }}>{c.label}</div>
              <div style={{ fontSize:11, opacity:.78, marginTop:2 }}>{c.sub}</div>
            </div>
            <span style={{ fontFamily:"JetBrains Mono", fontSize:12, fontWeight:600, background: tab===id ? "rgba(255,255,255,.22)" : "var(--surface)", padding:"3px 8px", borderRadius:6 }}>{c.count.toLocaleString()}</span>
          </button>
        ))}
      </div>

      {selected ? (
        <DetailPanel sel={selected} onClose={()=>setSelected(null)}/>
      ) : tab === "bridges" ? (
        <>
          <SectionLabel>Filter by result</SectionLabel>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
            <Chip active={filter==="all"} onClick={()=>setFilter("all")}>All</Chip>
            {spList.map(([sp]) => <Chip key={sp} active={filter===sp} onClick={()=>setFilter(sp)}>{BM().nameFor(sp)}</Chip>)}
            <Chip active={filter==="none"} onClick={()=>setFilter("none")}>None seen</Chip>
          </div>
          <Legend items={[
            ...spList.map(([sp]) => [BM().colorFor(sp), BM().nameFor(sp)]),
            [NONE_COLOR, "Surveyed, none seen"],
            [BG_FILL, "Not surveyed"],
          ]}/>
          <InfoBox>
            <b style={{ color:"var(--text)" }}>{surveyed.length}</b> surveyed bridges across <b style={{ color:"var(--text)" }}>{counties}</b> counties · <b style={{ color:"var(--text)" }}>{unsurveyed.toLocaleString()}</b> other bridges not yet surveyed.
          </InfoBox>
        </>
      ) : (
        <>
          <p style={{ fontSize:13, color:"var(--text2)", lineHeight:1.6, marginBottom:10 }}>
            Mist-net capture records grouped by project. Marker size shows the number of records.
          </p>
          {located.length ? (
            <InfoBox><b style={{ color:"var(--text)" }}>{located.length}</b> of {BM().projects.length} projects have a location.</InfoBox>
          ) : (
            <InfoBox>
              <b style={{ color:"var(--text)" }}>No capture locations yet.</b> The capture file has project names but no coordinates.
              Fill in <code>database/project_locations_template.csv</code>, save it as <code>database/source/project_locations.csv</code> and rerun the build script.
              All {BM().captures.length.toLocaleString()} records are in the Data Portal and the Dashboard meanwhile.
            </InfoBox>
          )}
        </>
      )}
    </>
  );

  return (
    <MapShell title="Bridges & Field Data" sidebar={sidebar}>
      <div ref={mapRef} style={{ width:"100%", height:"100%" }}/>
    </MapShell>
  );
}

function DetailPanel({ sel, onClose }) {
  const F = (k, v) => (
    <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px dashed var(--border)", gap:10 }}>
      <span style={{ fontSize:12, color:"var(--text2)" }}>{k}</span>
      <span style={{ fontSize:13, fontWeight:600, color:"var(--text)", textAlign:"right", maxWidth:"62%", wordBreak:"break-word" }}>{v ?? "—"}</span>
    </div>
  );
  const Head = ({ label }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
      <div style={{ fontSize:11, fontWeight:700, color:"var(--text2)", letterSpacing:.6, textTransform:"uppercase" }}>{label}</div>
      <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text2)", fontSize:18 }}>✕</button>
    </div>
  );

  if (sel.kind === "bridge") {
    const b = sel.data;
    const col = bridgeColor(b);
    return (
      <div>
        <Head label="Surveyed bridge"/>
        <div style={{ fontFamily:"Outfit", fontSize:18, fontWeight:700, color:"var(--text)", marginBottom:2 }}>SFN {b.sfn}</div>
        <div style={{ fontSize:14, color:"var(--text)", marginBottom:4 }}>{b.road || "Unnamed"} over {b.feature || "—"}</div>
        <div style={{ display:"inline-block", background:col+"22", color:col, border:`1px solid ${col}55`, borderRadius:6, padding:"3px 9px", fontSize:11, fontWeight:600, marginBottom:14 }}>
          {speciesLabel(b)}
        </div>
        <div style={{ background:"var(--bg2)", borderRadius:9, padding:"4px 12px" }}>
          {F("District", b.district ? "ODOT D-" + b.district : null)}
          {F("County", b.county)}
          {F("Year built", b.yearBuilt)}
          {F("Material", b.material)}
          {F("Design", b.designType)}
          {F("Under bridge", b.serviceUnder)}
          {F("Occurrence ranking", b.occurrenceRank)}
          {F("Coords", b.lat != null ? b.lat.toFixed(4) + ", " + b.lon.toFixed(4) : null)}
        </div>
        <SectionLabel>Surveys ({b.surveys.length})</SectionLabel>
        <div style={{ background:"var(--bg2)", borderRadius:9, padding:"4px 12px", maxHeight:260, overflowY:"auto" }}>
          {b.surveys.map((s, i) => (
            <div key={i} style={{ padding:"7px 0", borderBottom: i < b.surveys.length-1 ? "1px dashed var(--border)" : "none", fontSize:12, color:"var(--text)" }}>
              <b>{s.date || "No date"}</b> · {s.type}
              <div style={{ color:"var(--text2)", marginTop:2 }}>
                {s.speciesText} · Bats seen: {s.batsSeen ?? "—"}{s.idMethod && s.idMethod !== "Not applicable" ? " · " + s.idMethod : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // project (capture records grouped by project)
  const p = sel.data;
  const recs = BM().captures.filter(c => c.project === p.name);
  const bySp = {};
  recs.forEach(c => { bySp[c.species] = (bySp[c.species]||0)+1; });
  return (
    <div>
      <Head label="Capture project"/>
      <div style={{ fontFamily:"Outfit", fontSize:18, fontWeight:700, color:"var(--text)", marginBottom:10 }}>{p.name}</div>
      <div style={{ background:"var(--bg2)", borderRadius:9, padding:"4px 12px" }}>
        {F("Records", p.records.toLocaleString())}
        {F("Dates", `${p.first || "—"} to ${p.last || "—"}`)}
        {Object.entries(bySp).sort((a,b)=>b[1]-a[1]).map(([sp, n]) => F(BM().nameFor(sp), n))}
      </div>
    </div>
  );
}

// ── BAT SPECIES MAP ───────────────────────────────────────────────────────────
const SPECIES_NOTES = {
  "Eptesicus fuscus":       "Most common Ohio bat. Statewide. Roosts in buildings, tree cavities and bridges.",
  "Myotis lucifugus":       "Faces White-Nose Syndrome pressure. Bridge roosts critical.",
  "Myotis sodalis":         "Federally endangered. Depends on forest rivers and limestone cave hibernacula.",
  "Perimyotis subflavus":   "Small, found near forested rivers. Also declining due to WNS.",
  "Myotis leibii":          "Rare cave specialist. Tiny size, less than 5 g. Very limited Ohio range.",
};

function MapBatType() {
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const [focus, setFocus] = useState(null);

  // per-species counts from both sources
  const rows = useMemo(() => {
    const br = {}, cap = {};
    BM().surveyedBridges.forEach(b => b.speciesFound.forEach(s => { br[s] = (br[s]||0)+1; }));
    BM().captures.forEach(c => { cap[c.species] = (cap[c.species]||0)+1; });
    return BM().species
      .filter(s => s.id !== "No bats" && (br[s.id] || cap[s.id]))
      .map(s => ({ ...s, bridges: br[s.id] || 0, captures: cap[s.id] || 0 }))
      .sort((a, b) => (b.captures + b.bridges) - (a.captures + a.bridges));
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = L.map(mapRef.current, { preferCanvas:true }).setView(OHIO, 7);
    L.tileLayer(SATELLITE, { maxZoom:19, attribution:"© Esri" }).addTo(map);
    window._batTypeMap = map;
    return () => { map.remove(); delete window._batTypeMap; };
  }, []);

  useEffect(() => {
    const map = window._batTypeMap;
    if (!map) return;
    if (layerRef.current) map.removeLayer(layerRef.current);
    const grp = L.layerGroup();
    BM().surveyedBridges.forEach(b => {
      if (b.lat == null) return;
      b.speciesFound.forEach((sp, k) => {
        if (focus && sp !== focus) return;
        const color = BM().colorFor(sp);
        // offset a little when one bridge holds several species
        L.circleMarker([b.lat + k * 0.004, b.lon + k * 0.004], { radius:8, color:"#fff", fillColor:color, fillOpacity:.88, weight:2 })
          .bindPopup(`<div><b style="color:${color}">${BM().nameFor(sp)}</b> <i>${sp}</i><br/>SFN ${b.sfn} · ${b.road || ""}<br/>${b.county || ""} County</div>`)
          .addTo(grp);
      });
    });
    BM().projects.forEach(p => {
      if (p.lat == null) return;
      const n = BM().captures.filter(c => c.project === p.name && (!focus || c.species === focus)).length;
      if (!n) return;
      L.circleMarker([p.lat, p.lon], { radius:6, color:"#fff", fillColor:"#2d6a4f", fillOpacity:.75, weight:1.5 })
        .bindPopup(`<div><b>${p.name}</b><br/>${n} capture records</div>`).addTo(grp);
    });
    grp.addTo(map);
    layerRef.current = grp;
  }, [focus]);

  const sidebar = (
    <>
      <p style={{ fontSize:13, color:"var(--text2)", lineHeight:1.6, marginBottom:4 }}>
        Species found on surveyed bridges and in capture records. Click a species to show only its bridges.
      </p>
      <SectionLabel>Species</SectionLabel>
      {rows.map(s => (
        <div key={s.id} onClick={() => setFocus(focus===s.id?null:s.id)}
          style={{ border:`1px solid ${focus===s.id?s.color:"var(--border)"}`, borderRadius:10, padding:"10px 12px", marginBottom:8, cursor:"pointer", background: focus===s.id?"var(--bg2)":"transparent", transition:"all .15s" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:s.color, flexShrink:0 }}/>
            <span style={{ fontSize:13, fontWeight:500, color:"var(--text)", flex:1 }}>{s.common}</span>
          </div>
          <div style={{ fontSize:11, color:"var(--text2)", marginTop:4, marginLeft:18 }}>
            {s.bridges} {s.bridges === 1 ? "bridge" : "bridges"} · {s.captures.toLocaleString()} {s.captures === 1 ? "capture" : "captures"}
          </div>
          {focus===s.id && (
            <p style={{ fontSize:12, color:"var(--text2)", lineHeight:1.55, marginTop:8, marginLeft:18 }}>
              <i>{s.id}</i>{SPECIES_NOTES[s.id] ? ". " + SPECIES_NOTES[s.id] : ""}
            </p>
          )}
        </div>
      ))}
      <InfoBox>Capture records appear on the map once project locations are added. Until then they count here only.</InfoBox>
    </>
  );

  return (
    <MapShell title="Bat Species Map" sidebar={sidebar}>
      <div ref={mapRef} style={{ width:"100%", height:"100%" }}/>
    </MapShell>
  );
}

// ── VIZ DASHBOARD ─────────────────────────────────────────────────────────────
function VizDashboard() {
  const yrRef = useRef(null);
  const spRef = useRef(null);
  const moRef = useRef(null);
  const svRef = useRef(null);
  const charts = useRef({});

  useEffect(() => {
    const D = BM();
    const gridColor = "rgba(82,183,136,.12)";
    const tickColor = "#4a6b52";
    const baseOpts = (extra={}) => ({
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:tickColor, font:{ family:"Inter", size:11 }, boxWidth:12, padding:14 } } },
      ...extra,
    });
    const barScales = { x:{ ticks:{color:tickColor,maxTicksLimit:12}, grid:{display:false} }, y:{ ticks:{color:tickColor}, grid:{color:gridColor} } };
    const mk = (ref, key, type, data, opts) => {
      charts.current[key]?.destroy();
      if (ref.current) charts.current[key] = new Chart(ref.current, { type, data, options:opts });
    };
    const bats = D.captures.filter(c => c.species !== "No bats");

    // captures by year
    const byYear = {};
    bats.forEach(c => { if (c.year) byYear[c.year] = (byYear[c.year]||0)+1; });
    const yrs = Object.keys(byYear).sort();
    mk(yrRef, "yr", "bar", {
      labels: yrs,
      datasets:[{ label:"Bats captured", data: yrs.map(y=>byYear[y]), backgroundColor:"#52b788", borderRadius:5, borderSkipped:false }],
    }, baseOpts({ plugins:{ legend:{ display:false } }, scales:barScales }));

    // captures by species
    const bySp = {};
    bats.forEach(c => { bySp[c.species] = (bySp[c.species]||0)+1; });
    const sp = Object.entries(bySp).sort((a,b)=>b[1]-a[1]);
    mk(spRef, "sp", "bar", {
      labels: sp.map(([s]) => D.nameFor(s)),
      datasets:[{ label:"Captures", data: sp.map(([,n])=>n), backgroundColor: sp.map(([s])=>D.colorFor(s)), borderRadius:4, borderSkipped:false }],
    }, baseOpts({ indexAxis:"y", plugins:{ legend:{ display:false } },
      scales:{ x:{ ticks:{color:tickColor}, grid:{color:gridColor} }, y:{ ticks:{color:tickColor, font:{size:11}, autoSkip:false}, grid:{display:false} } } }));

    // captures by month of year
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const byMo = Array(12).fill(0);
    bats.forEach(c => { if (c.month) byMo[c.month-1]++; });
    mk(moRef, "mo", "bar", {
      labels: MONTHS,
      datasets:[{ label:"Bats captured", data: byMo, backgroundColor:"rgba(82,183,136,.75)", borderRadius:4, borderSkipped:false }],
    }, baseOpts({ plugins:{ legend:{ display:false } }, scales:barScales }));

    // bridge surveys by year and result
    const sy = {};
    D.surveys.forEach(s => {
      if (!s.year) return;
      sy[s.year] = sy[s.year] || { bats:0, none:0 };
      s.species.length ? sy[s.year].bats++ : sy[s.year].none++;
    });
    const syk = Object.keys(sy).sort();
    mk(svRef, "sv", "bar", {
      labels: syk,
      datasets:[
        { label:"Bats found", data: syk.map(y=>sy[y].bats), backgroundColor:"#d97706", borderRadius:4 },
        { label:"None seen",  data: syk.map(y=>sy[y].none), backgroundColor:NONE_COLOR, borderRadius:4 },
      ],
    }, baseOpts({ scales:{ x:{ stacked:true, ticks:{color:tickColor}, grid:{display:false} }, y:{ stacked:true, ticks:{color:tickColor}, grid:{color:gridColor} } } }));

    return () => Object.values(charts.current).forEach(c=>c.destroy());
  }, []);

  const D = BM();
  const bats = D.captures.filter(c => c.species !== "No bats");
  const capYears = bats.map(c => c.year).filter(Boolean);
  const stats = [
    { label:"Bridges in Inventory", val: D.bridges.length.toLocaleString(), sub: `${(D.bridges.length - D.surveyedBridges.length).toLocaleString()} not yet surveyed` },
    { label:"Surveyed Bridges", val: D.surveyedBridges.length.toLocaleString(), sub: `${D.surveys.length} surveys · ${D.surveyedBridges.filter(b=>b.batsFound).length} with bats` },
    { label:"Capture Records", val: D.captures.length.toLocaleString(), sub: `${Math.min(...capYears)} to ${Math.max(...capYears)} · ${D.projects.length} projects` },
    { label:"Species Captured", val: new Set(bats.map(c=>c.species).filter(s=>!/^Unknown/.test(s))).size, sub:"Identified to species" },
  ];

  return (
    <div style={{ paddingTop:64, minHeight:"100vh", background:"var(--bg)" }}>
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"40px 28px" }}>
        <h1 style={{ fontFamily:"Outfit", fontSize:30, fontWeight:700, color:"var(--text)", marginBottom:6 }}>Analytics Dashboard</h1>
        <p style={{ color:"var(--text2)", fontSize:13, marginBottom:28 }}>Data built {D.meta.built} from {D.meta.sources.map(s=>s.file).join(" and ")}.</p>
        <div className="bm-grid-4" style={{ marginBottom:32 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background:"var(--surface)", borderRadius:12, padding:"18px 22px", border:"1px solid var(--border)" }}>
              <div style={{ fontSize:12, color:"var(--text2)", marginBottom:6 }}>{s.label}</div>
              <div style={{ fontFamily:"Outfit", fontSize:28, fontWeight:700, color:"var(--primary)" }}>{s.val}</div>
              <div style={{ fontSize:11, color:"var(--text2)", marginTop:4 }}>{s.sub}</div>
            </div>
          ))}
        </div>
        <div className="bm-grid-2">
          {[
            { ref:yrRef, title:"Bats Captured by Year" },
            { ref:spRef, title:"Captures by Species" },
            { ref:moRef, title:"Captures by Month" },
            { ref:svRef, title:"Bridge Surveys by Year and Result" },
          ].map((c,i) => (
            <div key={i} style={{ background:"var(--surface)", borderRadius:16, padding:"22px 24px", border:"1px solid var(--border)" }}>
              <h3 style={{ fontFamily:"Outfit", fontSize:15, fontWeight:600, color:"var(--text)", marginBottom:18 }}>{c.title}</h3>
              <div style={{ height:240 }}><canvas ref={c.ref}/></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MapBat, MapBridges, MapBatType, VizDashboard });
