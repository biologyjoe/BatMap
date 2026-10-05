// batmap-ui.jsx — shared data, components, and non-map pages
const { useState, useEffect, useRef } = React;

// ── DATA ──────────────────────────────────────────────────────────────────────
// Bat and bridge data now come from window.BatMap (batmap-store.js).

const USERS = {
  "developer@batmap.com": { role:"developer",  name:"Alex Chen",          password:"demo" },
  "odot@batmap.com":       { role:"odot",       name:"Sam Wilson",         password:"demo" },
  "researcher@batmap.com": { role:"researcher", name:"Dr. Jordan Park",    password:"demo" },
  "admin@batmap.com":      { role:"admin",      name:"Admin User",         password:"demo" },
};

const ROLE_ACCESS = {
  developer:  ["map-bat","map-bridges","map-battype","viz","data"],
  odot:       ["map-bridges","data"],
  researcher: ["map-bat","map-battype","viz","data"],
  admin:      ["map-bat","map-bridges","map-battype","viz","data"],
};

const ROLE_LABELS = { developer:"Developer", odot:"ODOT Staff", researcher:"Bat Researcher", admin:"Administrator" };
const ROLE_COLORS = { developer:"#2d6a4f", odot:"#2a6b7c", researcher:"#5b3d8a", admin:"#8a4a2a" };


// ── BAT LOGO ─────────────────────────────────────────────────────────────────
function BatLogo({ size=32, color="currentColor" }) {
  return (
    <svg width={size} height={Math.round(size*0.74)} viewBox="0 0 50 37" fill={color}>
      <ellipse cx="25" cy="23" rx="5" ry="6.5"/>
      <path d="M20 21Q11 10 1 14Q5 20 11 22Q16 17 20 21Z"/>
      <path d="M30 21Q39 10 49 14Q45 20 39 22Q34 17 30 21Z"/>
      <path d="M22 17L18.5 7L25 15Z"/>
      <path d="M28 17L31.5 7L25 15Z"/>
    </svg>
  );
}

