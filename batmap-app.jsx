// batmap-app.jsx — App router, state, Tweaks panel
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "darkMode": false,
  "defaultZoom": 7
}/*EDITMODE-END*/;

function App() {
  const [page, setPage]           = useState("home");
  const [user, setUser]           = useState(null);
  const [dark, setDark]           = useState(TWEAK_DEFAULTS.darkMode);
  const [tweaks, setTweaks]       = useState(false);

  // Apply dark class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Tweaks panel protocol
  useEffect(() => {
    const handler = e => {
      if (e.data?.type === "__activate_edit_mode")   setTweaks(true);
      if (e.data?.type === "__deactivate_edit_mode") setTweaks(false);
    };
    window.addEventListener("message", handler);
    window.parent.postMessage({ type:"__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  const login  = userData => { setUser(userData); setPage("dashboard"); };
  const logout = ()        => { setUser(null);     setPage("home"); };

  const nav = pg => {
    const pub = ["home","about","data","contact","login"];
    if (!user && !pub.includes(pg)) { setPage("login"); return; }
    if (user && !pub.includes(pg) && !ROLE_ACCESS[user.role].includes(pg)) return;
    setPage(pg);
  };

  const pages = {
    home:         <HomePage     setPage={nav}/>,
    login:        <LoginPage    onLogin={login}/>,
    dashboard:    user ? <DashboardPage user={user} setPage={nav}/> : <LoginPage onLogin={login}/>,
    "map-bat":    <MapBat/>,
    "map-bridges":<MapBridges/>,
    "map-battype":<MapBatType/>,
    viz:          <VizDashboard/>,
    about:        <AboutPage/>,
    contact:      <ContactPage/>,
    data:         <DataPage/>,
  };

  return (
    <div>
      <Nav page={page} setPage={nav} user={user} onLogout={logout} dark={dark} setDark={setDark}/>
      {pages[page] || pages.home}

      {tweaks && (
        <div style={{ position:"fixed", bottom:20, right:20, width:284, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:22, boxShadow:"0 8px 32px rgba(0,0,0,.22)", zIndex:9999 }}>
          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <BatLogo size={18} color="var(--primary)"/>
              <span style={{ fontFamily:"Outfit", fontWeight:700, fontSize:15, color:"var(--text)" }}>Tweaks</span>
            </div>
            <button onClick={()=>{ setTweaks(false); window.parent.postMessage({type:"__edit_mode_dismissed"},"*"); }}
              style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text2)", fontSize:18, lineHeight:1 }}>✕</button>
          </div>

          {/* Dark mode toggle */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18, paddingBottom:18, borderBottom:"1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:500, color:"var(--text)" }}>Dark Mode</div>
              <div style={{ fontSize:11, color:"var(--text2)", marginTop:2 }}>{dark ? "Dark / night theme" : "Light / nature theme"}</div>
            </div>
            <div onClick={()=>{ const nd=!dark; setDark(nd); window.parent.postMessage({type:"__edit_mode_set_keys",edits:{darkMode:nd}},"*"); }}
              style={{ width:42, height:24, borderRadius:12, background:dark?"var(--primary)":"var(--border)", position:"relative", cursor:"pointer", transition:"background .2s", flexShrink:0 }}>
              <div style={{ position:"absolute", top:3, left:dark?20:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 4px rgba(0,0,0,.2)" }}/>
            </div>
          </div>

          {/* Navigate */}
          <div style={{ marginBottom:18, paddingBottom:18, borderBottom:"1px solid var(--border)" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--text2)", letterSpacing:.6, textTransform:"uppercase", marginBottom:10 }}>Navigate</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              {["home","about","data","contact"].map(p => (
                <button key={p} onClick={()=>nav(p)} style={{ background: page===p?"var(--primary)":"var(--bg2)", color: page===p?"#fff":"var(--text2)", border:"1px solid var(--border)", borderRadius:7, padding:"7px 10px", cursor:"pointer", fontSize:12, textTransform:"capitalize", fontWeight: page===p?600:400 }}>{p}</button>
              ))}
            </div>
          </div>

          {/* Quick login */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--text2)", letterSpacing:.6, textTransform:"uppercase", marginBottom:10 }}>Login As</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {Object.entries(USERS).map(([email, u]) => (
                <button key={email} onClick={()=>login({...u,email})}
                  style={{ background: user?.email===email ? "var(--primary)" : "var(--bg2)", color: user?.email===email ? "#fff" : "var(--text)", border:"1px solid var(--border)", borderRadius:7, padding:"8px 12px", cursor:"pointer", textAlign:"left", fontSize:12, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontWeight:500 }}>{u.name}</span>
                  <span style={{ opacity:.65, fontSize:11 }}>{ROLE_LABELS[u.role]}</span>
                </button>
              ))}
              {user && (
                <button onClick={logout} style={{ background:"none", border:"1px solid var(--border)", borderRadius:7, padding:"7px 12px", cursor:"pointer", color:"var(--text2)", fontSize:12, marginTop:2 }}>
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
