import React,{useEffect,useState} from "react";
import {api} from "../services/api";
const money=v=>`₹${Number(v||0).toLocaleString("en-IN")}`;
export default function Employees({onBack}){
 const [items,setItems]=useState([]),[form,setForm]=useState({name:"",phone:"",role:"Majdur",wage_type:"daily",wage_amount:""}),[saving,setSaving]=useState(false),[error,setError]=useState("");
 async function load(){try{const {data}=await api.get("/api/v1/workshop-finance/employees");setItems(data.items||[])}catch(e){setError(e.response?.data?.detail||"Employees load nahi hue.")}}
 useEffect(()=>{load()},[]);
 async function add(e){e.preventDefault();setSaving(true);setError("");try{const {data}=await api.post("/api/v1/workshop-finance/employees",form);setItems(v=>[...v,data]);setForm({name:"",phone:"",role:"Majdur",wage_type:"daily",wage_amount:""})}catch(e){setError(e.response?.data?.detail||"Employee save nahi hua.")}finally{setSaving(false)}}
 return <main className="page workshop-page employees-page"><div className="page-head"><div><button className="secondary" onClick={onBack}>← Dashboard</button><h1>👷 Employees / Majdur</h1><p className="form-help">Daily wage ya monthly salary wale staff yahan manage karein.</p></div></div>
 <section className="panel"><div className="panel-heading"><h2>+ Add Employee</h2><p>Majdur, welder, helper aur staff ki salary details save karein.</p></div><form className="form-grid workshop-form" onSubmit={add}>
 <label><span>Name *</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required placeholder="Employee / Majdur name"/></label>
 <label><span>Mobile</span><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Mobile"/></label>
 <label><span>Role</span><input value={form.role} onChange={e=>setForm({...form,role:e.target.value})} placeholder="Welder / Helper / Painter"/></label>
 <label><span>Salary Type</span><select value={form.wage_type} onChange={e=>setForm({...form,wage_type:e.target.value})}><option value="daily">Daily Wage</option><option value="monthly">Monthly Salary</option></select></label>
 <label><span>{form.wage_type==="daily"?"Daily Wage":"Monthly Salary"} *</span><input type="number" value={form.wage_amount} onChange={e=>setForm({...form,wage_amount:e.target.value})} required placeholder="₹"/></label>
 <div className="form-actions"><button disabled={saving}>{saving?"Saving...":"Add Employee"}</button></div></form>{error&&<p className="error">{error}</p>}</section>
 <section className="panel"><div className="panel-heading"><h2>Employee List</h2><p>{items.length} employees</p></div><div className="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Salary Type</th><th>Rate</th><th>Status</th></tr></thead><tbody>{items.map(e=><tr key={e.id}><td><strong>{e.name}</strong><br/><small>{e.phone||"-"}</small></td><td>{e.role||"-"}</td><td>{e.wage_type==="daily"?"Daily":"Monthly"}</td><td>{money(e.wage_amount)}</td><td>{e.active?"Active":"Inactive"}</td></tr>)}{!items.length&&<tr><td colSpan="5">No employees yet.</td></tr>}</tbody></table></div></section>
 </main>
}