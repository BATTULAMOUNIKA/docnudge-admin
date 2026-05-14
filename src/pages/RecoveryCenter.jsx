import{useEffect,useState}from"react";
import{getClinics,getPatients,getVisits,getReminderLogs}from"../api";
export default function RecoveryCenter(){
  const[overdue,setOverdue]=useState([]);
  const[failed,setFailed]=useState([]);
  const[optedOut,setOptedOut]=useState([]);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{
    async function load(){
      try{
        const cr=await getClinics();if(!cr.data.length){setLoading(false);return;}
        const cid=cr.data[0].id;
        const[pr,lr]=await Promise.all([getPatients(cid),getReminderLogs(cid)]);
        setOptedOut(pr.data.filter(p=>p.opted_out));
        setFailed(lr.data.filter(([l])=>!l.success).map(([l,p])=>({...p,error:l.error})));
        const today=new Date();today.setHours(0,0,0,0);
        const od=[];
        for(const p of pr.data.filter(p=>!p.opted_out).slice(0,30)){
          try{const vr=await getVisits(p.id);const last=vr.data[vr.data.length-1];if(last?.next_visit){const nv=new Date(last.next_visit);if(nv<today){const days=Math.floor((today-nv)/86400000);od.push({...p,days_overdue:days,recovery:Math.max(5,Math.round(80-days*5))});}}}catch{
            // Keep recovery loading if one patient visit lookup fails.
          }
        }
        setOverdue(od.sort((a,b)=>b.days_overdue-a.days_overdue));
      }finally{setLoading(false);}
    }
    load();
  },[]);
  if(loading)return<div style={{padding:48,textAlign:"center",color:"#9ca3af"}}>Loading...</div>;
  const total=overdue.length+failed.length+optedOut.length;
  return(
    <div>
      <div style={s.hdr}><div><div style={s.title}>⚡ Recovery Center</div><div style={s.sub}>Patients and issues that need your attention today.</div></div><div style={{...s.badge,background:total>0?"#fef2f2":"#ecfdf5",color:total>0?"#dc2626":"#065f46"}}>{total} items need attention</div></div>
      {total===0&&<div style={s.allGood}><div style={{fontSize:32,marginBottom:12}}>✅</div><div style={{fontSize:16,fontWeight:600,color:"#111827",marginBottom:6}}>All clear!</div><div style={{fontSize:13,color:"#6b7280"}}>No overdue patients, no failed reminders.</div></div>}
      {overdue.length>0&&<Sec title="🔴 Overdue Follow-ups" count={overdue.length} c="#fef2f2" bc="#fca5a5">{overdue.map((p,i)=><Row key={i} name={p.name} meta={`${p.phone}${p.followup_type?` · ${p.followup_type}`:""}`} tag={`${p.days_overdue}d overdue`} tagC="#dc2626" tagBg="#fef2f2" action="📞 Call patient" actionC="#1a56db" pct={p.recovery}/>)}</Sec>}
      {failed.length>0&&<Sec title="⚠️ Failed Reminders" count={failed.length} c="#fffbeb" bc="#fde68a">{failed.slice(0,10).map((p,i)=><Row key={i} name={p.name} meta={p.phone} tag="Send failed" tagC="#d97706" tagBg="#fffbeb" action="Check number" actionC="#1a56db"/>)}</Sec>}
      {optedOut.length>0&&<Sec title="🔕 Opted-out Patients" count={optedOut.length} c="#f9fafb" bc="#e5e7eb">{optedOut.map((p,i)=><Row key={i} name={p.name} meta={`${p.phone}${p.condition?` · ${p.condition}`:""}`} tag="Opted out" tagC="#6b7280" tagBg="#f1f5f9" action="📞 Call manually" actionC="#1a56db"/>)}</Sec>}
      <div style={s.info}><div style={s.infoT}>💡 How to use Recovery Center</div><div style={s.infoGrid}>{[{i:"🔴",t:"Overdue follow-ups",d:"Patient's next visit date has passed. Call them directly or add a new visit date to restart reminders."},{i:"⚠️",t:"Failed reminders",d:"WhatsApp failed to send. Check if phone number is correct and patient is on WhatsApp."},{i:"🔕",t:"Opted-out patients",d:"Patient replied STOP. Call them manually to continue care."}].map((h,i)=><div key={i} style={s.infoCard}><div style={{fontSize:22,marginBottom:8}}>{h.i}</div><div style={{fontSize:13,fontWeight:600,color:"#111827",marginBottom:4}}>{h.t}</div><div style={{fontSize:12.5,color:"#6b7280",lineHeight:1.6}}>{h.d}</div></div>)}</div></div>
    </div>
  );
}
function Sec({title,count,c,bc,children}){return<div style={{background:c,border:`1px solid ${bc}`,borderRadius:14,overflow:"hidden",marginBottom:14}}><div style={{padding:"12px 16px",borderBottom:`1px solid ${bc}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{title}</div><div style={{fontSize:12,color:"#6b7280",fontWeight:500}}>{count} patient{count!==1?"s":""}</div></div><div style={{display:"flex",flexDirection:"column"}}>{children}</div></div>;}
function Row({name,meta,tag,tagC,tagBg,action,actionC,pct}){return<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:"1px solid rgba(0,0,0,0.04)"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:8,height:8,borderRadius:"50%",background:tagC,flexShrink:0}}/><div><div style={{fontSize:13.5,fontWeight:500,color:"#111827"}}>{name}</div><div style={{fontSize:12,color:"#6b7280",marginTop:1}}>{meta}</div></div></div><div style={{display:"flex",alignItems:"center",gap:10}}>{pct&&<span style={{fontSize:13,fontWeight:700,color:pct>50?"#22c55e":pct>25?"#f97316":"#ef4444"}}>+{pct}%</span>}<span style={{padding:"3px 10px",borderRadius:20,fontSize:11.5,fontWeight:500,background:tagBg,color:tagC}}>{tag}</span><span style={{fontSize:12,color:actionC,fontWeight:500,cursor:"pointer"}}>{action}</span></div></div>;}
const s={hdr:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20},title:{fontSize:17,fontWeight:600,color:"#111827"},sub:{fontSize:12.5,color:"#6b7280",marginTop:3},badge:{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:600,flexShrink:0},allGood:{textAlign:"center",padding:60,background:"#fff",borderRadius:16,border:"1px solid var(--border)"},info:{background:"#fff",border:"1px solid var(--border)",borderRadius:14,padding:20,marginTop:4},infoT:{fontSize:13,fontWeight:600,color:"#111827",marginBottom:14},infoGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14},infoCard:{background:"var(--bg)",borderRadius:10,padding:14}};
