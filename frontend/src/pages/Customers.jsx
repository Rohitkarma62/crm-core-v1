import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function Customers({onBack}) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({name:"",phone:"",email:"",company:"",address:""});
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  async function load(){
    const {data}=await api.get("/api/v1/customers", {params:{search:search || undefined, page_size:100}});
    setCustomers(data.items);
  }
  useEffect(()=>{load().catch(e=>setError(e.response?.data?.detail || "Unable to load customers"));},[search]);

  function reset(){setForm({name:"",phone:"",email:"",company:"",address:""});setEditing(null);}
  async function save(e){
    e.preventDefault(); setError("");
    try {
      if(editing) await api.put(`/api/v1/customers/${editing}`, form);
      else await api.post("/api/v1/customers", form);
      reset(); await load();
    } catch(e){setError(e.response?.data?.detail || "Unable to save customer");}
  }
  async function remove(id){
    if(!confirm("Delete this customer?")) return;
    try { await api.delete(`/api/v1/customers/${id}`); await load(); } catch(e){setError(e.response?.data?.detail || "Unable to delete customer");}
  }
  function edit(c){setEditing(c.id);setForm({name:c.name,phone:c.phone,email:c.email||"",company:c.company||"",address:c.address||""});}

  return <main className="page">
    <div className="page-head"><button className="secondary" onClick={onBack}>← Dashboard</button><h1>Customers</h1></div>
    <section className="panel">
      <h2>{editing ? "Edit Customer" : "Add Customer"}</h2>
      <form className="form-grid" onSubmit={save}>
        {[["name","Name *"],["phone","Phone *"],["email","Email"],["company","Company"],["address","Address"]].map(([key,label])=><label key={key}>{label}<input value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} required={key==='name'||key==='phone'}/></label>)}
        <div className="form-actions"><button type="submit">{editing ? "Update" : "Add Customer"}</button>{editing&&<button type="button" className="secondary" onClick={reset}>Cancel</button>}</div>
      </form>
      {error&&<p className="error">{error}</p>}
    </section>
    <section className="panel"><div className="toolbar"><h2>Customer List</h2><input placeholder="Search customers..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      <div className="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Company</th><th>Email</th><th>Actions</th></tr></thead><tbody>
        {customers.map(c=><tr key={c.id}><td>{c.name}</td><td>{c.phone}</td><td>{c.company||"-"}</td><td>{c.email||"-"}</td><td><button className="small" onClick={()=>edit(c)}>Edit</button> <button className="small danger" onClick={()=>remove(c.id)}>Delete</button></td></tr>)}
        {!customers.length&&<tr><td colSpan="5">No customers found.</td></tr>}
      </tbody></table></div>
    </section>
  </main>;
}
