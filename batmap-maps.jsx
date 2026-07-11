// batmap-maps.jsx — Map pages + Visualization Dashboard
const { useState, useEffect, useRef } = React;

const { BAT_DATA, BRIDGE_DATA, SPECIES_COLORS, STATUS_COLORS } = window;
const SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const OHIO = [40.4173, -82.9071];

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
      <div style={{ fontSize:11, fontWeight:700, color:"var(--text2)", letterSpacing:.6, textTransform:"uppercase", marginBottom:10 }}>Legend</div>
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

// ── BAT ACTIVITY MAP ──────────────────────────────────────────────────────────
function MapBat() {
  const mapRef = useRef(null);
  const [activeSpecies, setActiveSpecies] = useState(new Set(Object.keys(SPECIES_COLORS)));
  const layerRefs = useRef({});

  useEffect(() => {
    if (!mapRef.current) return;
    const map = L.map(mapRef.current).setView(OHIO, 7);
    L.tileLayer(SATELLITE, { maxZoom:19, attribution:"© Esri" }).addTo(map);

    // Group points by species → add circle markers
    BAT_DATA.forEach(d => {
      const color = SPECIES_COLORS[d.species];
      const r = 5 + Math.round(d.activity / 13);
      const m = L.circleMarker([d.lat, d.lng], { radius:r, color, fillColor:color, fillOpacity:.82, weight:2 }).addTo(map);
      m.bindPopup(`<div style="min-width:180px"><b style="color:${color};font-size:14px">${d.species}</b><br/><br/><b>Site:</b> ${d.site}<br/><b>Activity Index:</b> ${d.activity}%<br/><b>Date:</b> ${d.date}</div>`);
      if (!layerRefs.current[d.species]) layerRefs.current[d.species] = [];
      layerRefs.current[d.species].push(m);
    });

    // Dashed flight-path lines per species (first 3 pts)
    const grouped = {};
    BAT_DATA.forEach(d => { (grouped[d.species] = grouped[d.species] || []).push([d.lat, d.lng]); });
    Object.entries(grouped).forEach(([sp, pts]) => {
      if (pts.length >= 2) {
        const line = L.polyline(pts.slice(0, 4), { color:SPECIES_COLORS[sp], weight:1.5, opacity:.38, dashArray:"5 7" }).addTo(map);
        (layerRefs.current[sp] = layerRefs.current[sp] || []).push(line);
      }
    });

    window._batMap = map;
    return () => { map.remove(); delete window._batMap; };
  }, []);

  // Toggle species visibility
  useEffect(() => {
    const map = window._batMap;
    if (!map) return;
    Object.entries(layerRefs.current).forEach(([sp, layers]) => {
      layers.forEach(l => {
        if (activeSpecies.has(sp)) { if (!map.hasLayer(l)) map.addLayer(l); }
        else { if (map.hasLayer(l)) map.removeLayer(l); }
      });
    });
  }, [activeSpecies]);

  const toggle = sp => setActiveSpecies(prev => {
    const next = new Set(prev);
    next.has(sp) ? next.delete(sp) : next.add(sp);
    return next;
  });

  const sidebar = (
    <>
      <p style={{ fontSize:13, color:"var(--text2)", lineHeight:1.6, marginBottom:4 }}>
        Acoustic detection data from Ohio monitoring stations. Marker size reflects activity index.
      </p>
      <SectionLabel>Species Filter</SectionLabel>
      {Object.entries(SPECIES_COLORS).map(([sp, color]) => (
        <label key={sp} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, cursor:"pointer" }}>
          <input type="checkbox" checked={activeSpecies.has(sp)} onChange={()=>toggle(sp)} style={{ accentColor: color }}/>
          <span style={{ width:10, height:10, borderRadius:"50%", background:color, flexShrink:0 }}/>
          <span style={{ fontSize:13, color:"var(--text)", lineHeight:1.3 }}>{sp}</span>
          <span style={{ fontSize:11, color:"var(--text2)", marginLeft:"auto" }}>{BAT_DATA.filter(d=>d.species===sp).length}</span>
        </label>
      ))}
      <Legend items={[
        ["#52b788","Detection point"],
        ["#52b788","Simulated flight path", true],
      ]}/>
      <InfoBox>
        <b style={{ color:"var(--text)" }}>Sites:</b> {BAT_DATA.length} &nbsp;·&nbsp;
        <b style={{ color:"var(--text)" }}>Updated:</b> Apr 20, 2026
      </InfoBox>
    </>
  );

  return (
    <MapShell title="Bat Activity Map" sidebar={sidebar}>
      <div ref={mapRef} style={{ width:"100%", height:"100%" }}/>
    </MapShell>
  );
}

