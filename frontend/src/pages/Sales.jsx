import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function Sales({ onBack }) {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ customer_id: "", amount: "", notes: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentId, setPaymentId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([api.get("/api/v1/sales"), api.get("/api/v1/customers")]);
      setSales(s.data.items || []);
      setCustomers(c.data.items || []);
      setError("");
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to load sales");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function addSale(e) {
    e.preventDefault();
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      await api.post("/api/v1/sales", {
        ...form,
        customer_id: Number(form.customer_id),
        amount: Number(form.amount),
      });
      setForm({ customer_id: "", amount: "", notes: "" });
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to create sale");
    } finally {
      setSaving(false);
    }
  }

  async function addPayment(sale) {
    if (paymentId) return;
    const remaining = Number(sale.balance_amount);
    const raw = window.prompt(`Outstanding: ₹${remaining.toFixed(2)}\nPayment amount:`);
    if (!raw) return;
    const amount = Number(raw);
    if (!amount || amount <= 0) return;
    setPaymentId(sale.id);
    setError("");
    try {
      await api.post("/api/v1/payments", { sale_id: sale.id, amount, payment_method: "manual" });
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to add payment");
    } finally {
      setPaymentId(null);
    }
  }

  return (
    <main className="page sales-page">
      <div className="page-head"><button className="secondary" onClick={onBack}>← Dashboard</button><h1>Sales & Payments</h1></div>

      <section className="panel">
        <h2>New Sale</h2>
        <p className="form-help">Create one sale against an existing customer.</p>
        <form className="form-grid sales-form" onSubmit={addSale}>
          <label><span>Customer *</span>
            <select required value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">Select customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
            </select>
          </label>
          <label><span>Amount *</span><input required type="number" min="0.01" step="0.01" placeholder="₹ 0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}/></label>
          <label className="full-field"><span>Notes</span><input placeholder="Optional notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}/></label>
          <div className="form-actions"><button type="submit" disabled={saving || loading}>{saving ? "Creating Sale..." : "Create Sale"}</button></div>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="panel">
        <div className="toolbar"><div><h2>Sales</h2><span className="record-count">{loading ? "Loading..." : `${sales.length} sale${sales.length === 1 ? "" : "s"}`}</span></div></div>
        <div className="table-wrap">
          <table><thead><tr><th>Customer</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="6" className="table-state">Loading sales...</td></tr> :
                sales.length ? sales.map(s => {
                  const c = customers.find(x => x.id === s.customer_id);
                  return <tr key={s.id}><td><strong>{c?.name || `Customer #${s.customer_id}`}</strong></td><td>₹{Number(s.amount).toFixed(2)}</td><td>₹{Number(s.paid_amount).toFixed(2)}</td><td>₹{Number(s.balance_amount).toFixed(2)}</td><td>{s.status}</td><td>{Number(s.balance_amount) > 0 && <button className="small" disabled={paymentId === s.id} onClick={() => addPayment(s)}>{paymentId === s.id ? "Saving..." : "Add Payment"}</button>}</td></tr>;
                }) : <tr><td colSpan="6" className="table-state">No sales found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
