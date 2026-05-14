import{useState}from"react";
import{login}from"../api";
import{saveToken}from"../auth";

export default function Login({onLogin}){
  const[identifier,setIdentifier]=useState("");
  const[pass,setPass]=useState("");
  const[err,setErr]=useState("");
  const[loading,setLoading]=useState(false);

  async function submit(){
    if(!identifier||!pass){setErr("Login ID or email and password required.");return;}
    setLoading(true);setErr("");
    try{
      const{data}=await login(identifier,pass);
      saveToken(data.access_token,data.role,data.clinic_id);
      onLogin(data.role);
    }catch(error){
      const message =
        error?.response?.status >= 500
          ? "Backend is unavailable right now. Please try again in a moment."
          : error?.response?.data?.detail || "Invalid login ID, email, or password.";
      setErr(message);
    }finally{
      setLoading(false);
    }
  }

  return(
    <div style={s.page}>
      <section style={s.story}>
        <div style={s.logoRow}>
          <img src="/logo.png" alt="DocNudge" style={s.logoImg} />
          <div>
            <div style={s.brand}>DocNudge</div>
            <div style={s.tag}>Clinic OS Workspace</div>
          </div>
        </div>
        <h1 style={s.h1}>A connected workspace for modern clinics.</h1>
        <p style={s.copy}>Manage appointments, patient records, AI prescriptions, WhatsApp reminders, and recovery workflows from one calm DocNudge screen.</p>
        <div style={s.panel}>
          <div style={s.panelTitle}>Workspace Status</div>
          <div style={s.signal}><span>Appointments</span><b>Live</b></div>
          <div style={s.signal}><span>Patient records</span><b>Synced</b></div>
          <div style={s.signal}><span>Reminder engine</span><b>Ready</b></div>
        </div>
      </section>
      <section style={s.card}>
        <div>
          <h2 style={s.h2}>Sign in to DocNudge</h2>
          <p style={s.sub}>Enter your doctor or admin workspace with your login ID or email.</p>
        </div>
        <label style={s.field}>Login ID or email<input style={s.input} value={identifier} onChange={e=>setIdentifier(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="admin@docnudge.in or dr-niharika-reddy"/></label>
        <label style={s.field}>Password<input style={s.input} type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Password"/></label>
        {err&&<div style={s.error}>{err}</div>}
        <button style={s.button} onClick={submit} disabled={loading}>{loading?"Signing in...":"Enter Workspace"}</button>
      </section>
    </div>
  );
}

const s={
  page:{minHeight:"100vh",display:"grid",gridTemplateColumns:"1fr 430px",background:"#eef2f6"},
  story:{background:"linear-gradient(135deg,#07305b,#08787e)",color:"#fff",padding:"58px 52px",display:"flex",flexDirection:"column",justifyContent:"center"},
  logoRow:{display:"flex",alignItems:"center",gap:12,marginBottom:42},
  mark:{width:44,height:44,borderRadius:14,background:"#f8fafc",color:"#111827",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13},
  logoImg:{width:48,height:48,borderRadius:14,background:"#fff",objectFit:"contain",border:"1px solid rgba(255,255,255,0.24)"},
  brand:{fontSize:24,fontWeight:900,letterSpacing:0},
  tag:{fontSize:12,color:"#a7f3f5",fontWeight:800,marginTop:2},
  h1:{fontSize:40,lineHeight:1.08,maxWidth:600,margin:0,letterSpacing:0},
  copy:{fontSize:15,lineHeight:1.7,color:"#cbd5e1",maxWidth:520,marginTop:16},
  panel:{marginTop:34,maxWidth:420,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.06)",borderRadius:18,padding:16},
  panelTitle:{fontSize:12,textTransform:"uppercase",fontWeight:900,color:"#a7f3f5",marginBottom:10,letterSpacing:0},
  signal:{display:"flex",justifyContent:"space-between",borderTop:"1px solid rgba(255,255,255,0.08)",padding:"11px 0",fontSize:14,color:"#e2e8f0"},
  card:{background:"#fff",borderLeft:"1px solid #e5e7eb",padding:38,display:"flex",flexDirection:"column",justifyContent:"center",gap:17,boxShadow:"-20px 0 50px rgba(15,23,42,0.06)"},
  h2:{fontSize:25,margin:0,letterSpacing:0},
  sub:{fontSize:13,color:"#64748b",marginTop:5},
  field:{display:"flex",flexDirection:"column",gap:7,fontSize:12,fontWeight:900,color:"#475569"},
  input:{height:46,border:"1px solid #d8dee8",borderRadius:12,padding:"0 13px",fontSize:14,outline:"none",background:"#f8fafc"},
  button:{height:46,border:"none",borderRadius:12,background:"linear-gradient(135deg,#0c447c,#11a7ad)",color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer",boxShadow:"0 12px 24px rgba(12,68,124,0.22)"},
  error:{background:"#fef2f2",border:"1px solid #fecaca",color:"#991b1b",borderRadius:12,padding:"11px 13px",fontWeight:800}
};
