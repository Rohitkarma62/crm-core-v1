import React,{useEffect,useState} from "react";
import {api} from "../services/api";
const money=v=>`₹${Number(v||0).toLocaleString("en-IN")}`;
const blank={date:new Date().toISOString().slice(0,10),category:"Material",title:"",amount:"",payment_method:"Cash",work_order_id:"",notes:""};
export default function Expenses({onBack}){
 const [items,setItems]=useState([]),[orders,setOrders]=useState([]),[employees,setEmployees]=useState([]),[attendance,setAttendance]=useState([]);
 const [form,setForm]=useState(blank),[salary,setSalary]=useState({employee_id:"",date:new Date().toISOString().slice(0,10),days:"1",status:"present",payment_method:"Cash",notes:""}),[total,setTotal]=useState(0),[error,setError]=useState("");
 async function load(){try{const [e,o,a,x]=await Promise.all([api.get("/api/v1/workshop-finance/expenses"),api.get("/api/v1/fabrication"),api.get("/api/v1/workshop-finance/employees"),api.get("/api/v1/workshop-finance/attendance")]);setItems(e.data.items||[]);setTotal(e.data.total||0);setOrders(o.data.items||[]);setEmployees(x.data.items||[]);setAttendance(a.data.items||[])}catch(e){setError(e.response?.data?.detail||"Expenses load nahi hue.")}}
 useEffect(()=>{load()},[]);
 async function addExpense(e){e.preventDefault();try{await api.post("/api/v1/workshop-finance/expenses",form);setForm(blank);load()}catch(e){setError(e.response?.data?.detail||"Expense save nahi hua.")}}
 async function addSalary(e){e.preventDefault();if(!salary.employee_id){setError("Employee select karein.");return}try{await api.post("/api/v1/workshop-finance/attendance",salary);setSalary({...salary,days:"1",notes:""});load()}catch(e){setError(e.response?.data?.detail||"Salary entry save nahi hui.")}}
 const emp=employees.find(x=>String(x.id)===String(salary.employee_id));
 const expected=emp&&emp.wage_type==="daily"?Number(emp.wage_amount||0)*Number(salary.days||0):0;
 return <main className="page"><div className="page-head"><div><button className="secondary" onClick={onBack}>← Dashboard</button><h1>💰 Expenses & Salary</h1><p className="form-help">Shop ke har kharche ko record karein aur majdur ki daily attendance se salary expense banayein.</p></div></div>
 <section className="fab-stats"><div><span>Total Expenses</span><strong>{money(total)}</strong></div><div><span>Employees</span><strong>{employees.length}</strong></div><div><span>Salary Entries</span><strong>{attendance.length}</strong></div></section>
 {error&&<p className="error">{error}</p>}
 <section className="panel"><h2>👷 Daily Majdur Salary</h2><form className="form-grid" onSubmit={addSalary}>
 <label><span>Employee *</span><select value={salary.employee_id} onChange={e=>setSalary({...salary,employee_id:e.target.value})}><option value="">Select employee</option>{employees.filter(x=>x.active).map(e=><option key={e.id} value={e.id}>{e.name} · {money(e.wage_amount)}/{e.wage_type==="daily"?"day":"month"}</option>)}</select></label>
 <label><span>Date</span><input type="date" value={salary.date} onChange={e=>setSalary({...salary,date:e.target.value})}/></label>
 <label><span>Days / Half Day</span><input type="number" step="0.5" min="0.5" value={salary.days} onChange={e=>setSalary({...salary,days:e.target.value})}/></label>
 <label><span>Status</span><select value={salary.status} onChange={e=>setSalary({...salary,status:e.target.value})}><option value="present">Present</option><option value="half_day">Half Day</option><option value="absent">Absent</option></select></label>
 <label><span>Payment Method</span><select value={salary.payment_method} onChange={e=>setSalary({...salary,payment_method:e.target.value})}><option>Cash</option><option>UPI</option><option>Bank</option></select></label>
 <label><span>Calculated Salary</span><input value={money(expected)} readOnly/></label>
 <label className="full-field"><span>Note</span><textarea value={salary.notes} onChange={e=>setSalary({...salary,notes:e.target.value})} placeholder="Job/site ya extra note"/></label>
 <div className="form-actions"><button disabled={!salary.employee_id}>Save Salary Expense</button></div></form></section>
 <section className="panel"><h2>🧾 Other Workshop Expense</h2><form className="form-grid" onSubmit={addExpense}>
 <label><span>Date</span><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
 <label><span>Category</span><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{["Material","Labour","Transport","Electricity","Rent","Tools","Food/Tea","Repair","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
 <label><span>Expense Title *</span><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required placeholder="Steel, paint, diesel, rent..."/></label>
 <label><span>Amount *</span><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required placeholder="₹"/></label>
 <label><span>Work Order</span><select value={form.work_order_id} onChange={e=>setForm({...form,work_order_id:e.target.value})}><option value="">Shop / General Expense</option>{orders.map(o=><option key={o.id} value={o.id}>{o.customer} · {o.work}</option>)}</select></label>
 <label><span>Payment Method</span><select value={form.payment_method} onChange={e=>setForm({...form,payment_method:e.target.value})}><option>Cash</option><option>UPI</option><option>Bank</option><option>Credit</option></select></label>
 <label className="full-field"><span>Note</span><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
 <div className="form-actions"><button>Save Expense</button></div></form></section>
 <section className="panel"><h2>Expense History</h2><div className="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Expense</th><th>Work Order</th><th>Amount</th><th>Payment</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td>{new Date(x.date).toLocaleDateString("en-IN")}</td><td>{x.category}</td><td>{x.title}</td><td>{orders.find(o=>o.id===x.work_order_id)?.customer||"General"}</td><td><strong>{money(x.amount)}</strong></td><td>{x.payment_method||"-"}</td></tr>)}{!items.length&&<tr><td colSpan="6">No expenses yet.</td></tr>}</tbody></table></div></section>
 </main>
}