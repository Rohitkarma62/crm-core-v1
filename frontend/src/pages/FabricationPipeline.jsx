import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const stages = ["New Enquiry","Measurement","Quotation","Material Pending","Fabrication","Welding","Grinding","Painting","Ready","Delivered"];

export default function FabricationPipeline({ onBack, onEnquiries }) {
  const [orders,setOrders]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [dragged,setDragged]=useState(null);
  const [activeStage,setActiveStage]=useState(stages[0]);

  async function load(){
    setLoading(true);setError("");
    try{const {data}=await api.get("/api/v1/fabrication");setOrders(data.items||[]);}
    catch(e){setError(e.response?.data?.detail||"Pipeline load nahi hua.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{load()},[]);

  async function move(id,stage){
    try{
      const {data}=await api.put(`/api/v1/fabrication/${id}`,{stage});
      setOrders(v=>v.map(o=>o.id===id?data:o));
    }catch(e){setError(e.response?.data?.detail||"Job move nahi hua.");}
  }

  const counts=useMemo(()=>Object.fromEntries(stages.map(s=>[s,orders.filter(o=>o.stage===s).length])),[orders]);

  return <main className="page pipeline-page fabrication-pipeline-page">
    <div className="page-head pipeline-head">
      <div><button className="secondary" onClick={onBack}>← Dashboard</button><h1>🔄 Fabrication Pipeline</h1><p className="form-help">Har job ko enquiry se delivery tak drag/drop ya stage menu se move karein.</p></div>
      <div className="pipeline-head-actions"><button className="secondary" onClick={load}>↻ Refresh</button><button className="primary" onClick={onEnquiries}>+ New Enquiry</button></div>
    </div>
    {error&&<p className="error">{error}</p>}
    {loading?<section className="panel"><div className="table-state">Loading pipeline...</div></section>:<>
      <section className="panel pipeline-stage-tabs"><div className="pipeline-tabs-scroll">{stages.map(s=><button key={s} className={`stage-tab ${activeStage===s?"active":""}`} onClick={()=>setActiveStage(s)}><span>{s}</span><b>{counts[s]}</b></button>)}</div></section>
      <section className="pipeline-board fabrication-pipeline-board">
        {stages.map(stage=><section key={stage} className={`pipeline-column ${activeStage===stage?"active-column":""}` onDragOver={e=>e.preventDefault()} onDrop={()=>{if(dragged)move(dragged,stage)}}>
          <header><div><strong>{stage}</strong></div><span className="count">{counts[stage]}</span></header>
          <div className="pipeline-cards">
            {orders.filter(o=>o.stage===stage).map(o=><article key={o.id} className="pipeline-card" draggable onDragStart={()=>setDragged(o.id)} onDragEnd={()=>setDragged(null)}>
              <div className="pipeline-card-top"><strong>{o.customer}</strong><span className="priority">{o.id}</span></div>
              <small>{o.phone||"No mobile"}</small>
              <p>{o.work}</p>
              {o.site&&<small>📍 {o.site}</small>}
              <b>₹ {Number(o.amount||0).toLocaleString("en-IN")}</b>
              {o.delivery&&<small>Delivery: {new Date(o.delivery).toLocaleDateString("en-IN")}</small>}
              <div className="pipeline-move"><select value={o.stage} onChange={e=>move(o.id,e.target.value)}><option value={o.stage}>{o.stage}</option>{stages.filter(s=>s!==o.stage).map(s=><option key={s}>{s}</option>)}</select></div>
            </article>)}
            {!orders.some(o=>o.stage===stage)&&<div className="empty-column"><strong>No jobs</strong><small>Is stage mein abhi koi work nahi.</small></div>}
          </div>
        </section>)}
      </section>
    </>}
  </main>;
}
