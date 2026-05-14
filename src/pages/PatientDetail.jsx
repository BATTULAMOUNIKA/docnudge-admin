import{useEffect,useState}from"react";
import{getVisits,updateVisitStatus,addVisit}from"../api";
export default function PatientDetail({patient,onBack}){
  const[visits,setVisits]=useState([]);
  const[adding,setAdding]=useState(false);
  const[vf,setVf]=useState({visit_date:"",next_visit:"",notes:""});
  const[status,setStatus]=useState(null);
  const[loading,setLoading]=useState(false);
  useEffect(()=>{if(patient?.id)getVisits(patient.id).then(r=>setVisits(r.data));},[patient]);
  async function chSt(id,st){await updateVisitStatus(id,st);setVisits(v=>v.map(x=>x.id===id?{...x,status:st}:x));}
  async function saveV(){
    if(!vf.visit_date){setStatus({ok:false,msg:"Visit date required."});return;}
    setLoading(true);
    try{await addVisit({...vf,patient_id:patient.id});const r=await getVisits(patient.id);setVisits(r.data);setStatus({ok:true,msg:"Visit added."});setAdding(false);setVf({visit_date:"",next_visit:"",notes:""});}
    catch{setStatus({ok:false,msg:"Failed."});}
    finally{setLoading(false);}
  }
  if(!patient)return<div style={{padding:40,color:"#9ca3af",textAlign:"center"}}>No patient selected.</div>;
  const ini=patient.name.split(" ").map(w=>w[0]).slice(0,2).join("");
  const latest=[...visits].reverse()[0];
  const stC={upcoming:{bg:"#eff6ff",c:"#1d4ed8"},completed:{bg:"#ecfdf5",c:"#065f46"},missed:{bg:"#fef2f2",c:"#dc2626"}};
  return(
    <div>
      <div style={s.hero}>
        <button style={s.back} onClick={onBack}>← Back to patients</button>
        <div style={s.hb}>
          <div style={s.hAv}>{ini}</div>
          <div style={s.hInfo}>
            <div style={s.hName}>{patient.name}</div>
            <div style={s.hMeta}>{[patient.age&&`${patient.age}y`,patient.gender,patient.phone].filter(Boolean).join(" · ")}</div>
            <div style={s.hTags}>
              {patient.followup_type&&<div style={s.tag}>{patient.followup_type}</div>}
              {patient.condition&&<div style={s.tag}>{patient.condition}</div>}
              <div style={patient.opted_out?s.tagR:s.tagG}>{patient.opted_out?"🔕 Opted Out":"✅ Active"}</div>
            </div>
          </div>
          <div style={s.hR}>
            <div style={s.nvL}>Next Visit</div>
            <div style={s.nvD}>{latest?.next_visit||"Not set"}</div>
            {latest?.next_visit&&<div style={s.nvT}>⏰ Reminders scheduled</div>}
          </div>
        </div>
      </div>
      <div style={s.body}>
        <div>
          {latest&&(
            <div style={s.fuCard}>
              <div style={s.fuTitle}>Follow-up Status</div>
              <div style={s.fuRow}>
                <div><div style={s.fuL}>Last Visit</div><div style={s.fuV}>{latest.visit_date}</div></div>
                <div><div style={s.fuL}>Next Follow-up</div><div style={{...s.fuV,color:"#1a56db"}}>{latest.next_visit||"Not set"}</div></div>
                <div><div style={s.fuL}>Status</div><div style={{...s.fuB,...(stC[latest.status||"upcoming"])}}>{latest.status||"upcoming"}</div></div>
              </div>
              <div style={s.fuActs}>
                <button style={s.fuBtn} onClick={()=>chSt(latest.id,"completed")}>✅ Mark Completed</button>
                <button style={{...s.fuBtn,background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5"}} onClick={()=>chSt(latest.id,"missed")}>❌ Mark Missed</button>
                <button style={{...s.fuBtn,background:"#f0fdfa",color:"#0d9488",border:"1px solid #6ee7b7"}} onClick={()=>setAdding(true)}>+ New Visit</button>
              </div>
            </div>
          )}
          {!latest&&!adding&&(
            <div style={{...s.fuCard,textAlign:"center"}}>
              <div style={{fontSize:13,color:"#6b7280",marginBottom:12}}>No visits yet.</div>
              <button style={{padding:"8px 20px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#1a56db,#0d9488)",color:"white",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"Inter,sans-serif"}} onClick={()=>setAdding(true)}>+ Add First Visit</button>
            </div>
          )}
          {adding&&(
            <div style={s.addCard}>
              <div style={s.addT}>Add Visit</div>
              {status&&<div style={{padding:"8px 12px",borderRadius:7,fontSize:12.5,marginBottom:10,background:status.ok?"#ecfdf5":"#fef2f2",color:status.ok?"#065f46":"#991b1b"}}>{status.msg}</div>}
              <div style={s.r2}>
                <F label="Visit Date *"><input style={s.inp} type="date" value={vf.visit_date} onChange={e=>setVf(f=>({...f,visit_date:e.target.value}))}/></F>
                <F label="Next Visit Date"><input style={s.inp} type="date" value={vf.next_visit} onChange={e=>setVf(f=>({...f,next_visit:e.target.value}))}/></F>
              </div>
              <F label="Notes"><textarea style={{...s.inp,minHeight:60,resize:"vertical"}} value={vf.notes} onChange={e=>setVf(f=>({...f,notes:e.target.value}))}/></F>
              <div style={{display:"flex",gap:8,marginTop:8}}>
                <button style={s.btnO} onClick={()=>{setAdding(false);setStatus(null);}}>Cancel</button>
                <button style={s.btnP} onClick={saveV} disabled={loading}>{loading?"Saving...":"Save →"}</button>
              </div>
            </div>
          )}
          <div style={s.secT}>Visit Timeline</div>
          {visits.length===0&&<div style={{color:"#9ca3af",fontSize:13,padding:"12px 0"}}>No visits recorded.</div>}
          <div style={{display:"flex",flexDirection:"column"}}>
            {[...visits].reverse().map((v,i)=>(
              <div key={v.id} style={{display:"flex",gap:12,paddingBottom:12}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <div style={{width:28,height:28,borderRadius:"50%",border:`2px solid ${i===0?"#0d9488":"#e5e7eb"}`,background:i===0?"#f0fdfa":"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}}>📋</div>
                  {i<visits.length-1&&<div style={{width:2,background:"#e5e7eb",flex:1,margin:"3px 0"}}/>}
                </div>
                <div style={{flex:1}}>
                  <div style={{background:"#fff",border:`1px solid ${i===0?"rgba(13,148,136,0.3)":"#e5e7eb"}`,borderRadius:10,padding:12}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5,flexWrap:"wrap",gap:4}}>
                      <div style={{fontSize:11.5,color:"#6b7280",fontWeight:500}}>{v.visit_date}{i===0?" · Latest":""}</div>
                      <div style={{display:"flex",gap:3}}>
                        {["upcoming","completed","missed"].map(st=><button key={st} onClick={()=>chSt(v.id,st)} style={{padding:"2px 7px",borderRadius:4,fontSize:10,cursor:"pointer",border:"1px solid",background:v.status===st?stC[st]?.bg:"#f9fafb",color:v.status===st?stC[st]?.c:"#6b7280",borderColor:v.status===st?stC[st]?.c:"#e5e7eb",fontFamily:"Inter,sans-serif"}}>{st==="upcoming"?"⏳":st==="completed"?"✅":"❌"} {st}</button>)}
                      </div>
                    </div>
                    {v.next_visit&&<div style={{fontSize:12,color:"#1a56db"}}>Next: {v.next_visit}</div>}
                    {v.notes&&<div style={{fontSize:12.5,color:"#111827",marginTop:6,paddingTop:6,borderTop:"1px solid #f1f5f9"}}>{v.notes}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={s.iCard}>
            <div style={s.iT}>Patient Info</div>
            {[["Name",patient.name],["Age",patient.age?`${patient.age}y`:"—"],["Gender",patient.gender||"—"],["Phone",patient.phone],["Follow-up",patient.followup_type||"—"],["Condition",patient.condition||"—"],["Visits",visits.length],["Status",patient.opted_out?"Opted Out":"Active"]].map(([l,v])=>(
              <div key={l} style={s.iRow}><span style={s.iL}>{l}</span><span style={s.iV}>{v}</span></div>
            ))}
          </div>
          <div style={s.iCard}>
            <div style={s.iT}>Visit Summary</div>
            {[["Completed",visits.filter(v=>v.status==="completed").length,"#059669"],["Missed",visits.filter(v=>v.status==="missed").length,"#dc2626"],["Upcoming",visits.filter(v=>v.status==="upcoming"||!v.status).length,"#1a56db"]].map(([l,v,c])=>(
              <div key={l} style={s.iRow}><span style={s.iL}>{l}</span><span style={{...s.iV,color:c,fontWeight:600}}>{v}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function F({label,children}){return<div style={{display:"flex",flexDirection:"column",gap:5}}><label style={{fontSize:12,color:"#6b7280",fontWeight:500}}>{label}</label>{children}</div>;}
const s={hero:{background:"linear-gradient(135deg,#0f172a,#1e3a8a 60%,#0d9488)",borderRadius:16,padding:24,marginBottom:20},back:{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:"rgba(255,255,255,0.7)",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,padding:"5px 12px",cursor:"pointer",marginBottom:16,fontFamily:"Inter,sans-serif"},hb:{display:"flex",alignItems:"center",gap:16},hAv:{width:56,height:56,borderRadius:"50%",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"white",flexShrink:0},hInfo:{flex:1},hName:{fontSize:20,fontWeight:700,color:"white"},hMeta:{fontSize:13,color:"rgba(255,255,255,0.6)",marginTop:3},hTags:{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"},tag:{padding:"3px 10px",borderRadius:20,fontSize:11.5,fontWeight:500,background:"rgba(45,212,191,0.2)",color:"#2dd4bf"},tagG:{padding:"3px 10px",borderRadius:20,fontSize:11.5,fontWeight:500,background:"rgba(16,185,129,0.2)",color:"#6ee7b7"},tagR:{padding:"3px 10px",borderRadius:20,fontSize:11.5,fontWeight:500,background:"rgba(239,68,68,0.2)",color:"#fca5a5"},hR:{textAlign:"right",marginLeft:"auto",flexShrink:0},nvL:{fontSize:11,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.5px"},nvD:{fontSize:18,fontWeight:700,color:"white",marginTop:2},nvT:{fontSize:11,color:"#2dd4bf",marginTop:2},body:{display:"grid",gridTemplateColumns:"1fr 250px",gap:18},fuCard:{background:"#fff",border:"1px solid var(--border)",borderRadius:14,padding:18,marginBottom:14},fuTitle:{fontSize:14,fontWeight:600,color:"#111827",marginBottom:12},fuRow:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12},fuL:{fontSize:11,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:3},fuV:{fontSize:14,fontWeight:600,color:"#111827"},fuB:{display:"inline-flex",padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:500},fuActs:{display:"flex",gap:8,flexWrap:"wrap"},fuBtn:{padding:"7px 14px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg)",fontSize:12.5,fontWeight:500,cursor:"pointer",fontFamily:"Inter,sans-serif",color:"#111827"},addCard:{background:"#f0fdfa",border:"1px solid rgba(13,148,136,0.3)",borderRadius:14,padding:18,marginBottom:14},addT:{fontSize:14,fontWeight:600,color:"#0d9488",marginBottom:14},r2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12},inp:{padding:"9px 12px",border:"1px solid var(--border)",borderRadius:8,fontSize:13.5,fontFamily:"Inter,sans-serif",color:"#111827",outline:"none",width:"100%"},btnO:{padding:"8px 14px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",fontSize:13,cursor:"pointer",fontFamily:"Inter,sans-serif",color:"#111827"},btnP:{padding:"8px 18px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#1a56db,#0d9488)",color:"white",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"Inter,sans-serif"},secT:{fontSize:14,fontWeight:600,marginBottom:12,marginTop:4,color:"#111827"},iCard:{background:"#fff",border:"1px solid var(--border)",borderRadius:12,padding:14,marginBottom:12},iT:{fontSize:12,fontWeight:600,color:"#111827",marginBottom:10},iRow:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,paddingBottom:6,borderBottom:"1px solid #f9fafb"},iL:{fontSize:12,color:"#6b7280"},iV:{fontSize:12.5,fontWeight:500,color:"#111827"}};