// ── BRIDGES MAP (real ODOT data, themed) ─────────────────────────────────────
const _BD = window.BATMAP_DATA || { SURVEYED:[], BG:[], RECORDS:[], TRACK:[], SPECIES_COLOR:{} };
const SPECIES_COLOR_MAP = _BD.SPECIES_COLOR;

function colorForSpecies(sp) {
  if (!sp) return "#94a3b8";
  for (const [k, v] of Object.entries(SPECIES_COLOR_MAP)) {
    if (sp.includes(k) || k.includes(sp)) return v;
  }
  return "#52b788";
}

function MapBridges() {
  const mapRef = useRef(null);
  const [tab, setTab] = useState("bridges");
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const layers = useRef({});

  useEffect(() => {
    if (!mapRef.current) return;
    const map = L.map(mapRef.current, { zoomControl:true, preferCanvas:true }).setView(OHIO, 7);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom:19, attribution:"© OSM © CartoDB",
    }).addTo(map);
    window._bridgeMap = map;
    return () => { map.remove(); delete window._bridgeMap; };
  }, []);

  useEffect(() => {
    const map = window._bridgeMap;
    if (!map) return;
    Object.values(layers.current).forEach(l => map.hasLayer(l) && map.removeLayer(l));
    layers.current = {};

    if (tab === "bridges") {
      const bg = L.layerGroup();
      for (let i = 0; i < _BD.BG.length; i += 2) {
        L.circleMarker([_BD.BG[i], _BD.BG[i+1]], {
          radius:2.5, color:"#94a884", fillColor:"#cbd5b3", fillOpacity:.55, weight:.5,
        }).addTo(bg);
      }
      bg.addTo(map);
      layers.current.bg = bg;

      const cluster = L.markerClusterGroup({
        maxClusterRadius: 55,
        showCoverageOnHover: false,
        iconCreateFunction: (c) => {
          const kids = c.getAllChildMarkers();
          const counts = {};
          kids.forEach(m => { const k = m.options._sp || "?"; counts[k] = (counts[k]||0)+1; });
          const dom = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
          const col = colorForSpecies(dom);
          const n = c.getChildCount();
          const size = n >= 100 ? 44 : n >= 30 ? 38 : n >= 10 ? 32 : 26;
          return L.divIcon({
            className:"", iconSize:[size,size], iconAnchor:[size/2,size/2],
            html:`<div style="width:${size}px;height:${size}px;border-radius:50%;background:${col};color:#fff;display:flex;align-items:center;justify-content:center;font-family:Outfit,sans-serif;font-weight:700;font-size:${size>=38?15:13}px;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25)">${n}</div>`,
          });
        },
      });
      const visible = _BD.SURVEYED.filter(b => {
        if (filter === "all") return true;
        if (filter === "indiana")   return b.sp && b.sp.includes("Indiana");
        if (filter === "longeared") return b.sp && b.sp.includes("long-eared");
        if (filter === "big")       return b.sp && b.sp.includes("Big brown");
        if (filter === "none")      return !b.sp || b.sp.includes("None") || b.p === "Not counted";
        return true;
      });
      visible.forEach(b => {
        const col = colorForSpecies(b.sp);
        const m = L.marker([b.la, b.lo], {
          _sp: b.sp,
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

    if (tab === "records") {
      const grp = L.layerGroup();
      _BD.RECORDS.forEach(r => {
        const col = colorForSpecies(r.sp);
        const rad = Math.max(5, Math.min(9, 5 + (r.m||10)/6));
        const m = L.circleMarker([r.la, r.lo], {
          radius:rad, color:"#fff", weight:1.5, fillColor:col, fillOpacity:.85,
        });
        m.on("click", () => setSelected({ kind:"record", data:r }));
        m.addTo(grp);
      });
      grp.addTo(map);
      layers.current.recs = grp;
    }

    if (tab === "tracking") {
      const grp = L.layerGroup();
      const pts = _BD.TRACK.map(t => [t.la, t.lo]);
      if (pts.length > 1) {
        L.polyline(pts, { color:"#475569", weight:2, opacity:.7, dashArray:"5 6" }).addTo(grp);
      }
      _BD.TRACK.forEach((t, i) => {
        const isLast = i === _BD.TRACK.length - 1;
        const m = L.circleMarker([t.la, t.lo], {
          radius: isLast ? 8 : 4,
          color: isLast ? "#fff" : "#475569",
          weight: isLast ? 2 : 1,
          fillColor: isLast ? "#52b788" : "#475569",
          fillOpacity: isLast ? 1 : .65,
        });
        m.on("click", () => setSelected({ kind:"track", data:t }));
        m.addTo(grp);
      });
      grp.addTo(map);
      layers.current.track = grp;
    }
  }, [tab, filter]);

  const tabConfig = {
    bridges:  { label:"Bridges",  count: _BD.SURVEYED.length, sub:"ODOT structure surveys" },
    records:  { label:"Records",  count: _BD.RECORDS.length,  sub:"Captures & observations" },
    tracking: { label:"Tracking", count: _BD.TRACK.length,    sub:"IoT tag detections" },
  };

  const counties = new Set(_BD.SURVEYED.map(b => b.c)).size;
  const speciesInRecords = new Set(_BD.RECORDS.map(r => r.sp)).size;

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
          <SectionLabel>Filter by species</SectionLabel>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
            {[
              ["all",       "All"],
              ["big",       "Big brown"],
              ["longeared", "N. long-eared"],
              ["indiana",   "Indiana"],
              ["none",      "None seen"],
            ].map(([id, l]) => (
              <button key={id} onClick={()=>setFilter(id)}
                style={{
                  background: filter===id ? "var(--primary)" : "var(--bg2)",
                  color: filter===id ? "#fff" : "var(--text2)",
                  border: `1px solid ${filter===id ? "var(--primary)" : "var(--border)"}`,
                  borderRadius: 999, padding:"5px 11px", fontSize:12, fontWeight:500, cursor:"pointer",
                }}>{l}</button>
            ))}
          </div>
          <Legend items={[
            ["#d97706","Big brown bat"],
            ["#7c3aed","N. long-eared"],
            ["#dc2626","Indiana bat"],
            ["#94a3b8","None seen"],
            ["#cbd5b3","Not surveyed"],
          ]}/>
          <InfoBox>
            <b style={{ color:"var(--text)" }}>{_BD.SURVEYED.length}</b> surveyed bridges across <b style={{ color:"var(--text)" }}>{counties}</b> counties · <b style={{ color:"var(--text)" }}>{(_BD.BG.length/2).toLocaleString()}</b> other ODOT structures.
          </InfoBox>
        </>
      ) : tab === "records" ? (
        <>
          <p style={{ fontSize:13, color:"var(--text2)", lineHeight:1.6, marginBottom:10 }}>
            Capture & observation records. Marker size reflects body mass; color shows species.
          </p>
          <Legend items={[
            ["#d97706","Big brown bat"],
            ["#0891b2","Little brown"],
            ["#7c3aed","N. long-eared"],
            ["#dc2626","Indiana bat"],
            ["#b91c1c","Eastern red"],
            ["#92400e","Hoary bat"],
            ["#a16207","Tri-colored"],
            ["#475569","Silver-haired"],
          ]}/>
          <InfoBox><b style={{ color:"var(--text)" }}>{_BD.RECORDS.length}</b> records · <b style={{ color:"var(--text)" }}>{speciesInRecords}</b> species · 2022–2025</InfoBox>
        </>
      ) : (
        <>
          <p style={{ fontSize:13, color:"var(--text2)", lineHeight:1.6, marginBottom:10 }}>
            IoT acoustic tag detections logged April 2026. Solid green marker is the latest fix; dashed line is the path.
          </p>
          <Legend items={[
            ["#52b788","Latest detection"],
            ["#475569","Earlier detections"],
            ["#475569","Path", true],
          ]}/>
          <InfoBox><b style={{ color:"var(--text)" }}>{_BD.TRACK.length}</b> detections · 1 active tag (silver-haired bat)</InfoBox>
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
    <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px dashed var(--border)" }}>
      <span style={{ fontSize:12, color:"var(--text2)" }}>{k}</span>
      <span style={{ fontSize:13, fontWeight:600, color:"var(--text)", textAlign:"right", maxWidth:"60%", wordBreak:"break-word" }}>{v}</span>
    </div>
  );

  if (sel.kind === "bridge") {
    const b = sel.data;
    const col = colorForSpecies(b.sp);
    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--text2)", letterSpacing:.6, textTransform:"uppercase" }}>Surveyed bridge</div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text2)", fontSize:18 }}>✕</button>
        </div>
        <div style={{ fontFamily:"Outfit", fontSize:18, fontWeight:700, color:"var(--text)", marginBottom:2 }}>SFN {b.s}</div>
        <div style={{ fontSize:14, color:"var(--text)", marginBottom:4 }}>{b.n || "Unnamed"}</div>
        <div style={{ display:"inline-block", background:col+"22", color:col, border:`1px solid ${col}55`, borderRadius:6, padding:"3px 9px", fontSize:11, fontWeight:600, marginBottom:14 }}>
          {b.sp || "No species recorded"}
        </div>
        <div style={{ background:"var(--bg2)", borderRadius:9, padding:"4px 12px" }}>
          {F("District", "ODOT D-" + (b.d || "?"))}
          {F("County", b.c || "—")}
          {F("Survey type", b.st || "—")}
          {F("Survey date", b.sd || "—")}
          {F("Presence", b.p || "—")}
          {F("ID confidence", b.ic || "—")}
          {F("Feature", b.f || "—")}
          {F("Coords", b.la.toFixed(4) + ", " + b.lo.toFixed(4))}
        </div>
      </div>
    );
  }

  if (sel.kind === "record") {
    const r = sel.data;
    const col = colorForSpecies(r.sp);
    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--text2)", letterSpacing:.6, textTransform:"uppercase" }}>Record · {r.id}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text2)", fontSize:18 }}>✕</button>
        </div>
        <div style={{ fontFamily:"Outfit", fontSize:18, fontWeight:700, color:"var(--text)" }}>{r.sp}</div>
        <div style={{ fontSize:12, fontStyle:"italic", color:"var(--text2)", marginBottom:10 }}>{r.sci}</div>
        <div style={{ display:"inline-block", background:col+"22", color:col, border:`1px solid ${col}55`, borderRadius:6, padding:"3px 9px", fontSize:11, fontWeight:600, marginBottom:14 }}>
          {r.a} · {r.sx} · {r.r}
        </div>
        <div style={{ background:"var(--bg2)", borderRadius:9, padding:"4px 12px" }}>
          {F("Date", r.d || "—")}
          {F("Forearm", r.fa ? r.fa + " mm" : "—")}
          {F("Mass", r.m ? r.m + " g" : "—")}
          {F("Band", r.b || "—")}
          {F("Method", r.mt || "—")}
          {F("Coords", r.la.toFixed(4) + ", " + r.lo.toFixed(4))}
        </div>
      </div>
    );
  }

  const t = sel.data;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"var(--text2)", letterSpacing:.6, textTransform:"uppercase" }}>IoT detection · Tag {t.tg}</div>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text2)", fontSize:18 }}>✕</button>
      </div>
      <div style={{ background:"var(--bg2)", borderRadius:9, padding:"4px 12px" }}>
        {F("Time", t.t)}
        {F("Confidence", t.c + "%")}
        {F("Source", t.s)}
        {F("Coords", t.la.toFixed(4) + ", " + t.lo.toFixed(4))}
      </div>
    </div>
  );
}

