import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const money = v => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const stages = ["New Enquiry","Measurement","Quotation","Material Pending","Fabrication","Welding","Grinding","Painting","Ready","Delivered"];
const emptyOrder = { customer:"", phone:"", site:"", work:"", measurement:"", amount:"", delivery:"", notes:"" };

export default function Fabrication({ onBack, onPipeline }) {
  const [leads,setLeads]=useState([]);
  const [orders,setOrders]=useState([]);
  const [form,setForm]=useState(emptyOrder);
  const [stageFilter,setStageFilter]=useState("All");
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  async function load(){
    try{
      const [l,o]=await Promise.all([api.get("/api/v1/leads"),api.get("/api/v1/fabrication")]);
      setLeads(l.data.items||[]); setOrders(o.data.items||[]);
    }catch(e){setError(e.response?.data?.detail||"Workshop data load nahi ho saka.");}
  }
  useEffect(()=>{load()},[]);

  const stats=useMemo(()=>({
    enquiries:leads.length,
    orders:orders.length,
    production:orders.filter(o=>!["New Enquiry","Quotation","Ready","Delivered"].includes(o.stage)).length,
    ready:orders.filter(o=>o.stage==="Ready").length,
  }),[leads,orders]);

  async function addOrder(e){
    e.preventDefault(); setSaving(true); setError("");
    if(!form.customer||!form.work){setError("Customer aur work requirement bharna zaroori hai.");setSaving(false);return}
    try{
      const r=await api.post("/api/v1/fabrication",form);
      setOrders(v=>[r.data,...v]); setForm(emptyOrder);
    }catch(e){setError(e.response?.data?.detail||"Work order save nahi hua.");}
    finally{setSaving(false);}
  }

  async function move(id,stage){
    try{
      const r=await api.put(`/api/v1/fabrication/${id}`,{stage});
      setOrders(v=>v.map(o=>o.id===id?r.data:o));
    }catch(e){setError(e.response?.data?.detail||"Stage update nahi hua.");}
  }

  async function remove(id){
    if(!confirm("Is work order ko delete karein?"))return;
    try{await api.delete(`/api/v1/fabrication/${id}`);setOrders(v=>v.filter(o=>o.id!==id));}
    catch(e){setError(e.response?.data?.detail||"Work order delete nahi hua.");}
  }

  const visible=stageFilter==="All"?orders:orders.filter(o=>o.stage===stageFilter);

  return <main className="page fabrication-page">
    <div className="page-head fabrication-head">
      <div><button className="secondary" onClick={onBack}>← Dashboard</button><h1>🏭 Work Orders</h1><p className="form-help">Measurement se production aur delivery tak har job yahan manage karein.</p></div>
      <button className="primary" onClick={onPipeline}>🔄 Open Pipeline</button>
    </div>

    <section className="fab-stats">
      <div><span>Enquiries</span><strong>{stats.enquiries}</strong></div>
      <div><span>Work Orders</span><strong>{stats.orders}</strong></div>
      <div><span>In Production</span><strong>{stats.production}</strong></div>
      <div><span>Ready</span><strong>{stats.ready}</strong></div>
      <div><span>Order Value</span><strong>{money(orders.reduce((a,o)=>a+Number(o.amount||0),0))}</strong></div>
    </section>

    <section className="panel">
      <h2>+ New Fabrication Work Order</h2>
      <p className="form-help">Customer, site, measurement aur kaam ki details save karein.</p>
      <form className="form-grid fab-form" onSubmit={addOrder}>
        <label><span>Customer *</span><input value={form.customer} onChange={e=>setForm({...form,customer:e.target.value})} placeholder="Customer name" required/></label>
        <label><span>Mobile</span><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Mobile number"/></label>
        <label><span>Site / Location</span><input value={form.site} onChange={e=>setForm({...form,site:e.target.value})} placeholder="Site address"/></label>
        <label><span>Work Requirement *</span><input value={form.work} onChange={e=>setForm({...form,work:e.target.value})} placeholder="Gate / Grill / Shed / Railing" required/></label>
        <label><span>Measurement</span><input value={form.measurement} onChange={e=>setForm({...form,measurement:e.target.value})} placeholder="e.g. 12 × 6 ft"/></label>
        <label><span>Estimated / Final Amount</span><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="₹"/></label>
        <label><span>Delivery Date</span><input type="date" value={form.delivery} onChange={e=>setForm({...form,delivery:e.target.value})}/></label>
        <label className="full-field"><span>Notes / Material</span><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="MS pipe, sheet, paint, special instruction..."/></label>
        <div className="form-actions"><button disabled={saving}>{saving?"Saving...":"Create Work Order"}</button></div>
      </form>
      {error&&<p className="error">{error}</p>}
    </section>

    <section className="panel">
      <div className="toolbar"><div><h2>Work Order List</h2><span className="record-count">{visible.length} jobs</span></div><div className="fab-filter">{["All",...stages].map(s=><button key={s} className={stageFilter===s?"active":""} onClick={()=>setStageFilter(s)}>{s}</button>)}</div></div>
      {visible.length===0?<div className="table-state">Abhi koi fabrication work order nahi hai.</div>:<div className="fab-orders">{visible.map(o=><article className="fab-order" key={o.id}>
        <div className="fab-order-top"><div><strong>{o.customer}</strong><small>{o.phone||"No mobile"} · {o.site||"Site not added"}</small></div><span>{o.stage}</span></div>
        <div className="fab-order-body"><b>{o.work}</b><span>Measurement: {o.measurement||"-"}</span><span>Amount: {money(o.amount)}</span><span>Delivery: {o.delivery?new Date(o.delivery).toLocaleDateString("en-IN"):"-"}</span><small>{o.notes||"No material notes"}</small></div>
        <div className="fab-order-actions"><select value={o.stage} onChange={e=>move(o.id,e.target.value)}>{stages.map(s=><option key={s}>{s}</option>)}</select><button className="small danger" onClick={()=>remove(o.id)}>Delete</button></div>
      </article>)}</div>}
    </section>

    <section className="panel">
      <h2>Recent Enquiries</h2>
      <div className="fab-enquiries">{leads.slice(0,8).map(l=><div key={l.id}><strong>{l.name}</strong><span>{l.phone} · {l.interested_service||"Fabrication requirement"}</span><b>{money(l.estimated_value)}</b></div>)}</div>
    </section>
  </main>;
}
