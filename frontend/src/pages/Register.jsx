import { useState } from "react";
import { register } from "../services/api";

export default function Register({ onAuthenticated }) {
  const [form, setForm] = useState({ business_name:"", name:"", email:"", password:"", phone:"", industry:"" });
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const set = (key) => (e) => setForm({...form,[key]:e.target.value});
  async function submit(e) { e.preventDefault(); setError(""); setLoading(true); try { await register(form); onAuthenticated(); } catch(err) { setError(err.response?.data?.detail || "Registration failed"); } finally { setLoading(false); } }
  return <div className="auth-page"><form className="card" onSubmit={submit}>
    <h1>Create your CRM</h1><p>Set up your business workspace.</p>{error && <div className="error">{error}</div>}
    <label>Business name<input required value={form.business_name} onChange={set("business_name")}/></label>
    <label>Your name<input required value={form.name} onChange={set("name")}/></label>
    <label>Email<input type="email" required value={form.email} onChange={set("email")}/></label>
    <label>Password<input type="password" minLength="8" required value={form.password} onChange={set("password")}/></label>
    <label>Phone<input value={form.phone} onChange={set("phone")}/></label>
    <label>Industry<input value={form.industry} onChange={set("industry")}/></label>
    <button disabled={loading}>{loading ? "Creating..." : "Create account"}</button>
  </form></div>;
}