// ── BAT SPECIES MAP ───────────────────────────────────────────────────────────
function MapBatType() {
  const mapRef = useRef(null);
  const [focus, setFocus] = useState(null);

  const speciesInfo = {
    "Big Brown Bat":            "Most common Ohio bat. Statewide. Roosts in buildings, tree cavities, and bridges.",
    "Little Brown Bat":         "Second most common. Faces White-Nose Syndrome pressure. Bridge roosts critical.",
    "Indiana Bat":              "Federally endangered. Depends on forest rivers and limestone cave hibernacula.",
    "Tri-colored Bat":          "Small, found near forested rivers. Also declining due to WNS.",
    "Eastern Small-footed Bat": "Rare cave specialist. Tiny size — less than 5g. Very limited Ohio range.",
  };

  useEffect(() => {
    if (!mapRef.current) return;
    const map = L.map(mapRef.current).setView(OHIO, 7);
    L.tileLayer(SATELLITE, { maxZoom:19, attribution:"© Esri" }).addTo(map);

    // Species range polygons (rough convex hull)
    const grouped = {};
    BAT_DATA.forEach(d => { (grouped[d.species] = grouped[d.species] || []).push(d); });
    Object.entries(grouped).forEach(([sp, pts]) => {
      const color = SPECIES_COLORS[sp];
      if (pts.length >= 3) {
        L.polygon(pts.map(p=>[p.lat,p.lng]), { color, weight:1.2, fillColor:color, fillOpacity:.09, dashArray:"4 5" }).addTo(map);
      }
      pts.forEach(d => {
        L.circleMarker([d.lat, d.lng], { radius:8, color, fillColor:color, fillOpacity:.8, weight:2 }).addTo(map)
          .bindPopup(`<div><b style="color:${color}">${sp}</b><br/>${d.site}<br/><b>Activity:</b> ${d.activity}%</div>`);
      });
    });

    window._batTypeMap = map;
    return () => { map.remove(); delete window._batTypeMap; };
  }, []);

  const sidebar = (
    <>
      <p style={{ fontSize:13, color:"var(--text2)", lineHeight:1.6, marginBottom:4 }}>
        Species distribution across Ohio. Shaded zones show approximate range overlap.
      </p>
      <SectionLabel>Species</SectionLabel>
      {Object.entries(SPECIES_COLORS).map(([sp, color]) => (
        <div key={sp} onClick={() => setFocus(focus===sp?null:sp)}
          style={{ border:`1px solid ${focus===sp?color:"var(--border)"}`, borderRadius:10, padding:"10px 12px", marginBottom:8, cursor:"pointer", background: focus===sp?"var(--bg2)":"transparent", transition:"all .15s" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:color, flexShrink:0 }}/>
            <span style={{ fontSize:13, fontWeight:500, color:"var(--text)", flex:1 }}>{sp}</span>
            <span style={{ fontSize:11, color:"var(--text2)" }}>{BAT_DATA.filter(d=>d.species===sp).length} sites</span>
          </div>
          {focus===sp && <p style={{ fontSize:12, color:"var(--text2)", lineHeight:1.55, marginTop:8, marginLeft:18 }}>{speciesInfo[sp]}</p>}
        </div>
      ))}
      <InfoBox>Click a species card to read field notes. Click map markers for site details.</InfoBox>
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
  const actRef  = useRef(null);
  const spRef   = useRef(null);
  const stRef   = useRef(null);
  const hrRef   = useRef(null);
  const charts  = useRef({});

  useEffect(() => {
    const gridColor = "rgba(82,183,136,.12)";
    const tickColor = "#4a6b52";
    const baseOpts = (extra={}) => ({
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:tickColor, font:{ family:"Inter", size:11 }, boxWidth:12, padding:14 } } },
      ...extra,
    });
    const axisOpts = { x:{ ticks:{color:tickColor}, grid:{color:gridColor} }, y:{ ticks:{color:tickColor}, grid:{color:gridColor} } };

    const mk = (ref, key, type, data, opts) => {
      charts.current[key]?.destroy();
      if (ref.current) charts.current[key] = new Chart(ref.current, { type, data, options:opts });
    };

    mk(actRef, "act", "line", {
      labels:["Nov","Dec","Jan","Feb","Mar","Apr"],
      datasets:[{ label:"Detections", data:[12,4,2,8,45,85], borderColor:"#52b788", backgroundColor:"rgba(82,183,136,.1)", fill:true, tension:.4, borderWidth:2.5, pointRadius:4, pointBackgroundColor:"#52b788" }]
    }, baseOpts({ scales:axisOpts }));

    const spCounts = {};
    _BD.SURVEYED.forEach(b => { if (b.sp) spCounts[b.sp] = (spCounts[b.sp]||0)+1; });
    const spLabels = Object.keys(spCounts).slice(0, 7);
    const spVals = spLabels.map(l => spCounts[l]);
    const spColors = spLabels.map(l => colorForSpecies(l));
    mk(spRef, "sp", "doughnut", {
      labels: spLabels.map(l => l.replace(/\s*\(.+?\)/, "")),
      datasets:[{ data: spVals, backgroundColor: spColors, borderWidth:0, hoverOffset:6 }]
    }, baseOpts());

    // Records by month, 2024-25
    const monthCounts = {};
    _BD.RECORDS.forEach(r => { if (r.d) { const k = r.d.slice(0,7); monthCounts[k] = (monthCounts[k]||0)+1; } });
    const months = Object.keys(monthCounts).sort().slice(-12);
    mk(stRef, "st", "bar", {
      labels: months,
      datasets:[{ label:"Records", data: months.map(m=>monthCounts[m]), backgroundColor:"#52b788", borderRadius:6, borderSkipped:false }]
    }, baseOpts({ scales:{ x:{ticks:{color:tickColor,maxTicksLimit:8},grid:{display:false}}, y:{ticks:{color:tickColor},grid:{color:gridColor}} } }));

    const hr = Array.from({length:24},(_,i) => i>=19||i<=1 ? Math.round(Math.random()*80+5) : Math.round(Math.random()*8));
    mk(hrRef, "hr", "bar", {
      labels:Array.from({length:24},(_,i)=>`${i}:00`),
      datasets:[{ label:"Detections/hr", data:hr, backgroundColor:"rgba(82,183,136,.65)", borderRadius:3, borderSkipped:false }]
    }, baseOpts({ scales:{ x:{ticks:{color:tickColor,maxTicksLimit:8},grid:{display:false}}, y:{ticks:{color:tickColor},grid:{color:gridColor}} } }));

    return () => Object.values(charts.current).forEach(c=>c.destroy());
  }, []);

  const stats = [
    { label:"Surveyed Bridges", val: _BD.SURVEYED.length.toLocaleString(), sub: `${new Set(_BD.SURVEYED.map(b=>b.c)).size} counties` },
    { label:"Field Records", val: _BD.RECORDS.length.toLocaleString(), sub: `${new Set(_BD.RECORDS.map(r=>r.sp)).size} species, 2022–25` },
    { label:"IoT Detections", val: _BD.TRACK.length.toLocaleString(), sub:"1 active tag, Apr 2026" },
    { label:"Other ODOT Structures", val: (_BD.BG.length/2).toLocaleString(), sub:"Awaiting bat surveys" },
  ];

  return (
    <div style={{ paddingTop:64, minHeight:"100vh", background:"var(--bg)" }}>
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"40px 28px" }}>
        <h1 style={{ fontFamily:"Outfit", fontSize:30, fontWeight:700, color:"var(--text)", marginBottom:32 }}>Analytics Dashboard</h1>
        <div className="bm-grid-4" style={{ marginBottom:32 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background:"var(--surface)", borderRadius:12, padding:"18px 22px", border:"1px solid var(--border)" }}>
              <div style={{ fontSize:12, color:"var(--text2)", marginBottom:6 }}>{s.label}</div>
              <div style={{ fontFamily:"Outfit", fontSize:28, fontWeight:700, color:"var(--primary)" }}>{s.val}</div>
              <div style={{ fontSize:11, color:"var(--accent)", marginTop:4 }}>{s.sub}</div>
            </div>
          ))}
        </div>
        <div className="bm-grid-2">
          {[
            { ref:actRef, title:"Monthly Detection Trend" },
            { ref:spRef,  title:"Species Distribution (surveyed bridges)" },
            { ref:stRef,  title:"Records by Month" },
            { ref:hrRef,  title:"Activity by Hour (typical night)" },
          ].map((c,i) => (
            <div key={i} style={{ background:"var(--surface)", borderRadius:16, padding:"22px 24px", border:"1px solid var(--border)" }}>
              <h3 style={{ fontFamily:"Outfit", fontSize:15, fontWeight:600, color:"var(--text)", marginBottom:18 }}>{c.title}</h3>
              <div style={{ height:210 }}><canvas ref={c.ref}/></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MapBat, MapBridges, MapBatType, VizDashboard });
