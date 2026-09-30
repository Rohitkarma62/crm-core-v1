import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function Sales({onBack}){
  const [sales,setSales]=useState([]); const [customers,setCustomers]=useState([]); const [form,setForm]=useState({customer_id:"",amount:"",notes:""}); const [error,setError]=useState("");
  async function load(){ const [s,c]=await Promise.all([api.get("/api/v1/sales"),api.get("/api/v1/customers")]); setSales(s.data.items); setCustomers(c.data.items); }
  useEffect(()=>{load().catch(e=>setError(e.response?.data?.detail||"Unable to load sales"));},[]);
  async function addSale(e){ e.preventDefault(); setError(""); try{await api.post("/api/v1/sales",{...form,customer_id:Number(form.customer_id),amount:Number(form.amount)}); setForm({customer_id:"",amount:"",notes:""}); await load();}catch(e){setError(e.response?.data?.detail||"Unable to create sale");} }
  async function addPayment(sale){ const remaining=Number(sale.balance_amount); const raw=window.prompt(`Outstanding: ₹${remaining.toFixed(2)}\nPayment amount:`); if(!raw)return; const amount=Number(raw); if(!amount)return; try{await api.post("/api/v1/payments",{sale_id:sale.id,amount,payment_method:"manual"}); await load();}catch(e){setError(e.response?.data?.detail||"Unable to add payment");} }
  return <div className="page"><header className="topbar"><button onClick={onBack}>← Dashboard</button><h1>Sales & Payments</h1></header>
    <form className="card form-grid" onSubmit={addSale}><h2>New Sale</h2><select required value={form.customer_id} onChange={e=>setForm({...form,customer_id:e.target.value})}><option value="">Select customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}</select><input required type="number" min="0.01" step="0.01" placeholder="Amount" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/><input placeholder="Notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/><button type="submit">Create Sale</button></form>
    {error&&<p className="error">{error}</p>}
    <div className="card"><h2>Sales</h2><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead><tbody>{sales.map(s=>{const c=customers.find(x=>x.id===s.customer_id);return <tr key={s.id}><td>{c?.name||`Customer #${s.customer_id}`}</td><td>₹{Number(s.amount).toFixed(2)}</td><td>₹{Number(s.paid_amount).toFixed(2)}</td><td>₹{Number(s.balance_amount).toFixed(2)}</td><td>{s.status}</td><td>{Number(s.balance_amount)>0&&<button onClick={()=>addPayment(s)}>Add Payment</button>}</td></tr>})}</tbody></table></div></div>
  </div>
}
