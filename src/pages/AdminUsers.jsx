import{useEffect,useState}from"react";
import{getClinics,createUser}from"../api";
export default function AdminUsers(){
  const[clinics,setClinics]=useState([]);
  const[form,setForm]=useState({email:"",password:"",role:"receptionist",clinic_id:""});
  const[status,setStatus]=useState(null);
  useEffect(()=>{getClinics().then(r=>setClinics(r.data));},[]);
  const set=f=>e=>setForm(p=>({...p,[f]:e.target.value}));
  async function submit(){try{await createUser({...form,clinic_id:form.clinic_id?parseInt(form.clinic_id):null});setStatus({ok:true,msg:`User "${form.email}" created.`});setForm({email:"",password:"",role:"receptionist",clinic_id:""});}catch(e){setStatus({ok:false,msg:e.response?.data?.detail||"Failed."}); }}
  return(
    <div>
      <div style={{marginBottom:20}}><div style={{fontSize:17,fontWeight:600,color:"#111827"}}>User Management</div><div style={{fontSize:12.5,color:"#6b7280",marginTop:3}}>Create login accounts for clinic staff.</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 220px",gap:16,maxWidth:740}}>
        <div style={{background:"#fff",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden"}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid var(--border)",fontSize:13.5,fontWeight:600}}>Create User Account</div>
          <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><F label="Email"><input style={inp} type="email" placeholder="reception@clinic.com" value={form.email} onChange={set("email")}/></F><F label="Password"><input style={inp} type="password" placeholder="Strong password" value={form.password} onChange={set("password")}/></F></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><F label="Role"><select style={sel} value={form.role} onChange={set("role")}><option value="receptionist">Receptionist</option><option value="admin">Admin</option></select></F><F label="Clinic"><select style={sel} value={form.clinic_id} onChange={set("clinic_id")}><option value="">— Admin (no clinic) —</option>{clinics.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></F></div>
            {status&&<div style={{padding:"10px 14px",borderRadius:8,fontSize:12.5,fontWeight:500,background:status.ok?"#ecfdf5":"#fef2f2",color:status.ok?"#065f46":"#991b1b",border:`1px solid ${status.ok?"#6ee7b7":"#fca5a5"}`}}>{status.ok?"✓ ":"✗ "}{status.msg}</div>}
          </div>
          <div style={{padding:"14px 20px",borderTop:"1px solid var(--border)",display:"flex",justifyContent:"flex-end"}}><button style={{padding:"9px 20px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#1a56db,#0d9488)",color:"white",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"Inter,sans-serif"}} onClick={submit}>Create Account →</button></div>
        </div>
        <div style={{background:"#fff",border:"1px solid var(--border)",borderRadius:14,padding:16}}>
          <div style={{fontSize:13,fontWeight:600,color:"#111827",marginBottom:12}}>Role Permissions</div>
          <div style={{fontSize:12.5,color:"#111827",lineHeight:1.6,marginBottom:8,paddingBottom:8,borderBottom:"1px solid #f1f5f9"}}><strong>Admin</strong> — all clinics, all patients, create users</div>
          <div style={{fontSize:12.5,color:"#111827",lineHeight:1.6,marginBottom:12}}><strong>Receptionist</strong> — only their assigned clinic</div>
          <div style={{background:"#f0fdfa",border:"1px solid rgba(13,148,136,0.2)",borderRadius:8,padding:12,fontSize:12.5,color:"#0d9488"}}>Login URL:<br/><strong>dashboard.docnudge.in</strong></div>
        </div>
      </div>
    </div>
  );
}
function F({label,children}){return<div style={{display:"flex",flexDirection:"column",gap:5}}><label style={{fontSize:12,color:"#6b7280",fontWeight:500}}>{label}</label>{children}</div>;}
const inp={padding:"9px 12px",border:"1px solid var(--border)",borderRadius:8,fontSize:13.5,fontFamily:"Inter,sans-serif",color:"#111827",outline:"none",width:"100%"};
const sel={...inp,background:"#fff"};
