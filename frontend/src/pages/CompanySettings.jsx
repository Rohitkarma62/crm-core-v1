import React, { useEffect, useState } from "react";
import { api, clearCompanyCrmData } from "../services/api";

export default function CompanySettings({ onBack }) {
  const [form,setForm]=useState({name:"",owner_name:"",phone:"",email:"",address:"",gstin:"",invoice_prefix:"INV",warranty_text:""});
  const [error,setError]=useState(""); const [saving,setSaving]=useState(false); const [message,setMessage]=useState("");
  useEffect(()=>{api.get("/api/v1/billing/company").then(r=>setForm({...r.data,owner_name:r.data.owner_name||"Yuvraj Karma",phone:r.data.phone||"9977932342 / 7089117898 / 9131766526",address:r.data.address||"Gram Ghotiya, District Khargone, Madhya Pradesh",invoice_prefix:r.data.invoice_prefix||"INV",warranty_text:r.data.warranty_text||"इस बिल में दिए गए फैब्रिकेशन कार्य पर बिल की तारीख से 1 माह की वारंटी दी जाती है।"})).catch(e=>setError(e.response?.data?.detail||"Settings load failed"));},[]);
  async function save(e){e.preventDefault();setSaving(true);setMessage("");try{await api.put("/api/v1/billing/company",form);setMessage("Company settings saved.");}catch(e){setError(e.response?.data?.detail||"Save failed");}finally{setSaving(false);}}
  async function clearAllData(){
    const confirmed = window.confirm("WARNING: This will permanently delete ALL customers, leads, follow-ups, sales, payments, invoices, receipts, payment proofs and import history for this company. Your login, users and company settings will remain. Continue?");
    if(!confirmed) return;
    const phrase = window.prompt('Type DELETE to permanently clear all CRM data:');
    if(phrase !== "DELETE") return;
    setError(""); setMessage(""); setSaving(true);
    try{
      const result = await clearCompanyCrmData();
      setMessage(result.message || "All CRM data cleared.");
    }catch(e){
      setError(e.response?.data?.detail || "Unable to clear CRM data");
    }finally{setSaving(false);}
  }
  async function upload(kind,file){if(!file)return;const body=new FormData();body.append("file",file);try{await api.post("/api/v1/billing/company/asset/"+kind,body,{headers:{"Content-Type":"multipart/form-data"}});setMessage(kind+" uploaded.");}catch(e){setError(e.response?.data?.detail||"Upload failed");}}
  const field=(key,label)=><label><span>{label}</span><input value={form[key]||""} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>;
  return <main className="page settings-page">
    <div className="page-head"><button className="secondary" onClick={onBack}>← Dashboard</button><h1>Company & Invoice Settings</h1></div>
    {error&&<div className="error">{error}</div>}{message&&<div className="success-message">{message}</div>}
    <section className="panel"><div className="panel-heading"><h2>कंपनी विवरण</h2><p>ये जानकारी invoice और receipt में इस्तेमाल होगी।</p></div>
      <form className="form-grid customer-form" onSubmit={save}>{field("name","Company Name *")}{field("owner_name","Owner Name")}{field("phone","Phone")}{field("email","Email")}{field("address","Address")}{field("gstin","GSTIN")}{field("invoice_prefix","Invoice Prefix")}
        <label className="full-field"><span>Warranty Text</span><textarea value={form.warranty_text||""} onChange={e=>setForm({...form,warranty_text:e.target.value})}/></label>
        <div className="form-actions"><button disabled={saving}>{saving?"Saving...":"Save Settings"}</button></div>
      </form>
    </section>
    <section className="panel"><div className="panel-heading"><h2>Invoice Branding</h2><p>Logo, owner signature और company stamp upload करें।</p></div>
      <div className="branding-upload-grid">{["logo","signature","stamp"].map(k=><div className="branding-upload" key={k}><strong>{k==="logo"?"Company Logo":k==="signature"?"Owner Signature":"Company Stamp"}</strong><input type="file" accept="image/*" onChange={e=>upload(k,e.target.files?.[0])}/>{form.assets?.[k]&&<small>{form.assets[k].filename}</small>}</div>)}</div>
    </section>
  </main>;
}
