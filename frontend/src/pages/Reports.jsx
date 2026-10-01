import React, { useEffect, useState } from "react";
import { api } from "../services/api";

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function Reports({ onBack }) {
  const [data, setData] = useState({ leads: null, sales: null, payments: null, staff: null });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    setLoading(true); setError("");
    const params = {};
    if (from) params.start_date = from;
    if (to) params.end_date = to;
    try {
      const [leads, sales, payments, staff] = await Promise.all([
        api.get("/api/v1/reports/leads", { params }),
        api.get("/api/v1/reports/sales", { params }),
        api.get("/api/v1/reports/payments", { params }),
        api.get("/api/v1/reports/staff", { params }),
      ]);
      setData({ leads: leads.data, sales: sales.data, payments: payments.data, staff: staff.data });
    } catch (e) { setError(e.response?.data?.detail || "Reports load nahi ho sake."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return <div className="page">
    <div className="page-head"><div><button onClick={onBack}>← Dashboard</button><h1>Reports</h1><p>Business performance from your CRM data.</p></div></div>
    <section className="card"><h2>Date Range</h2><div className="button-row"><label>From <input type="date" value={from} onChange={e=>setFrom(e.target.value)} /></label><label>To <input type="date" value={to} onChange={e=>setTo(e.target.value)} /></label><button onClick={load}>Apply</button><button onClick={()=>{setFrom("");setTo("");setTimeout(load,0)}}>Reset</button></div></section>
    {error && <p className="error">{error}</p>}
    {loading ? <div className="card">Loading reports...</div> : <>
      <section className="stats">
        <div className="stat"><span>Total Leads</span><b>{data.leads?.total || 0}</b></div>
        <div className="stat"><span>Conversion</span><b>{data.leads?.conversion_rate || 0}%</b></div>
        <div className="stat"><span>Sales</span><b>{data.sales?.total_sales || 0}</b></div>
        <div className="stat"><span>Revenue</span><b>{money(data.sales?.total_value)}</b></div>
        <div className="stat"><span>Collected</span><b>{money(data.sales?.collected)}</b></div>
        <div className="stat"><span>Outstanding</span><b>{money(data.sales?.outstanding)}</b></div>
      </section>
      <section className="dashboard-grid">
        <div className="dashboard-panel"><div className="panel-title"><h2>Lead Status</h2></div>{(data.leads?.by_status || []).map(x => [x.name, x.count]).map(([k,v])=><div className="metric-row" key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>
        <div className="dashboard-panel"><div className="panel-title"><h2>Lead Sources</h2></div>{(data.leads?.by_source || []).map(x => [x.name, x.count]).map(([k,v])=><div className="metric-row" key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>
        <div className="dashboard-panel"><div className="panel-title"><h2>Payments</h2></div>{(data.payments?.by_method || []).map(x => [x.name, x.amount]).map(([k,v])=><div className="metric-row" key={k}><span>{k}</span><strong>{money(v)}</strong></div>)}</div>
        <div className="dashboard-panel"><div className="panel-title"><h2>Staff Performance</h2></div>{(data.staff?.staff || []).map((x)=><div className="metric-row" key={x.id}><span>{x.name}</span><strong>{x.converted} converted · {x.sales} sales</strong></div>)}</div>
      </section>
    </>}
  </div>;
}
