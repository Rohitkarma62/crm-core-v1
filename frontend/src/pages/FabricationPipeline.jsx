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

  async function load(){
    setLoading(true);setError("");
    try{const [o,l]=await Promise.all([api.get("/api/v1/fabrication"),api.get("/api/v1/leads",{params:{page_size:100}})]);
      setOrders(o.data.items||[]); setLeads(l.data.items||[]);}
    catch(e){setError(e.response?.data?.detail||"Pipeline load nahi hua.");}
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

  const cardsByStage=useMemo(()=>{
    const result=Object.fromEntries(stages.map(s=>[s,orders.filter(o=>o.stage===s)]));
    result["New Enquiry"]=[...leads.map(l=>({id:`lead-${l.id}`,customer:l.name,phone:l.phone,work:l.interested_service||"Fabrication enquiry",amount:l.estimated_value||0,stage:"New Enquiry",leadOnly:true})),...result["New Enquiry"]];
    return result;
  },[orders,leads]);
  const counts=useMemo(()=>Object.fromEntries(stages.map(s=>[s,cardsByStage[s].length])),[cardsByStage]);

  return <main className="page pipeline-page fabrication-pipeline-page">
    <div className="page-head pipeline-head">
      <div><button className="secondary" onClick={onBack}>← Dashboard</button><h1>🔄 Fabrication Pipeline</h1><p className="form-help">Har job ko enquiry se delivery tak drag/drop ya stage menu se move karein.</p></div>
      <div className="pipeline-head-actions"><button className="secondary" onClick={load}>↻ Refresh</button><button className="primary" onClick={onEnquiries}>+ New Enquiry</button></div>
    </div>
    {error&&<p className="error">{error}</p>}
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
