import React, { useEffect, useMemo, useState } from "react";
import { api, logout, clearCompanyCrmData } from "../services/api";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const dateTime = (value) => new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function Dashboard({ onLogout, onLeads, onPipeline, onCustomers, onSales, onImport, onReports, onSettings }) {
  const safeJson = (key) => { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } };
  const user = safeJson("crm_user");
  const business = safeJson("crm_business");
  const [summary, setSummary] = useState(null);
  const [sources, setSources] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const [s, src, leads, fus] = await Promise.all([
        api.get("/api/v1/dashboard/summary"),
        api.get("/api/v1/dashboard/sources"),
        api.get("/api/v1/dashboard/recent-leads"),
        api.get("/api/v1/dashboard/follow-ups"),
      ]);
      setSummary(s.data);
      setSources(src.data);
      setRecentLeads(leads.data);
      setFollowUps(fus.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Dashboard data load nahi ho saka.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  function exit() { logout(); onLogout(); }

  async function clearAllData() {
    const confirmed = window.confirm("WARNING: This will permanently delete ALL CRM data for this company, including customers, leads, sales, payments and invoices. Your login and company settings will remain. Continue?");
    if (!confirmed) return;
    const phrase = window.prompt("Type DELETE to permanently clear all CRM data:");
    if (phrase !== "DELETE") return;
    setError("");
    try {
      await clearCompanyCrmData();
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to clear CRM data.");
    }
  }

  const cards = useMemo(() => summary ? [
    ["Total Leads", summary.total_leads],
    ["Follow-ups Today", summary.followups_today],
    ["Converted", summary.converted_leads],
    ["Revenue", money(summary.total_revenue)],
    ["Customers", summary.total_customers],
    ["Overdue Follow-ups", summary.overdue_followups],
    ["Collected", money(summary.collected_revenue)],
    ["Outstanding", money(summary.outstanding_revenue)],
  ] : [], [summary]);

  return <main className="dashboard">
    <header>
      <div><strong>{business.name || "CRM Core"}</strong><span>Welcome, {user.name}</span></div>
      <button onClick={exit}>Logout</button>
    </header>

    <section className="welcome">
      <div className="row">
        <div><h1>Dashboard</h1><p>Live business overview from your CRM data.</p></div>
        <div className="dashboard-actions">
          <button onClick={onLeads}>Leads</button><button onClick={onPipeline}>Pipeline</button>
          <button onClick={onCustomers}>Customers</button><button onClick={onSales}>Sales</button><button onClick={onImport}>Import / Export</button><button onClick={onReports}>Reports</button><button onClick={onSettings}>Company / Bill Settings</button>
          <button onClick={loadDashboard}>Refresh</button>
        </div>
      </div>
    </section>

    {error && <div className="dashboard-error">{error}</div>}
    {loading ? <div className="dashboard-loading">Loading dashboard...</div> : <>
      <section className="stats">
        {cards.map(([label, value]) => <div className="stat" key={label}><span>{label}</span><b>{value}</b></div>)}
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-panel">
          <div className="panel-title"><h2>Lead Pipeline</h2><span>{summary?.conversion_rate || 0}% conversion</span></div>
          {[["New", summary?.new_leads], ["Contacted", summary?.contacted_leads], ["Interested", summary?.interested_leads], ["Follow-up", summary?.followup_leads], ["Negotiation", summary?.negotiation_leads], ["Converted", summary?.converted_leads], ["Lost", summary?.lost_leads]].map(([label, value]) => <div className="metric-row" key={label}><span>{label}</span><strong>{value || 0}</strong><div className="bar"><i style={{width: `${summary?.total_leads ? Math.min(((value || 0) / summary.total_leads) * 100, 100) : 0}%`}} /></div></div>)}
        </div>

        <div className="dashboard-panel">
          <div className="panel-title"><h2>Lead Sources</h2><span>{sources.length} sources</span></div>
          {sources.length ? sources.map((item) => <div className="metric-row" key={item.name}><span>{item.name}</span><strong>{item.count}</strong><div className="bar"><i style={{width: `${summary?.total_leads ? Math.min((item.count / summary.total_leads) * 100, 100) : 0}%`}} /></div></div>) : <div className="empty-state">No lead source data yet.</div>}
        </div>

        <div className="dashboard-panel">
          <div className="panel-title"><h2>Recent Leads</h2><span>Latest 8</span></div>
          {recentLeads.length ? <div className="dashboard-list">{recentLeads.map((lead) => <div className="list-item" key={lead.id}><div><strong>{lead.name}</strong><small>{lead.phone}</small></div><span className={`priority ${lead.priority}`}>{lead.status || "Unassigned"}</span></div>)}</div> : <div className="empty-state">No leads yet.</div>}
        </div>

        <div className="dashboard-panel">
          <div className="panel-title"><h2>Upcoming Follow-ups</h2><span>{followUps.length} shown</span></div>
          {followUps.length ? <div className="dashboard-list">{followUps.map((item) => <div className="list-item" key={item.id}><div><strong>{item.lead_name}</strong><small>{dateTime(item.scheduled_at)}</small></div><span className="followup-status">Pending</span></div>)}</div> : <div className="empty-state">No pending follow-ups.</div>}
        </div>
      </section>
    </>}
  </main>;
}
