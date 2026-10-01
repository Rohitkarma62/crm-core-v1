import React, { useState } from "react";
import { resetPassword } from "../services/api";

export default function ResetPassword({ token, onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Reset link is invalid or expired.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <div className="auth-page"><section className="card reset-card">
      <h1>Password updated</h1>
      <p>Your password has been changed successfully.</p>
      <button onClick={onDone}>Back to sign in</button>
    </section></div>;
  }

  return <div className="auth-page"><form className="card reset-card" onSubmit={submit}>
    <h1>Reset password</h1>
    <p>Choose a new password for your CRM Core account.</p>
    {error && <div className="error">{error}</div>}
    <label>New password<input type="password" minLength="8" required value={password} onChange={e=>setPassword(e.target.value)} /></label>
    <label>Confirm password<input type="password" minLength="8" required value={confirm} onChange={e=>setConfirm(e.target.value)} /></label>
    <button disabled={loading}>{loading ? "Updating..." : "Update password"}</button>
  </form></div>;
}
