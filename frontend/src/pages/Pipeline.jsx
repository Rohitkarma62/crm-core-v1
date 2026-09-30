import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function Pipeline({ onBack }) {
  const [pipeline, setPipeline] = useState({columns: []});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dragged, setDragged] = useState(null);

  async function load() {
    setLoading(true); setError("");
    try { const {data} = await api.get("/api/v1/pipeline"); setPipeline(data); }
    catch (e) { setError(e.response?.data?.detail || "Unable to load pipeline"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function move(stageId) {
    if (!dragged || dragged.status_id === stageId) return;
    try {
      await api.put(`/api/v1/pipeline/leads/${dragged.id}/move`, {status_id: stageId});
      setDragged(null); load();
    } catch (e) { setError(e.response?.data?.detail || "Unable to move lead"); }
  }

  return <div className="page pipeline-page">
    <div className="topbar"><button onClick={onBack}>← Dashboard</button><h1>Lead Pipeline</h1><button onClick={load}>Refresh</button></div>
    {error && <p className="error">{error}</p>}
    {loading ? <div className="card"><p>Loading pipeline...</p></div> :
      <div className="pipeline-board">
        {pipeline.columns.map(col => <section key={col.stage.id} className="pipeline-column"
          onDragOver={e=>e.preventDefault()} onDrop={()=>move(col.stage.id)}>
          <header><div><span className="stage-dot" style={{background: col.stage.color || "#64748b"}}></span><strong>{col.stage.name}</strong></div><span className="count">{col.leads.length}</span></header>
          <div className="pipeline-cards">
            {col.leads.map(lead => <article key={lead.id} className="pipeline-card" draggable onDragStart={()=>setDragged(lead)}>
              <div className="pipeline-card-top"><strong>{lead.name}</strong><span className={`priority ${lead.priority}`}>{lead.priority}</span></div>
              {lead.company && <small>{lead.company}</small>}
              <small>{lead.phone}</small>
              {lead.interested_service && <p>{lead.interested_service}</p>}
              {lead.estimated_value != null && <b>₹ {lead.estimated_value.toLocaleString("en-IN")}</b>}
            </article>)}
            {col.leads.length===0 && <div className="empty-column">Drop leads here</div>}
          </div>
        </section>)}
      </div>}
  </div>
}