// ── NAV ───────────────────────────────────────────────────────────────────────
function Nav({ page, setPage, user, onLogout, dark, setDark }) {
  const [open, setOpen] = useState(false);
  const mapLinks = user ? [
    ROLE_ACCESS[user.role].includes("map-bat")      && { id:"map-bat",      label:"Bat Activity" },
    ROLE_ACCESS[user.role].includes("map-bridges")  && { id:"map-bridges",  label:"Bridges" },
    ROLE_ACCESS[user.role].includes("map-battype")  && { id:"map-battype",  label:"Bat Species" },
    ROLE_ACCESS[user.role].includes("viz")          && { id:"viz",          label:"Dashboard" },
  ].filter(Boolean) : [];

  const go = (p) => { setPage(p); setOpen(false); };

  return (
    <nav className="bm-nav" style={{ position:"fixed", top:0, left:0, right:0, height:64, background:"var(--surface)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", zIndex:1000, boxShadow:"var(--shadow)" }}>
      <button onClick={() => go(user ? "dashboard" : "home")} style={{ display:"flex", alignItems:"center", gap:9, background:"none", border:"none", cursor:"pointer", color:"var(--primary)", padding:"4px 8px 4px 0", marginRight:8 }}>
        <BatLogo size={26} color="var(--primary)"/>
        <span style={{ fontFamily:"Outfit", fontWeight:800, fontSize:19, letterSpacing:1.5, color:"var(--primary)" }}>BATMAP</span>
      </button>

      {/* Desktop nav */}
      <div className="bm-hide-mobile" style={{ display:"flex", alignItems:"center", gap:4, flex:1 }}>
        {mapLinks.length > 0 && (
          <>
            {mapLinks.map(l => <NavBtn key={l.id} active={page===l.id} onClick={()=>go(l.id)}>{l.label}</NavBtn>)}
            <div style={{ width:1, height:22, background:"var(--border)", margin:"0 6px" }}/>
          </>
        )}
        <NavBtn active={page==="about"}   onClick={()=>go("about")}>About</NavBtn>
        <NavBtn active={page==="data"}    onClick={()=>go("data")}>Data</NavBtn>
        <NavBtn active={page==="contact"} onClick={()=>go("contact")}>Contact</NavBtn>
        <div style={{ flex:1 }}/>
        <button onClick={()=>setDark(!dark)} style={{ background:"none", border:"1px solid var(--border)", borderRadius:8, padding:"5px 10px", cursor:"pointer", color:"var(--text2)", fontSize:14, marginRight:8 }}>
          {dark ? "☀" : "◑"}
        </button>
        {user ? (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={()=>go("dashboard")} style={{ background: ROLE_COLORS[user.role]+"22", color: ROLE_COLORS[user.role], border:`1px solid ${ROLE_COLORS[user.role]}44`, borderRadius:20, padding:"4px 13px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
              {user.name.split(" ")[0]}
              <span style={{ opacity:.6, fontWeight:400, marginLeft:4, fontSize:11 }}>{ROLE_LABELS[user.role]}</span>
            </button>
            <button onClick={onLogout} style={{ background:"none", border:"1px solid var(--border)", borderRadius:8, padding:"6px 14px", cursor:"pointer", color:"var(--text2)", fontSize:13 }}>Logout</button>
          </div>
        ) : (
          <button onClick={()=>go("login")} style={{ background:"var(--primary)", color:"#fff", border:"none", borderRadius:9, padding:"9px 22px", cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:"Outfit", letterSpacing:.3 }}>
            Login
          </button>
        )}
      </div>

      {/* Mobile hamburger */}
      <div className="bm-only-mobile" style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
        <button onClick={()=>setDark(!dark)} style={{ background:"none", border:"1px solid var(--border)", borderRadius:8, padding:"5px 10px", cursor:"pointer", color:"var(--text2)", fontSize:14 }}>
          {dark ? "☀" : "◑"}
        </button>
        <button onClick={()=>setOpen(o=>!o)} aria-label="Menu" style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:8, padding:"6px 11px", cursor:"pointer", color:"var(--text)", fontSize:18, lineHeight:1 }}>
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown panel */}
      {open && (
        <div className="bm-only-mobile" style={{ position:"fixed", top:64, left:0, right:0, background:"var(--surface)", borderBottom:"1px solid var(--border)", boxShadow:"0 6px 18px rgba(0,0,0,.18)", padding:"14px 18px", zIndex:1500, display:"flex", flexDirection:"column", gap:4 }}>
          {mapLinks.map(l => (
            <button key={l.id} onClick={()=>go(l.id)} style={{ textAlign:"left", background: page===l.id?"var(--bg2)":"none", border:"none", borderRadius:8, padding:"11px 12px", cursor:"pointer", color: page===l.id?"var(--primary)":"var(--text)", fontWeight: page===l.id?600:500, fontSize:15 }}>{l.label}</button>
          ))}
          {mapLinks.length > 0 && <div style={{ height:1, background:"var(--border)", margin:"6px 0" }}/>}
          {["about","data","contact"].map(p => (
            <button key={p} onClick={()=>go(p)} style={{ textAlign:"left", background: page===p?"var(--bg2)":"none", border:"none", borderRadius:8, padding:"11px 12px", cursor:"pointer", color: page===p?"var(--primary)":"var(--text)", fontWeight: page===p?600:500, fontSize:15, textTransform:"capitalize" }}>{p}</button>
          ))}
          <div style={{ height:1, background:"var(--border)", margin:"6px 0" }}/>
          {user ? (
            <>
              <button onClick={()=>go("dashboard")} style={{ textAlign:"left", background: ROLE_COLORS[user.role]+"22", color: ROLE_COLORS[user.role], border:`1px solid ${ROLE_COLORS[user.role]}44`, borderRadius:8, padding:"10px 12px", fontSize:14, fontWeight:600, cursor:"pointer" }}>
                {user.name} · {ROLE_LABELS[user.role]}
              </button>
              <button onClick={()=>{ onLogout(); setOpen(false); }} style={{ textAlign:"left", background:"none", border:"1px solid var(--border)", borderRadius:8, padding:"10px 12px", cursor:"pointer", color:"var(--text2)", fontSize:14 }}>Logout</button>
            </>
          ) : (
            <button onClick={()=>go("login")} style={{ background:"var(--primary)", color:"#fff", border:"none", borderRadius:9, padding:"11px 16px", cursor:"pointer", fontWeight:700, fontSize:15, fontFamily:"Outfit" }}>Login</button>
          )}
        </div>
      )}
    </nav>
  );
}

function NavBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{ background: active?"var(--bg2)":"none", border:"none", borderRadius:8, padding:"7px 13px", cursor:"pointer", color: active?"var(--primary)":"var(--text2)", fontWeight: active?600:400, fontSize:14, transition:"all .12s" }}>
      {children}
    </button>
  );
}

// ── HOME PAGE ─────────────────────────────────────────────────────────────────
// Headline numbers shown on the home page and dashboard
function homeStats() {
  const D = window.BatMap;
  const sp = new Set(D.captures.map(c => c.species).filter(s => s !== "No bats" && !/^Unknown/.test(s)));
  return [
    [D.bridges.length.toLocaleString(), "Bridges"],
    [D.surveyedBridges.length.toLocaleString(), "Surveyed for Bats"],
    [D.captures.length.toLocaleString(), "Capture Records"],
    [sp.size, "Bat Species"],
  ];
}

