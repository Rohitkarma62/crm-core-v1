import React, { useEffect, useMemo, useState } from "react";
import { api, logout, clearCompanyCrmData } from "../services/api";

const money = v => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function Dashboard({ onLogout, onLeads, onCustomers, onFabrication, onSettings }) {
  const [user] = useState(()=>{try{return JSON.parse(localStorage.getItem("crm_user")||"{}")}catch{return{}}});
  const [business] = useState(()=>{try{return JSON.parse(localStorage.getItem("crm_business")||"{}")}catch{return{}}});
  const [orders,setOrders]=useState([]);
  const [customers,setCustomers]=useState([]);
  const [leads,setLeads]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  async function load(){
    setLoading(true);setError("");
    try{
      const [o,c,l]=await Promise.all([
        api.get("/api/v1/fabrication"),
        api.get("/api/v1/customers"),
        api.get("/api/v1/leads")
      ]);
      setOrders(o.data.items||[]);setCustomers(c.data.items||[]);setLeads(l.data.items||[]);
    }catch(e){setError(e.response?.data?.detail||"Workshop data load nahi ho saka.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{load()},[]);

  async function clearAllData(){
    if(!window.confirm("WARNING: Is company ka customer, enquiry, work-order aur financial data permanently delete hoga. Login aur company settings rahenge. Continue?"))return;
    const phrase=window.prompt("Type DELETE to permanently clear company data:");
    if(phrase!=="DELETE")return;
    try{await clearCompanyCrmData();await load();}catch(e){setError(e.response?.data?.detail||"Data clear nahi hua.");}
  }

  const stats=useMemo(()=>({
    enquiries:leads.length,
    customers:customers.length,
    orders:orders.length,
    production:orders.filter(o=>!["New Enquiry","Ready","Delivered"].includes(o.stage)).length,
    ready:orders.filter(o=>o.stage==="Ready").length,
    orderValue:orders.reduce((a,o)=>a+Number(o.amount||0),0)
  }),[leads,customers,orders]);

  const stageCounts=useMemo(()=>["New Enquiry","Measurement","Material Pending","Fabrication","Welding","Grinding","Painting","Ready","Delivered"].map(stage=>({stage,count:orders.filter(o=>o.stage===stage).length})),[orders]);

  function exit(){logout();onLogout();}

  return <main className="dashboard fabrication-dashboard">
    <header>
      <div><strong>🏭 {business.name || "Vishwakarma Fabrication Workshop"}</strong><span>Fabrication Workshop Management · Welcome, {user.name||"Owner"}</span></div>
      <button onClick={exit}>Logout</button>
    </header>

    <section className="welcome">
      <div className="row">
        <div><h1>Workshop Dashboard</h1><p>Enquiry → Measurement → Fabrication → Ready → Delivered</p></div>
        <div className="dashboard-actions">
          <button className="fabrication-nav" onClick={onFabrication}>🏭 Work Orders</button>
          <button onClick={onLeads}>📋 Enquiries</button>
          <button onClick={onCustomers}>👥 Customers</button>
          <button onClick={onSettings}>⚙️ Company / Bill</button>
          <button onClick={load}>↻ Refresh</button>
        </div>
      </div>
    </section>

    <section className="danger-zone">
      <div><strong>Workshop Data Cleanup</strong><span>Customers, enquiries, work orders and related records permanently delete honge. Company settings rahengi.</span></div>
      <button className="danger-button" onClick={clearAllData}>🗑 Delete All Data</button>
    </section>

    {error&&<div className="dashboard-error">{error}</div>}
    {loading?<div className="dashboard-loading">Loading workshop...</div>:<>
      <section className="stats">
        <div className="stat"><span>Enquiries</span><b>{stats.enquiries}</b></div>
        <div className="stat"><span>Customers</span><b>{stats.customers}</b></div>
        <div className="stat"><span>Work Orders</span><b>{stats.orders}</b></div>
        <div className="stat"><span>In Production</span><b>{stats.production}</b></div>
        <div className="stat"><span>Ready</span><b>{stats.ready}</b></div>
        <div className="stat"><span>Order Value</span><b>{money(stats.orderValue)}</b></div>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-panel">
          <div className="panel-title"><h2>Production Status</h2><span>{orders.length} work orders</span></div>
          {stageCounts.map(x=><div className="metric-row" key={x.stage}><span>{x.stage}</span><strong>{x.count}</strong><div className="bar"><i style={{width:`${orders.length?Math.min(x.count/orders.length*100,100):0}%`}}/></div></div>)}
        </div>

        <div className="dashboard-panel">
          <div className="panel-title"><h2>Upcoming Delivery</h2><span>Latest work</span></div>
          {orders.filter(o=>o.delivery).slice(0,8).map(o=><div className="list-item" key={o.id}><div><strong>{o.customer}</strong><small>{o.work}</small></div><span>{new Date(o.delivery).toLocaleDateString("en-IN")}</span></div>)}
          {!orders.filter(o=>o.delivery).length&&<div className="empty-state">No delivery dates added.</div>}
        </div>

        <div className="dashboard-panel">
          <div className="panel-title"><h2>Recent Enquiries</h2><span>{leads.length} total</span></div>
          {leads.slice(0,8).map(l=><div className="list-item" key={l.id}><div><strong>{l.name}</strong><small>{l.phone} · {l.interested_service||"Fabrication work"}</small></div><span>{l.priority||"medium"}</span></div>)}
          {!leads.length&&<div className="empty-state">No enquiries yet.</div>}
        </div>

        <div className="dashboard-panel">
          <div className="panel-title"><h2>Workshop Shortcuts</h2></div>
          <div className="dashboard-actions shortcut-actions">
            <button onClick={onFabrication}>+ New Work Order</button>
            <button onClick={onLeads}>+ New Enquiry</button>
            <button onClick={onCustomers}>+ Customer</button>
          </div>
        </div>
      </section>
    </>}
  </main>;
}
