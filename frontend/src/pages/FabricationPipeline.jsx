import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const stages = ["New Enquiry","Measurement","Quotation","Material Pending","Fabrication","Welding","Grinding","Painting","Ready","Delivered"];

export default function FabricationPipeline({ onBack, onEnquiries }) {
  const [orders,setOrders]=useState([]);
  const [leads,setLeads]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [dragged,setDragged]=useState(null);
  const [activeStage,setActiveStage]=useState(stages[0]);
  const [assistantOpen,setAssistantOpen]=useState(false);
  const [workingId,setWorkingId]=useState(null);
  const [draft,setDraft]=useState({measurement:"",amount:""});
  const [materials,setMaterials]=useState([]);
  const [jobMaterials,setJobMaterials]=useState({});
  const [materialDrafts,setMaterialDrafts]=useState({});

  async function load(){
    setLoading(true);setError("");
    try{
      const [o,l,m]=await Promise.all([
        api.get("/api/v1/fabrication"),
        api.get("/api/v1/leads",{params:{page_size:100}}),
        api.get("/api/v1/workshop-materials")
      ]);
      const fabricationOrders=o.data.items||[];
      const allLeads=l.data.items||[];
      const convertedLeadIds=new Set(
        fabricationOrders.map(order=>order.lead_id)
          .filter(id=>id !== null && id !== undefined).map(Number)
      );
      const openLeads=allLeads.filter(lead=>!convertedLeadIds.has(Number(lead.id)));
      setOrders(fabricationOrders);
      setLeads(openLeads);
      setMaterials(m.data.items||[]);
      const pending=fabricationOrders.filter(x=>["Material Pending","Fabrication"].includes(x.stage));
      const materialRows=await Promise.all(pending.map(async x=>{
        try{const r=await api.get(`/api/v1/workshop-materials/work-order/${x.id}`);return [x.id,r.data.items||[]];}
        catch{return [x.id,[]];}
      }));
      setJobMaterials(Object.fromEntries(materialRows));
    }catch(e){setError(e.response?.data?.detail||"Pipeline load nahi hua.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{load()},[]);

  async function move(id,stage){
    try{
      if(String(id).startsWith("lead-")){
        const lead=leads.find(l=>String(l.id)===String(id).slice(5));
        if(!lead) return;
        const {data}=await api.post("/api/v1/fabrication",{
          lead_id:lead.id, customer:lead.name, phone:lead.phone,
          work:lead.interested_service||"Fabrication work",
          amount:lead.estimated_value||0, notes:lead.notes||"", stage
        });
        setOrders(v=>[data,...v]);
        setLeads(v=>v.filter(l=>l.id!==lead.id));
      }else{
        const {data}=await api.put(`/api/v1/fabrication/${id}`,{stage});
        setOrders(v=>v.map(o=>o.id===id?data:o));
      }
    }catch(e){setError(e.response?.data?.detail||"Job move nahi hua.");}
  }

  async function completeMeasurement(order){
    if(!draft.measurement.trim()){
      setError("Measurement bharna zaroori hai. Example: 12 x 6 ft");
      return;
    }
    setWorkingId(order.id);setError("");
    try{
      const {data}=await api.put(`/api/v1/fabrication/${order.id}`,{
        measurement:draft.measurement.trim(), stage:"Quotation"
      });
      setOrders(v=>v.map(o=>o.id===order.id?data:o));
      setDraft({measurement:"",amount:""});
      setWorkingId(null);
    }catch(e){
      setError(e.response?.data?.detail||"Measurement save nahi hua.");
      setWorkingId(null);
    }
  }

  async function completeQuotation(order){
    const amount=String(draft.amount).trim();
    if(!amount || Number(amount)<0){
      setError("Quotation amount bharna zaroori hai.");
      return;
    }
    setWorkingId(order.id);setError("");
    try{
      const {data}=await api.put(`/api/v1/fabrication/${order.id}`,{
        amount:Number(amount), stage:"Material Pending"
      });
      setOrders(v=>v.map(o=>o.id===order.id?data:o));
      setDraft({measurement:"",amount:""});
      setWorkingId(null);
    }catch(e){
      setError(e.response?.data?.detail||"Quotation save nahi hua.");
      setWorkingId(null);
    }
  }

  async function addMaterial(order){
    const d=materialDrafts[order.id]||{};
    if(!d.materialId || !d.qty || Number(d.qty)<=0){setError("Material aur quantity select karna zaroori hai.");return;}
    setWorkingId(order.id);setError("");
    try{
      const material=materials.find(x=>String(x.id)===String(d.materialId));
      const {data}=await api.post(`/api/v1/workshop-materials/${d.materialId}/transaction`,{txn_type:"out",qty:Number(d.qty),rate:material?.rate||0,work_order_id:order.id,notes:`Material for ${order.customer} - ${order.work}`});
      setJobMaterials(v=>({...v,[order.id]:[{...data,material_name:material?.name||"Material"},...(v[order.id]||[])]}));
      setMaterials(v=>v.map(x=>x.id===Number(d.materialId)?{...x,stock_qty:Number(x.stock_qty||0)-Number(d.qty)}:x));
      setMaterialDrafts(v=>({...v,[order.id]:{materialId:"",qty:""}}));
      setWorkingId(null);
    }catch(e){setError(e.response?.data?.detail||"Material add nahi hua.");setWorkingId(null);}
  }

  async function approveMaterial(order){
    if(!(jobMaterials[order.id]||[]).length){setError("Pehle kam se kam ek material add karein.");return;}
    setWorkingId(order.id);setError("");
    try{
      const {data}=await api.put(`/api/v1/fabrication/${order.id}`,{stage:"Fabrication"});
      setOrders(v=>v.map(o=>o.id===order.id?data:o));
      setWorkingId(null);
    }catch(e){setError(e.response?.data?.detail||"Material approval nahi hua.");setWorkingId(null);}
  }

  function startAssistant(){
    setAssistantOpen(true);
    setError("");
    const pending=orders.find(o=>o.stage==="Measurement" || o.stage==="Quotation");
    if(pending){
      setDraft({
        measurement:pending.measurement||"",
        amount:pending.amount?String(pending.amount):""
      });
    }else{
      setDraft({measurement:"",amount:""});
    }
  }

  const cardsByStage=useMemo(()=>{
    const result=Object.fromEntries(stages.map(s=>[s,orders.filter(o=>o.stage===s)]));
    result["New Enquiry"]=[
      ...leads.map(l=>({id:`lead-${l.id}`,customer:l.name,phone:l.phone,work:l.interested_service||"Fabrication enquiry",amount:l.estimated_value||0,stage:"New Enquiry",leadOnly:true})),
      ...result["New Enquiry"]
    ];
    return result;
  },[orders,leads]);

  const counts=useMemo(()=>Object.fromEntries(stages.map(s=>[s,cardsByStage[s].length])),[cardsByStage]);
  const pendingJobs=useMemo(()=>[
    ...leads.map(l=>({kind:"enquiry",id:`lead-${l.id}`,customer:l.name,phone:l.phone,work:l.interested_service||"Fabrication enquiry",amount:l.estimated_value||0})),
    ...orders.filter(o=>["Measurement","Quotation","Material Pending"].includes(o.stage)).map(o=>({kind:o.stage==="Measurement"?"measurement":o.stage==="Quotation"?"quotation":"material",...o}))
  ],[orders,leads]);

  return <main className="page pipeline-page fabrication-pipeline-page">
    <div className="page-head pipeline-head">
      <div><button className="secondary" onClick={onBack}>← Dashboard</button><h1>🔄 Fabrication Pipeline</h1><p className="form-help">Har job ko enquiry se delivery tak drag/drop ya stage menu se move karein.</p></div>
      <div className="pipeline-head-actions">
        <button className="secondary" onClick={load}>↻ Refresh</button>
        <button className="secondary" onClick={startAssistant}>🧭 Pending Work</button>
        <button className="primary" onClick={onEnquiries}>+ New Enquiry</button>
      </div>
    </div>
    {error&&<p className="error">{error}</p>}

    {assistantOpen&&<section className="panel pending-assistant">
      <div className="toolbar">
        <div><h2>🧭 Pending Work Assistant</h2><span className="record-count">{pendingJobs.length} pending work</span></div>
        <button className="secondary" onClick={()=>setAssistantOpen(false)}>Close</button>
      </div>
      <p className="form-help">System har pending job ka next step batayega. Pehle Enquiry → Measurement, phir Measurement → Quotation complete karein.</p>
      {!pendingJobs.length?<div className="table-state">Koi pending work nahi hai. Pipeline clean hai.</div>:
      <div className="pending-work-list">{pendingJobs.map(job=>{
        const isMeasurement=job.kind==="measurement";
        const isQuotation=job.kind==="quotation";
        const isEnquiry=job.kind==="enquiry";
        const isMaterial=job.kind==="material";
        return <article className="pending-work-card" key={job.id}>
          <div><strong>{job.customer}</strong><small>{job.phone||"No mobile"} · {job.work}</small></div>
          <span className="priority">{isEnquiry?"1. Measurement":isMeasurement?"2. Quotation":"3. Approve / Material"}</span>
          {isEnquiry&&<button className="small" onClick={()=>{move(job.id,"Measurement");setActiveStage("Measurement");}}>Create Work Order → Measurement</button>}
          {isMeasurement&&<div className="pending-form">
            <label><span>Measurement *</span><input value={draft.measurement} onChange={e=>setDraft({...draft,measurement:e.target.value})} placeholder="Example: 12 x 6 ft"/></label>
            <button className="small" disabled={workingId===job.id} onClick={()=>completeMeasurement(job)}>{workingId===job.id?"Saving...":"Save Measurement → Quotation"}</button>
          </div>}
          {isQuotation&&<div className="pending-form">
            <label><span>Quotation Amount *</span><input type="number" value={draft.amount} onChange={e=>setDraft({...draft,amount:e.target.value})} placeholder="₹ Amount"/></label>
            <button className="small" disabled={workingId===job.id} onClick={()=>completeQuotation(job)}>{workingId===job.id?"Saving...":"Approve → Material Pending"}</button>
          </div>}
          {isMaterial&&<div className="pending-material-box">
            {(jobMaterials[job.id]||[]).length>0&&<div className="material-added-list">{jobMaterials[job.id].map(x=><span key={x.id}>✓ {x.material_name} × {x.qty}</span>)}</div>}
            <div className="pending-form">
              <label><span>Material *</span><select value={materialDrafts[job.id]?.materialId||""} onChange={e=>setMaterialDrafts(v=>({...v,[job.id]:{...v[job.id],materialId:e.target.value}}))}><option value="">Select material</option>{materials.map(m=><option key={m.id} value={m.id}>{m.name} · Stock {m.stock_qty} {m.unit}</option>)}</select></label>
              <label><span>Quantity *</span><input type="number" min="0.01" step="0.01" value={materialDrafts[job.id]?.qty||""} onChange={e=>setMaterialDrafts(v=>({...v,[job.id]:{...v[job.id],qty:e.target.value}}))} placeholder="Qty"/></label>
              <button className="small" disabled={workingId===job.id} onClick={()=>addMaterial(job)}>{workingId===job.id?"Saving...":"Add Material"}</button>
            </div>
            <button className="small" disabled={workingId===job.id} onClick={()=>approveMaterial(job)}>✓ Material Approved → Fabrication</button>
          </div>}
        </article>;
      })}</div>}
    </section>}

    {loading?<section className="panel"><div className="table-state">Loading pipeline...</div></section>:<>
      <section className="panel pipeline-stage-tabs"><div className="pipeline-tabs-scroll">{stages.map(s=><button key={s} className={`stage-tab ${activeStage===s?"active":""}`} onClick={()=>setActiveStage(s)}><span>{s}</span><b>{counts[s]}</b></button>)}</div></section>
      <section className="pipeline-board fabrication-pipeline-board">
        {stages.map(stage=><section key={stage} className={`pipeline-column ${activeStage===stage?"active-column":""}`} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(dragged)move(dragged,stage)}}>
          <header><div><strong>{stage}</strong></div><span className="count">{counts[stage]}</span></header>
          <div className="pipeline-cards">
            {cardsByStage[stage].map(o=><article key={o.id} className="pipeline-card" draggable onDragStart={()=>setDragged(o.id)} onDragEnd={()=>setDragged(null)}>
              <div className="pipeline-card-top"><strong>{o.customer}</strong><span className="priority">{o.id}</span></div>
              <small>{o.phone||"No mobile"}</small>
              <p>{o.work}</p>
              {o.site&&<small>📍 {o.site}</small>}
              <b>₹ {Number(o.amount||0).toLocaleString("en-IN")}</b>
              {o.delivery&&<small>Delivery: {new Date(o.delivery).toLocaleDateString("en-IN")}</small>}
              <div className="pipeline-move">
                {o.leadOnly ? <button className="small" onClick={()=>move(o.id,"Measurement")}>Create Work Order → Measurement</button> :
                <select value={o.stage} onChange={e=>move(o.id,e.target.value)}><option value={o.stage}>{o.stage}</option>{stages.filter(s=>s!==o.stage).map(s=><option key={s}>{s}</option>)}</select>}
              </div>
            </article>)}
            {!cardsByStage[stage].length&&<div className="empty-column"><strong>No jobs</strong><small>Is stage mein abhi koi work nahi.</small></div>}
          </div>
        </section>)}
      </section>
    </>}
  </main>;
}
