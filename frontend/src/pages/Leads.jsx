import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function Leads({ onBack }) {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name:"", phone:"", email:"", company:"", priority:"medium", interested_service:"", estimated_value:"", notes:"" });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { const {data} = await api.get("/api/v1/leads", { params: { search: search || undefined } }); setLeads(data.items); }
    catch (e) { setError(e.response?.data?.detail || "Unable to load leads"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function change(e) { setForm({...form, [e.target.name]: e.target.value}); }
  async function submit(e) {
    e.preventDefault(); setError("");
    try {
      const payload = {...form, estimated_value: form.estimated_value ? Number(form.estimated_value) : null};
      if (editing) await api.put(`/api/v1/leads/${editing}`, payload); else await api.post("/api/v1/leads", payload);
      setForm({name:"",phone:"",email:"",company:"",priority:"medium",interested_service:"",estimated_value:"",notes:""}); setEditing(null); load();
    } catch (e) { setError(e.response?.data?.detail || "Unable to save lead"); }
  }
  async function remove(id) { if (!confirm("Delete this lead?")) return; try { await api.delete(`/api/v1/leads/${id}`); load(); } catch(e) { setError(e.response?.data?.detail || "Unable to delete lead"); } }
  function edit(lead) { setEditing(lead.id); setForm({name:lead.name,phone:lead.phone,email:lead.email||"",company:lead.company||"",priority:lead.priority,interested_service:lead.interested_service||"",estimated_value:lead.estimated_value||"",notes:lead.notes||""}); window.scrollTo({top:0,behavior:"smooth"}); }

  return <div className="page"><div className="topbar"><button onClick={onBack}>← Dashboard</button><h1>Leads</h1></div>
    <div className="card"><h2>{editing ? "Edit Lead" : "Add Lead"}</h2>{error && <p className="error">{error}</p>}
      <form className="grid-form" onSubmit={submit}>{["name","phone","email","company","interested_service","estimated_value"].map(k=><input key={k} name={k} value={form[k]} onChange={change} placeholder={k.replaceAll("_"," ")} required={k==="name"||k==="phone"}/>)}
      <select name="priority" value={form.priority} onChange={change}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select><textarea name="notes" value={form.notes} onChange={change} placeholder="Notes"/>
      <button type="submit">{editing ? "Update Lead" : "Add Lead"}</button>{editing && <button type="button" onClick={()=>{setEditing(null);setForm({name:"",phone:"",email:"",company:"",priority:"medium",interested_service:"",estimated_value:"",notes:""})}}>Cancel</button>}</form>
    </div>
    <div className="card"><div className="row"><h2>All Leads</h2><div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone, email..."/><button onClick={load}>Search</button></div></div>
      {loading ? <p>Loading...</p> : leads.length===0 ? <p>No leads yet.</p> : <div className="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Company</th><th>Priority</th><th>Value</th><th>Actions</th></tr></thead><tbody>{leads.map(l=><tr key={l.id}><td>{l.name}</td><td>{l.phone}</td><td>{l.company||"-"}</td><td>{l.priority}</td><td>{l.estimated_value ?? "-"}</td><td><button onClick={()=>edit(l)}>Edit</button> <button onClick={()=>remove(l.id)}>Delete</button></td></tr>)}</tbody></table></div>}
    </div></div>
}
