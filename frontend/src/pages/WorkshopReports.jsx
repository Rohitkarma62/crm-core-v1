import React,{useEffect,useState} from "react";
import {api} from "../services/api";
const money=v=>`₹${Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:0})}`;
export default function WorkshopReports({onBack}){
 const [data,setData]=useState(null),[error,setError]=useState("");
 useEffect(()=>{api.get("/api/v1/workshop-reports").then(r=>setData(r.data)).catch(e=>setError(e.response?.data?.detail||"Reports load nahi hue."))},[]);
 if(error)return <main className="page"><button className="secondary" onClick={onBack}>← Dashboard</button><p className="error">{error}</p></main>;
 const s=data?.summary||{};
 return <main className="page workshop-page reports-page"><div className="page-head"><div><button className="secondary" onClick={onBack}>← Dashboard</button><h1>📊 Workshop Reports</h1><p className="form-help">Job-wise cost, collection aur estimated profit ek jagah.</p></div></div>
 <section className="stats"><div className="stat"><span>Order Value</span><b>{money(s.order_value)}</b></div><div className="stat"><span>Expenses</span><b>{money(s.expenses)}</b></div><div className="stat"><span>Payments Received</span><b>{money(s.payments)}</b></div><div className="stat"><span>Balance After Expenses</span><b>{money(s.balance)}</b></div><div className="stat"><span>Stock Value</span><b>{money(s.stock_value)}</b></div></section>
 <section className="panel"><div className="toolbar"><h2>Job Profit & Collection</h2><span className="record-count">{(data?.jobs||[]).length} jobs</span></div><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Work</th><th>Amount</th><th>Cost</th><th>Paid</th><th>Due</th><th>Profit</th><th>Stage</th></tr></thead><tbody>{(data?.jobs||[]).map(j=><tr key={j.id}><td>{j.customer}</td><td>{j.work}</td><td>{money(j.amount)}</td><td>{money(j.expense)}</td><td>{money(j.paid)}</td><td>{money(j.outstanding)}</td><td>{money(j.profit)}</td><td>{j.stage}</td></tr>)}</tbody></table></div></section>
 </main>;
}
