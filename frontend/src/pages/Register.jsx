import React, { useState } from "react";
import { register } from "../services/api";

export default function Register({ onAuthenticated }) {
  const [form, setForm] = useState({
    business_name:"", name:"", owner_name:"", email:"", password:"", phone:"", address:"", gstin:"", industry:"",
    logo:null, signature:null, stamp:null,
  });
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const set = (key) => (e) => setForm({...form,[key]:e.target.type === "file" ? e.target.files?.[0] || null : e.target.value});

  async function submit(e) {
    e.preventDefault(); setError(""); setLoading(true);
    try { await register(form); onAuthenticated(); }
    catch(err) { setError(err.response?.data?.detail || "Registration failed"); }
    finally { setLoading(false); }
  }

  return <div className="auth-page"><form className="card register-card" onSubmit={submit}>
    <h1>Create your CRM</h1>
    <p>पहले business की पूरी details और invoice branding सेट करें। बाद में हर bill इसी branding से बनेगा।</p>
    {error && <div className="error">{error}</div>}

    <h3>Business Details</h3>
    <label>Business / Company Name *<input required value={form.business_name} onChange={set("business_name")}/></label>
    <label>Owner Name *<input required value={form.owner_name} onChange={set("owner_name")}/></label>
    <label>Admin / Your Name *<input required value={form.name} onChange={set("name")}/></label>
    <label>Email *<input type="email" required value={form.email} onChange={set("email")}/></label>
    <label>Password *<input type="password" minLength="8" required value={form.password} onChange={set("password")}/></label>
    <label>Business Phone<input value={form.phone} onChange={set("phone")}/></label>
    <label>Business Address<textarea value={form.address} onChange={set("address")}/></label>
    <label>GSTIN<input value={form.gstin} onChange={set("gstin")}/></label>
    <label>Industry<input value={form.industry} onChange={set("industry")}/></label>

    <div className="registration-branding">
      <h3>Invoice Branding</h3>
      <p>Logo और owner signature अभी देना जरूरी है। Stamp optional है।</p>
      <label>Company Logo *<input type="file" required accept="image/png,image/jpeg,image/webp" onChange={set("logo")}/></label>
      <label>Owner Signature *<input type="file" required accept="image/png,image/jpeg,image/webp" onChange={set("signature")}/></label>
      <label>Company Stamp (Optional)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={set("stamp")}/></label>
    </div>

    <button disabled={loading}>{loading ? "Creating business..." : "Create Business & CRM"}</button>
  </form></div>;
}