function HomePage({ setPage }) {
  const heroRef = useRef(null);

  useEffect(() => {
    if (!heroRef.current) return;
    const map = L.map(heroRef.current, { zoomControl:false, attributionControl:false, dragging:false, scrollWheelZoom:false, doubleClickZoom:false, keyboard:false, touchZoom:false })
      .setView([40.4173, -82.9071], 7);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom:19 }).addTo(map);
    return () => map.remove();
  }, []);

  return (
    <div style={{ paddingTop:64 }}>
      {/* Hero */}
      <div style={{ position:"relative", height:"calc(100vh - 64px)", minHeight:560 }}>
        <div ref={heroRef} style={{ position:"absolute", inset:0, zIndex:0 }}/>
        <div style={{ position:"absolute", inset:0, zIndex:1, background:"linear-gradient(160deg,rgba(10,22,12,.85) 0%,rgba(10,22,12,.55) 45%,rgba(10,22,12,.82) 100%)" }}/>
        <div style={{ position:"relative", zIndex:2, height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"#fff", textAlign:"center", padding:"0 32px" }}>
          <div style={{ marginBottom:20 }}>
            <BatLogo size={72} color="#52b788"/>
          </div>
          <h1 style={{ fontFamily:"Outfit", fontWeight:800, fontSize:"clamp(52px,7vw,92px)", letterSpacing:3, color:"#dff0e2", lineHeight:1 }}>BATMAP</h1>
          <p style={{ fontSize:"clamp(15px,1.8vw,20px)", color:"rgba(220,245,225,.7)", marginTop:14, maxWidth:520, lineHeight:1.65, fontWeight:300 }}>
            Ohio's Bridge & Bat Monitoring Platform — integrating infrastructure data with wildlife conservation research.
          </p>
          <div style={{ display:"flex", gap:14, marginTop:40 }}>
            <button onClick={()=>setPage("login")} style={{ background:"#52b788", color:"#0c1a0e", border:"none", borderRadius:12, padding:"15px 40px", fontSize:17, fontWeight:700, cursor:"pointer", fontFamily:"Outfit", boxShadow:"0 4px 24px rgba(82,183,136,.45)", letterSpacing:.3 }}>
              Get Started
            </button>
            <button onClick={()=>setPage("about")} style={{ background:"rgba(255,255,255,.1)", color:"#dff0e2", border:"1px solid rgba(255,255,255,.25)", borderRadius:12, padding:"15px 40px", fontSize:17, fontWeight:500, cursor:"pointer", backdropFilter:"blur(8px)" }}>
              Learn More
            </button>
          </div>
          <div style={{ display:"flex", gap:56, marginTop:60, paddingTop:28, borderTop:"1px solid rgba(255,255,255,.12)" }}>
            {homeStats().map(([n,l]) => (
              <div key={l} style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"Outfit", fontSize:30, fontWeight:700, color:"#74c69d" }}>{n}</div>
                <div style={{ fontSize:11, color:"rgba(220,245,225,.55)", marginTop:4, letterSpacing:.5, textTransform:"uppercase" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div style={{ background:"var(--bg)", padding:"80px 32px" }}>
        <h2 style={{ fontFamily:"Outfit", fontSize:34, fontWeight:700, textAlign:"center", marginBottom:48, color:"var(--text)" }}>Platform Features</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:24, maxWidth:1040, margin:"0 auto" }}>
          {[
            { title:"Bat Activity Monitoring", desc:"Real-time acoustic detection and GPS tracking of bat populations at 20+ sites across Ohio using calibrated ultrasonic detectors." },
            { title:"Bridge Infrastructure", desc:"ODOT bridge inspection records integrated with bat habitat data — understanding how infrastructure supports local bat populations." },
            { title:"Research Analytics", desc:"Trend analysis, species distribution maps, and exportable datasets for wildlife researchers, conservationists, and state agencies." },
          ].map((f,i) => (
            <div key={f.title} style={{ background:"var(--surface)", borderRadius:16, padding:32, border:"1px solid var(--border)", boxShadow:"var(--shadow)" }}>
              <div style={{ width:40, height:40, borderRadius:10, background:"var(--bg2)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
                <BatLogo size={22} color="var(--primary)"/>
              </div>
              <h3 style={{ fontFamily:"Outfit", fontSize:19, fontWeight:600, color:"var(--text)", marginBottom:10 }}>{f.title}</h3>
              <p style={{ color:"var(--text2)", lineHeight:1.7, fontSize:14 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── LOGIN PAGE ────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = (em, pw) => {
    setError(""); setLoading(true);
    setTimeout(() => {
      const u = USERS[em];
      if (u && u.password === pw) { onLogin({ ...u, email: em }); }
      else { setError("Invalid credentials. Try the demo buttons below."); setLoading(false); }
    }, 500);
  };

  const inp = { width:"100%", padding:"11px 15px", borderRadius:9, border:"1px solid var(--border)", background:"var(--bg2)", color:"var(--text)", fontSize:14, outline:"none", fontFamily:"Inter" };

  const demos = [
    { email:"developer@batmap.com",  label:"Developer",     sub:"All maps + dashboard" },
    { email:"odot@batmap.com",       label:"ODOT Staff",    sub:"Bridges map only" },
    { email:"researcher@batmap.com", label:"Researcher",    sub:"Bat maps + analytics" },
    { email:"admin@batmap.com",      label:"Administrator", sub:"Full access" },
  ];

  return (
    <div style={{ minHeight:"100vh", display:"flex", paddingTop:64, background:"var(--bg)" }}>
      {/* Left panel */}
      <div style={{ flex:1, background:"var(--primary)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:48, color:"#fff" }}>
        <BatLogo size={64} color="rgba(255,255,255,.9)"/>
        <h1 style={{ fontFamily:"Outfit", fontSize:40, fontWeight:800, marginTop:16, letterSpacing:2, color:"#dff0e2" }}>BATMAP</h1>
        <p style={{ opacity:.7, marginTop:10, fontSize:15, textAlign:"center", maxWidth:280, lineHeight:1.6 }}>Ohio Bridge & Bat Monitoring Platform</p>
        <div style={{ marginTop:48, display:"flex", flexDirection:"column", gap:14 }}>
          {[["Bat Activity Tracking","Real-time acoustic detection"],["Bridge Monitoring","ODOT inspection data"],["Species Research","Conservation analytics"]].map(([t,d]) => (
            <div key={t} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#74c69d", marginTop:6, flexShrink:0 }}/>
              <div>
                <div style={{ fontWeight:600, fontSize:14, color:"#dff0e2" }}>{t}</div>
                <div style={{ fontSize:13, opacity:.65, marginTop:2 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:48 }}>
        <div style={{ width:"100%", maxWidth:400 }}>
          <h2 style={{ fontFamily:"Outfit", fontSize:28, fontWeight:700, color:"var(--text)", marginBottom:6 }}>Sign In</h2>
          <p style={{ color:"var(--text2)", fontSize:14, marginBottom:28 }}>Access your monitoring dashboard</p>

          <form onSubmit={e=>{e.preventDefault();doLogin(email,pass);}} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:"var(--text2)", marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} style={inp} placeholder="you@organization.gov"/>
            </div>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:"var(--text2)", marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Password</label>
              <input type="password" value={pass} onChange={e=>setPass(e.target.value)} style={inp} placeholder="••••••••"/>
            </div>
            {error && <div style={{ background:"rgba(220,38,38,.08)", border:"1px solid rgba(220,38,38,.2)", borderRadius:8, padding:"10px 13px", color:"#dc2626", fontSize:13 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ background:"var(--primary)", color:"#fff", border:"none", borderRadius:9, padding:"13px", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"Outfit", opacity:loading?.7:1, marginTop:4 }}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div style={{ display:"flex", alignItems:"center", gap:10, margin:"24px 0 16px" }}>
            <div style={{ flex:1, height:1, background:"var(--border)" }}/>
            <span style={{ fontSize:12, color:"var(--text2)", whiteSpace:"nowrap" }}>Quick demo access</span>
            <div style={{ flex:1, height:1, background:"var(--border)" }}/>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {demos.map(d => (
              <button key={d.email} onClick={()=>doLogin(d.email,"demo")} style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:9, padding:"10px 12px", cursor:"pointer", textAlign:"left", transition:"border-color .15s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor="var(--primary)"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                <div style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>{d.label}</div>
                <div style={{ fontSize:11, color:"var(--text2)", marginTop:2 }}>{d.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DASHBOARD (post-login) ────────────────────────────────────────────────────
function DashboardPage({ user, setPage }) {
  const cards = [
    { id:"map-bat",      label:"Bat Activity Map",   desc:"Bridge survey results by year & species", color:"#2d6a4f" },
    { id:"map-bridges",  label:"Bridges Map",         desc:"ODOT bridges & bat survey details",  color:"#2a6b7c" },
    { id:"map-battype",  label:"Bat Species Map",     desc:"Species distribution & range mapping",     color:"#5b3d8a" },
    { id:"viz",          label:"Analytics Dashboard", desc:"Trends, charts & research summaries",      color:"#7c5a2a" },
    { id:"data",         label:"Data Portal",         desc:"Browse & export raw monitoring datasets",  color:"#3a6b3a" },
  ].filter(c => ROLE_ACCESS[user.role].includes(c.id));

  const D = window.BatMap;
  const alerts = [
    ...D.meta.sources.map(src => ({ msg:`${src.what}: ${src.rows.toLocaleString()} rows`, time:src.file })),
    { msg:`${D.meta.projectsLocated} of ${D.projects.length} capture projects have a map location`, time:"Fill in project_locations.csv to map captures" },
  ];

  return (
    <div style={{ paddingTop:64, minHeight:"100vh", background:"var(--bg)" }}>
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"44px 28px" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:36 }}>
          <div>
            <h1 style={{ fontFamily:"Outfit", fontSize:30, fontWeight:700, color:"var(--text)" }}>Welcome back, {user.name.split(" ")[0]}</h1>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
              <span style={{ background: ROLE_COLORS[user.role]+"22", color: ROLE_COLORS[user.role], border:`1px solid ${ROLE_COLORS[user.role]}44`, borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:600 }}>{ROLE_LABELS[user.role]}</span>
              <span style={{ color:"var(--text2)", fontSize:13 }}>{user.email}</span>
            </div>
          </div>
          <div style={{ fontSize:13, color:"var(--text2)", textAlign:"right" }}>
            <div style={{ fontWeight:600, color:"var(--text)" }}>Data snapshot</div>
            <div style={{ marginTop:3 }}>Built {D.meta.built}</div>
          </div>
        </div>

        {/* Stat strip */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:36 }}>
          {[
            [D.bridges.length.toLocaleString(),"Bridges","#2a6b7c"],
            [D.surveyedBridges.length.toLocaleString(),"Surveyed Bridges","#52b788"],
            [D.captures.length.toLocaleString(),"Capture Records","#5b3d8a"],
            [String(homeStats()[3][0]),"Species Captured","#2d6a4f"],
          ].map(([n,l,c]) => (
            <div key={l} style={{ background:"var(--surface)", borderRadius:12, padding:"18px 22px", border:"1px solid var(--border)" }}>
              <div style={{ fontFamily:"Outfit", fontSize:30, fontWeight:700, color:c }}>{n}</div>
              <div style={{ fontSize:13, color:"var(--text2)", marginTop:4 }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:24 }}>
          {/* Map/tool cards */}
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:"var(--text2)", letterSpacing:.6, textTransform:"uppercase", marginBottom:14 }}>Your Access</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:14 }}>
              {cards.map(c => (
                <button key={c.id} onClick={()=>setPage(c.id)}
                  style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:22, cursor:"pointer", textAlign:"left", transition:"all .18s", boxShadow:"var(--shadow)" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=c.color;e.currentTarget.style.transform="translateY(-2px)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.transform="none";}}>
                  <div style={{ width:36, height:36, borderRadius:9, background:c.color+"18", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
                    <BatLogo size={18} color={c.color}/>
                  </div>
                  <div style={{ fontFamily:"Outfit", fontSize:15, fontWeight:600, color:"var(--text)", marginBottom:5 }}>{c.label}</div>
                  <div style={{ fontSize:12, color:"var(--text2)", lineHeight:1.5 }}>{c.desc}</div>
                  <div style={{ marginTop:14, fontSize:12, fontWeight:600, color:c.color }}>Open →</div>
                </button>
              ))}
            </div>
          </div>

          {/* Activity feed */}
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:"var(--text2)", letterSpacing:.6, textTransform:"uppercase", marginBottom:14 }}>Data Sources</div>
            <div style={{ background:"var(--surface)", borderRadius:14, border:"1px solid var(--border)", overflow:"hidden" }}>
              {alerts.map((a,i) => (
                <div key={i} style={{ padding:"14px 18px", borderBottom: i<alerts.length-1 ? "1px solid var(--border)" : "none", display:"flex", alignItems:"flex-start", gap:10 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:"var(--accent)", marginTop:5, flexShrink:0 }}/>
                  <div>
                    <div style={{ fontSize:13, color:"var(--text)", lineHeight:1.45 }}>{a.msg}</div>
                    <div style={{ fontSize:11, color:"var(--text2)", marginTop:3 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ABOUT PAGE ────────────────────────────────────────────────────────────────
function AboutPage() {
  const sections = [
    { title:"Our Mission", body:"BATMAP bridges the gap between infrastructure monitoring and wildlife conservation. By integrating ODOT bridge inspection records with acoustic bat detection networks, we provide a unified platform for understanding how Ohio's bat populations interact with its built environment." },
    { title:"What We Monitor", body:"Ohio is home to 11 bat species. BATMAP tracks five key species: Big Brown Bat, Little Brown Bat, Indiana Bat (federally endangered), Tri-colored Bat, and Eastern Small-footed Bat across 20 acoustic monitoring stations statewide." },
    { title:"Data Sources", body:"Bridge data originates from ODOT's National Bridge Inventory. Bat detection data is sourced from ultrasonic monitoring stations. GPS collar data provides individual movement tracks for research subjects. Data is refreshed nightly." },
    { title:"Partners", body:"BATMAP is a collaboration between the Ohio Department of Transportation (ODOT), Ohio State University's Wildlife Research Program, and the Ohio Division of Wildlife." },
  ];
  return (
    <div style={{ paddingTop:64, minHeight:"100vh", background:"var(--bg)" }}>
      <div style={{ maxWidth:780, margin:"0 auto", padding:"60px 28px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:8 }}>
          <BatLogo size={44} color="var(--primary)"/>
          <h1 style={{ fontFamily:"Outfit", fontSize:38, fontWeight:800, color:"var(--text)" }}>About BATMAP</h1>
        </div>
        <p style={{ color:"var(--primary)", fontSize:16, fontWeight:500, marginBottom:40, marginLeft:60 }}>Ohio Bridge & Bat Monitoring Platform</p>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {sections.map(s => (
            <div key={s.title} style={{ background:"var(--surface)", borderRadius:14, padding:28, border:"1px solid var(--border)" }}>
              <h2 style={{ fontFamily:"Outfit", fontSize:20, fontWeight:600, color:"var(--primary)", marginBottom:10 }}>{s.title}</h2>
              <p style={{ color:"var(--text2)", lineHeight:1.75, fontSize:15 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CONTACT PAGE ──────────────────────────────────────────────────────────────
function ContactPage() {
  const [form, setForm] = useState({ name:"", email:"", org:"", message:"" });
  const [sent, setSent] = useState(false);
  const inp = { width:"100%", padding:"11px 15px", borderRadius:9, border:"1px solid var(--border)", background:"var(--bg2)", color:"var(--text)", fontSize:14, outline:"none", fontFamily:"Inter" };
  return (
    <div style={{ paddingTop:64, minHeight:"100vh", background:"var(--bg)" }}>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"60px 28px" }}>
        <h1 style={{ fontFamily:"Outfit", fontSize:36, fontWeight:700, color:"var(--text)", marginBottom:6 }}>Contact Us</h1>
        <p style={{ color:"var(--text2)", fontSize:15, marginBottom:36 }}>Questions, data requests, or research partnerships — reach out below.</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:32 }}>
          {[["General Inquiries","info@batmap.ohio.gov"],["Technical Support","support@batmap.ohio.gov"],["ODOT Data Requests","odot-data@ohio.gov"],["Research Partnerships","research@batmap.ohio.gov"]].map(([l,e]) => (
            <div key={l} style={{ background:"var(--surface)", borderRadius:11, padding:"16px 20px", border:"1px solid var(--border)" }}>
              <div style={{ fontSize:12, color:"var(--text2)", marginBottom:4 }}>{l}</div>
              <div style={{ color:"var(--primary)", fontWeight:500, fontSize:14 }}>{e}</div>
            </div>
          ))}
        </div>
        {sent ? (
          <div style={{ background:"var(--surface)", borderRadius:16, padding:48, textAlign:"center", border:"1px solid var(--border)" }}>
            <div style={{ fontSize:44, marginBottom:12, color:"var(--primary)" }}>✓</div>
            <h2 style={{ fontFamily:"Outfit", fontSize:22, fontWeight:600, color:"var(--text)", marginBottom:8 }}>Message Sent</h2>
            <p style={{ color:"var(--text2)" }}>We'll respond within 2 business days.</p>
          </div>
        ) : (
          <form onSubmit={e=>{e.preventDefault();setSent(true);}} style={{ background:"var(--surface)", borderRadius:16, padding:32, border:"1px solid var(--border)", display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><label style={{ display:"block", fontSize:12, fontWeight:600, color:"var(--text2)", marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp} required/></div>
              <div><label style={{ display:"block", fontSize:12, fontWeight:600, color:"var(--text2)", marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Email</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} style={inp} required/></div>
            </div>
            <div><label style={{ display:"block", fontSize:12, fontWeight:600, color:"var(--text2)", marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Organization</label><input value={form.org} onChange={e=>setForm({...form,org:e.target.value})} style={inp}/></div>
            <div><label style={{ display:"block", fontSize:12, fontWeight:600, color:"var(--text2)", marginBottom:5, textTransform:"uppercase", letterSpacing:.5 }}>Message</label><textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})} rows={5} style={{...inp,resize:"vertical"}} required/></div>
            <button type="submit" style={{ background:"var(--primary)", color:"#fff", border:"none", borderRadius:9, padding:"13px", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"Outfit" }}>Send Message</button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── DATA PAGE ─────────────────────────────────────────────────────────────────
// ── DATA PORTAL ───────────────────────────────────────────────────────────────
// Column definitions per table. "csv" overrides the exported value when needed.
function portalTables() {
  const D = window.BatMap;
  const sp = ids => ids.map(id => D.nameFor(id)).join(", ");
  return {
    bridges: {
      label: "Bridges",
      rows: D.bridges,
      search: b => `${b.sfn} ${b.road||""} ${b.feature||""} ${b.county||""}`,
      columns: [
        { key:"sfn", label:"SFN" },
        { key:"road", label:"Road" },
        { key:"feature", label:"Over" },
        { key:"county", label:"County" },
        { key:"district", label:"District" },
        { key:"yearBuilt", label:"Built" },
        { key:"designType", label:"Design" },
        { key:"occurrenceRank", label:"Occurrence ranking" },
        { key:"surveys", label:"Surveys", show: b => b.surveys.length, csv: b => b.surveys.length },
        { key:"speciesFound", label:"Species found", show: b => b.surveys.length ? (sp(b.speciesFound) || "None seen") : "—", csv: b => sp(b.speciesFound) },
        { key:"material", label:"Material", hidden:true },
        { key:"serviceOn", label:"Service on", hidden:true },
        { key:"serviceUnder", label:"Service under", hidden:true },
        { key:"routeOwner", label:"Route owner", hidden:true },
        { key:"maintainedBy", label:"Maintained by", hidden:true },
        { key:"length", label:"Length", hidden:true },
        { key:"deckArea", label:"Deck area", hidden:true },
        { key:"mainMember", label:"Main member", hidden:true },
        { key:"lat", label:"Latitude", hidden:true },
        { key:"lon", label:"Longitude", hidden:true },
        { key:"coordStatus", label:"Coordinate status", hidden:true },
      ],
      toggle: { label:"Surveyed only", test: b => b.surveys.length > 0 },
    },
    surveys: {
      label: "Bridge Surveys",
      rows: D.surveys,
      search: s => `${s.sfn} ${s.speciesText||""} ${s.type||""} ${(D.bridgeBySfn[s.sfn]||{}).road||""}`,
      columns: [
        { key:"date", label:"Date" },
        { key:"sfn", label:"SFN" },
        { key:"road", label:"Road", show: s => (D.bridgeBySfn[s.sfn]||{}).road, csv: s => (D.bridgeBySfn[s.sfn]||{}).road },
        { key:"county", label:"County", show: s => (D.bridgeBySfn[s.sfn]||{}).county, csv: s => (D.bridgeBySfn[s.sfn]||{}).county },
        { key:"type", label:"Survey type" },
        { key:"speciesText", label:"Bat species" },
        { key:"batsSeen", label:"Number of bats seen" },
        { key:"idMethod", label:"ID method" },
      ],
      toggle: { label:"Bats found only", test: s => s.species.length > 0 },
    },
    captures: {
      label: "Capture Records",
      rows: D.captures,
      search: c => `${c.species} ${D.nameFor(c.species)} ${c.project||""} ${c.date||""}`,
      columns: [
        { key:"date", label:"Date" },
        { key:"species", label:"Species", show: c => D.nameFor(c.species), csv: c => D.nameFor(c.species) },
        { key:"scientific", label:"Scientific name", show: c => <i>{c.species}</i>, csv: c => c.species },
        { key:"age", label:"Age" },
        { key:"sex", label:"Sex" },
        { key:"repro", label:"Reproductive" },
        { key:"forearm", label:"Forearm" },
        { key:"mass", label:"Mass" },
        { key:"band", label:"Band" },
        { key:"project", label:"Project" },
      ],
      toggle: { label:"Exclude 'No bats'", test: c => c.species !== "No bats" },
    },
  };
}

function DataPage() {
  const tables = React.useMemo(portalTables, []);
  const [tab, setTab] = useState("bridges");
  const [filter, setFilter] = useState("");
  const [onlyToggle, setOnlyToggle] = useState(false);
  const [page, setPage] = useState(0);
  const PER = 50;
  const T = tables[tab];

  const rows = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    return T.rows.filter(r => (!onlyToggle || T.toggle.test(r)) && (!q || T.search(r).toLowerCase().includes(q)));
  }, [tab, filter, onlyToggle]);

  useEffect(() => { setPage(0); }, [tab, filter, onlyToggle]);

  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const view = rows.slice(page * PER, page * PER + PER);
  const cols = T.columns.filter(c => !c.hidden);
  const cell = (c, r) => { const v = c.show ? c.show(r) : r[c.key]; return v === null || v === undefined || v === "" ? "—" : v; };

  const th = { padding:"11px 14px", textAlign:"left", fontSize:11, fontWeight:700, color:"var(--text2)", borderBottom:"1px solid var(--border)", textTransform:"uppercase", letterSpacing:.5, whiteSpace:"nowrap" };
  const td = { padding:"10px 14px", fontSize:13, color:"var(--text)", borderBottom:"1px solid var(--border)" };
  const pgBtn = { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:7, padding:"6px 12px", cursor:"pointer", color:"var(--text)", fontSize:13 };

  const exportCSV = () => {
    const stamp = new Date().toISOString().slice(0,10);
    window.BatMapStore.downloadCSV(`batmap_${tab}_${stamp}.csv`, rows, T.columns);
  };

  return (
    <div style={{ paddingTop:64, minHeight:"100vh", background:"var(--bg)" }}>
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"40px 28px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, gap:16, flexWrap:"wrap" }}>
          <div>
            <h1 style={{ fontFamily:"Outfit", fontSize:30, fontWeight:700, color:"var(--text)" }}>Data Portal</h1>
            <p style={{ color:"var(--text2)", fontSize:14, marginTop:4 }}>Browse and export monitoring datasets · built {window.BatMap.meta.built}</p>
          </div>
          <button onClick={exportCSV} style={{ background:"var(--primary)", color:"#fff", border:"none", borderRadius:9, padding:"10px 22px", cursor:"pointer", fontWeight:600, fontSize:14 }}>
            Export CSV ({rows.length.toLocaleString()} rows) ↓
          </button>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
          {Object.entries(tables).map(([t, cfg]) => (
            <button key={t} onClick={()=>{ setTab(t); setFilter(""); setOnlyToggle(false); }} style={{ background: tab===t ? "var(--primary)" : "var(--surface)", color: tab===t ? "#fff" : "var(--text2)", border:"1px solid var(--border)", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontWeight: tab===t ? 600 : 400, fontSize:14 }}>
              {cfg.label} <span style={{ opacity:.7, fontSize:12 }}>{cfg.rows.length.toLocaleString()}</span>
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:14, flexWrap:"wrap" }}>
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search…"
            style={{ flex:1, minWidth:220, padding:"11px 15px", borderRadius:9, border:"1px solid var(--border)", background:"var(--bg2)", color:"var(--text)", fontSize:14, outline:"none", fontFamily:"Inter" }}/>
          <label style={{ display:"flex", alignItems:"center", gap:7, fontSize:13, color:"var(--text2)", cursor:"pointer" }}>
            <input type="checkbox" checked={onlyToggle} onChange={e=>setOnlyToggle(e.target.checked)} style={{ accentColor:"var(--primary)" }}/>
            {T.toggle.label}
          </label>
        </div>
        <div style={{ background:"var(--surface)", borderRadius:14, border:"1px solid var(--border)", overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ background:"var(--bg2)" }}>{cols.map(c => <th key={c.key} style={th}>{c.label}</th>)}</tr></thead>
            <tbody>
              {view.map((r, i) => (
                <tr key={i} onMouseEnter={e=>e.currentTarget.style.background="var(--bg2)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  {cols.map(c => <td key={c.key} style={td}>{cell(c, r)}</td>)}
                </tr>
              ))}
              {!view.length && <tr><td style={{ ...td, color:"var(--text2)" }} colSpan={cols.length}>No rows match.</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:14, fontSize:13, color:"var(--text2)" }}>
          <span>{rows.length ? `${(page*PER+1).toLocaleString()} to ${Math.min(rows.length,(page+1)*PER).toLocaleString()} of ${rows.length.toLocaleString()}` : "0 rows"}</span>
          <div style={{ display:"flex", gap:6 }}>
            <button style={pgBtn} disabled={page===0} onClick={()=>setPage(0)}>«</button>
            <button style={pgBtn} disabled={page===0} onClick={()=>setPage(p=>p-1)}>‹ Prev</button>
            <span style={{ padding:"6px 8px" }}>Page {page+1} of {pages.toLocaleString()}</span>
            <button style={pgBtn} disabled={page>=pages-1} onClick={()=>setPage(p=>p+1)}>Next ›</button>
            <button style={pgBtn} disabled={page>=pages-1} onClick={()=>setPage(pages-1)}>»</button>
          </div>
        </div>
        {tab === "bridges" && <p style={{ fontSize:12, color:"var(--text2)", marginTop:12 }}>Export includes all bridge fields, not only the columns shown.</p>}
      </div>
    </div>
  );
}

// ── EXPORTS ───────────────────────────────────────────────────────────────────
Object.assign(window, {
  USERS, ROLE_ACCESS, ROLE_LABELS, ROLE_COLORS,
  BatLogo, Nav, NavBtn,
  HomePage, LoginPage, DashboardPage, AboutPage, ContactPage, DataPage,
});
