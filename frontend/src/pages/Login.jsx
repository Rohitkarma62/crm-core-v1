import React, { useState } from "react";
import { login, requestPasswordReset } from "../services/api";

export default function Login({ onAuthenticated }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);

  async function submit(e) {
    e.preventDefault(); setError(""); setNotice(""); setLoading(true);
    try { await login(form); onAuthenticated(); }
    catch (err) { setError(err.response?.data?.detail || "Login failed"); }
    finally { setLoading(false); }
  }

  async function sendReset(e) {
    e.preventDefault(); setError(""); setNotice(""); setLoading(true);
    try {
      const result = await requestPasswordReset(form.email);
      setNotice(result.message || "If an account exists for this email, a reset link has been sent.");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to send reset link.");
    } finally { setLoading(false); }
  }

  if (forgot) return <div className="auth-page"><form className="card" onSubmit={sendReset}>
    <h1>Forgot password?</h1>
    <p>Enter your account email and we'll send a secure reset link.</p>
    {error && <div className="error">{error}</div>}
    {notice && <div className="success-message">{notice}</div>}
    <label>Email<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    <button disabled={loading}>{loading ? "Sending..." : "Send reset link"}</button>
    <button type="button" className="secondary reset-back" onClick={() => { setForgot(false); setError(""); setNotice(""); }}>Back to sign in</button>
  </form></div>;

  return <div className="auth-page"><form className="card" onSubmit={submit}>
    <h1>CRM Core</h1><p>Sign in to your business dashboard.</p>
    {error && <div className="error">{error}</div>}
    <label>Email<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    <label>Password<input type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
    <button disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
    <button type="button" className="forgot-link" onClick={() => { setForgot(true); setError(""); }}>Forgot password?</button>
  </form></div>;
}
