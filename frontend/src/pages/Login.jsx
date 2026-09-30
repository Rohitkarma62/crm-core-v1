import { useState } from "react";
import { login } from "../services/api";

export default function Login({ onAuthenticated }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault(); setError(""); setLoading(true);
    try { await login(form); onAuthenticated(); }
    catch (err) { setError(err.response?.data?.detail || "Login failed"); }
    finally { setLoading(false); }
  }

  return <div className="auth-page"><form className="card" onSubmit={submit}>
    <h1>CRM Core</h1><p>Sign in to your business dashboard.</p>
    {error && <div className="error">{error}</div>}
    <label>Email<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    <label>Password<input type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
    <button disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
  </form></div>;
}
