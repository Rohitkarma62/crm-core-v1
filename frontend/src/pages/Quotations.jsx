import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const money=v=>`₹${Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:0})}`;

export default function Quotations({onBack,onWorkOrders}){
  const [orders,setOrders]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  async function load(){setLoading(true);setError("");try{const {data}=await api.get("/api/v1/fabrication");setOrders(data.items||[]);}catch(e){setError(e.response?.data?.detail||"Quotations load nahi hui.");}finally{setLoading(false);}}
  useEffect(()=>{load()},[]);
  async function move(id,stage){try{const {data}=await api.put(`/api/v1/fabrication/${id}`,{stage});setOrders(v=>v.map(o=>o.id===id?data:o));}catch(e){setError(e.response?.data?.detail||"Quotation status update nahi hua.");}}
  const quotations=useMemo(()=>orders.filter(o=>["Quotation","Material Pending","Fabrication","Ready","Delivered"].includes(o.stage)),[orders]);
  return <main className="page quotations-page">
    <div className="page-head"><div><button className="secondary" onClick={onBack}>← Dashboard</button><h1>📝 Quotations</h1><p className="form-help">Fabrication job ki estimated value aur approval status yahan manage karein.</p></div><button className="primary" onClick={onWorkOrders}>+ Work Order</button></div>
    {error&&<p className="error">{error}</p>}
    <section className="fab-stats"><div><span>Quotation Queue</span><strong>{orders.filter(o=>o.stage==="Quotation").length}</strong></div><div><span>Approved / In Work</span><strong>{quotations.length}</strong></div><div><span>Total Quoted Value</span><strong>{money(quotations.reduce((a,o)=>a+Number(o.amount||0),0))}</strong></div></section>
    <section className="panel"><div className="toolbar"><div><h2>Quotation List</h2><span className="record-count">{loading?"Loading...":`${quotations.length} jobs`}</span></div><button className="secondary" onClick={load}>↻ Refresh</button></div>
      {loading?<div className="table-state">Loading quotations...</div>:quotations.length===0?<div className="table-state">Abhi quotation stage mein koi job nahi hai. Work Order ko Pipeline mein “Quotation” stage par bhejein.</div>:
      <div className="table-wrap"><table><thead><tr><th>Customer</th><th>Work</th><th>Amount</th><th>Stage</th><th>Delivery</th><th>Action</th></tr></thead><tbody>
      {quotations.map(o=><tr key={o.id}><td><strong>{o.customer}</strong><br/><small>{o.phone||"-"}</small></td><td>{o.work}<br/><small>{o.measurement||"Measurement pending"}</small></td><td>{money(o.amount)}</td><td>{o.stage}</td><td>{o.delivery?new Date(o.delivery).toLocaleDateString("en-IN"):"-"}</td><td><select value={o.stage} onChange={e=>move(o.id,e.target.value)}><option value="Quotation">Quotation</option><option value="Material Pending">Approved / Material</option><option value="Fabrication">Start Production</option><option value="Ready">Ready</option><option value="Delivered">Delivered</option></select></td></tr>)}
      </tbody></table></div>}
    </section>
    <section className="panel"><h2>Quotation workflow</h2><p className="form-help">Enquiry → Measurement → Quotation → Approved / Material → Production. Payment और final bill customer profile से linked रहेंगे.</p></section>
  </main>;
}
