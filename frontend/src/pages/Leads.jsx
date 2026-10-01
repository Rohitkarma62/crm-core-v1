import React, { useEffect, useState } from "react";
import { api } from "../services/api";

const blank = { name:"", phone:"", email:"", company:"", priority:"medium", interested_service:"", estimated_value:"", notes:"" };

export default function Leads({ onBack }) {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  async function load(query = search) {
    setLoading(true); setError("");
    try { const { data } = await api.get("/api/v1/leads", { params: { search: query.trim() || undefined } }); setLeads(data.items || []); }
    catch (e) { setError(e.response?.data?.detail || "Unable to load enquiries"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(""); }, []);

  function change(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    setError(""); setSaving(true);
    try {
      const payload = { ...form, estimated_value: form.estimated_value ? Number(form.estimated_value) : null };
      if (editing) await api.put(`/api/v1/leads/${editing}`, payload);
      else await api.post("/api/v1/leads", payload);
      setForm(blank); setEditing(null); await load();
    } catch (e) { setError(e.response?.data?.detail || "Unable to save enquiry"); }
    finally { setSaving(false); }
  }

  async function remove(id) { if (!confirm("Delete this enquiry?")) return; try { await api.delete(`/api/v1/leads/${id}`); await load(); } catch(e) { setError(e.response?.data?.detail || "Unable to delete enquiry"); } }
  function edit(lead) { setEditing(lead.id); setForm({ name:lead.name, phone:lead.phone, email:lead.email||"", company:lead.company||"", priority:lead.priority, interested_service:lead.interested_service||"", estimated_value:lead.estimated_value||"", notes:lead.notes||"" }); window.scrollTo({top:0,behavior:"smooth"}); }

  return <main className="page leads-page">
    <div className="page-head"><div><button className="secondary" onClick={onBack}>← Dashboard</button><h1>📋 Enquiries</h1></div></div>
    <section className="panel">
      <h2>{editing ? "Edit Enquiry" : "New Fabrication Enquiry"}</h2>
      <p className="form-help">Customer ki requirement, site aur estimated work value capture karein.</p>
      <form className="form-grid lead-form" onSubmit={submit}>
        {[["name","Customer Name *"],["phone","Phone *"],["email","Email"],["company","Company"],["interested_service","Work Requirement"],["estimated_value","Estimated Value"]].map(([k,l]) => <label key={k}><span>{l}</span><input name={k} value={form[k]} onChange={change} placeholder={l.replace(" *","")} required={k==="name"||k==="phone"} /></label>)}
        <label><span>Priority</span><select name="priority" value={form.priority} onChange={change}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        <label className="full-field"><span>Notes / Site Details</span><textarea name="notes" value={form.notes} onChange={change} placeholder="Gate, grill, shed, railing, site details, special requirement..."/></label>
        <div className="form-actions"><button type="submit" disabled={saving}>{saving ? (editing ? "Updating..." : "Adding...") : (editing ? "Update Enquiry" : "Save Enquiry")}</button>{editing && <button type="button" className="secondary" disabled={saving} onClick={() => {setEditing(null);setForm(blank)}}>Cancel</button>}</div>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
    <section className="panel">
      <div className="toolbar"><div><h2>All Enquiries</h2><span className="record-count">{loading ? "Loading..." : `${leads.length} enquiry${leads.length===1?"":"ies"}`}</span></div><div className="search-actions"><input className="search-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer, phone..."/><button disabled={loading} onClick={()=>load(search)}>Search</button></div></div>
      {loading ? <div className="table-state">Loading enquiries...</div> : leads.length===0 ? <div className="table-state">No enquiries yet.</div> : <div className="table-wrap"><table><thead><tr><th>Customer</th><th>Phone</th><th>Work</th><th>Priority</th><th>Value</th><th>Actions</th></tr></thead><tbody>{leads.map(l=><tr key={l.id}><td><strong>{l.name}</strong></td><td>{l.phone}</td><td>{l.interested_service||"-"}</td><td>{l.priority}</td><td>{l.estimated_value ?? "-"}</td><td className="actions-cell"><button className="small" onClick={()=>edit(l)}>Edit</button> <button className="small danger" onClick={()=>remove(l.id)}>Delete</button></td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
