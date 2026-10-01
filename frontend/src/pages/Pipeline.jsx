import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

export default function Pipeline({ onBack }) {
  const [pipeline, setPipeline] = useState({ columns: [] });
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(null);
  const [error, setError] = useState("");
  const [dragged, setDragged] = useState(null);
  const [selectedStage, setSelectedStage] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/v1/pipeline");
      setPipeline(data);
      if (selectedStage == null && data.columns?.length) setSelectedStage(data.columns[0].stage.id);
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to load pipeline");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const stages = useMemo(() => pipeline.columns || [], [pipeline]);
  const activeColumn = stages.find(c => c.stage.id === selectedStage) || stages[0];

  async function move(lead, stageId) {
    if (!lead || !stageId || lead.status_id === stageId || moving) return;
    setMoving(lead.id);
    setError("");
    try {
      await api.put(`/api/v1/pipeline/leads/${lead.id}/move`, { status_id: stageId });
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to move lead");
    } finally {
      setMoving(null);
      setDragged(null);
    }
  }

  function dragStart(lead) {
    setDragged(lead);
  }

  function drop(stageId) {
    if (dragged) move(dragged, stageId);
  }

  return (
    <main className="page pipeline-page">
      <div className="page-head pipeline-head">
        <div>
          <button className="secondary" onClick={onBack}>← Dashboard</button>
          <h1>Lead Pipeline</h1>
          <p className="form-help">Move leads through each stage of your sales process.</p>
        </div>
        <div className="pipeline-head-actions">
          <button className="secondary" onClick={load} disabled={loading}>↻ Refresh</button>
          <button onClick={() => window.location.hash = "#leads"}>+ Add Lead</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <section className="panel"><div className="table-state">Loading pipeline...</div></section>
      ) : (
        <>
          <section className="panel pipeline-stage-tabs">
            <div className="pipeline-tabs-scroll">
              {stages.map(col => (
                <button
                  key={col.stage.id}
                  className={activeColumn?.stage.id === col.stage.id ? "stage-tab active" : "stage-tab"}
                  onClick={() => setSelectedStage(col.stage.id)}
                >
                  <span className="stage-dot" style={{ background: col.stage.color || "#64748b" }} />
                  <span>{col.stage.name}</span>
                  <b>{col.leads.length}</b>
                </button>
              ))}
            </div>
          </section>

          <section className="pipeline-board">
            {stages.map(col => (
              <section
                key={col.stage.id}
                className={`pipeline-column ${activeColumn?.stage.id === col.stage.id ? "active-column" : ""}`}
                onDragOver={e => e.preventDefault()}
                onDrop={() => drop(col.stage.id)}
              >
                <header>
                  <div>
                    <span className="stage-dot" style={{ background: col.stage.color || "#64748b" }} />
                    <strong>{col.stage.name}</strong>
                  </div>
                  <span className="count">{col.leads.length}</span>
                </header>

                <div className="pipeline-cards">
                  {col.leads.map(lead => (
                    <article
                      key={lead.id}
                      className="pipeline-card"
                      draggable
                      onDragStart={() => dragStart(lead)}
                    >
                      <div className="pipeline-card-top">
                        <strong>{lead.name}</strong>
                        <span className={`priority ${lead.priority}`}>{lead.priority}</span>
                      </div>
                      <small>{lead.phone}</small>
                      {lead.company && <small>{lead.company}</small>}
                      {lead.interested_service && <p>{lead.interested_service}</p>}
                      {lead.estimated_value != null && <b>₹ {lead.estimated_value.toLocaleString("en-IN")}</b>}

                      <div className="pipeline-move">
                        <select
                          value={lead.status_id}
                          disabled={moving === lead.id}
                          onChange={e => move(lead, Number(e.target.value))}
                          aria-label={`Move ${lead.name}`}
                        >
                          {stages.map(stage => (
                            <option key={stage.stage.id} value={stage.stage.id}>{stage.stage.name}</option>
                          ))}
                        </select>
                        {moving === lead.id && <span>Moving...</span>}
                      </div>
                    </article>
                  ))}

                  {col.leads.length === 0 && (
                    <div className="empty-column">
                      <span>+</span>
                      <strong>No leads in this stage</strong>
                      <small>Use the Move menu on a lead card.</small>
                    </div>
                  )}
                </div>
              </section>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
