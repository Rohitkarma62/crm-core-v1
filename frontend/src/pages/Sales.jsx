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
  const [payments, setPayments] = useState([]);
  const [paymentForm, setPaymentForm] = useState({ amount: "", payment_method: "upi", reference: "" });

  async function load() {
    setLoading(true);
    try {
      const [s, c, p] = await Promise.all([api.get("/api/v1/sales"), api.get("/api/v1/customers"), api.get("/api/v1/payments")]);
      setSales(s.data.items || []);
      setCustomers(c.data.items || []);
      setPayments(p.data || []);
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
    const amount = Number(paymentForm.amount);
    const remaining = Number(sale.balance_amount);
    if (!amount || amount <= 0) { setError("Payment amount enter karo."); return; }
    if (amount > remaining) { setError("Payment ₹" + amount.toFixed(2) + " outstanding ₹" + remaining.toFixed(2) + " se zyada hai."); return; }
    setPaymentId(sale.id);
    setError("");
    try {
      await api.post("/api/v1/payments", { sale_id: sale.id, amount, payment_method: paymentForm.payment_method, reference: paymentForm.reference || null });
      setPaymentForm({ amount: "", payment_method: "upi", reference: "" });
      await load();
    } catch (e) { setError(e.response?.data?.detail || "Unable to add payment"); }
    finally { setPaymentId(null); }
  }

  function salePayments(saleId) { return payments.filter(p => p.sale_id === saleId && p.status === "completed"); }

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
                  const history = salePayments(s.id);
                  const byMethod = history.reduce((acc, p) => { const key = p.payment_method || "other"; acc[key] = (acc[key] || 0) + Number(p.amount); return acc; }, {});
                  return <React.Fragment key={s.id}>
                    <tr><td><strong>{c?.name || `Customer #${s.customer_id}`}</strong></td><td>₹{Number(s.amount).toFixed(2)}</td><td>₹{Number(s.paid_amount).toFixed(2)}</td><td>₹{Number(s.balance_amount).toFixed(2)}</td><td>{s.status}</td><td></td></tr>
                    <tr><td colSpan="6">
                      <div className="payment-breakup"><strong>Payment Break-up</strong> {Object.keys(byMethod).length ? Object.entries(byMethod).map(([method, amount]) => <span key={method}>{method.toUpperCase()}: ₹{amount.toFixed(2)}</span>) : <span>No payments yet</span>}</div>
                      {Number(s.balance_amount) > 0 && <div className="payment-entry">
                        <input type="number" min="0.01" max={Number(s.balance_amount)} step="0.01" placeholder="Amount" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                        <select value={paymentForm.payment_method} onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}><option value="upi">UPI</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option><option value="other">Other</option></select>
                        <input placeholder="Reference / UTR / Cheque No. (optional)" value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} />
                        <button className="small" disabled={paymentId === s.id} onClick={() => addPayment(s)}>{paymentId === s.id ? "Saving..." : "Save Payment"}</button>
                      </div>}
                    </td></tr>
                  </React.Fragment>;
                }) : <tr><td colSpan="6" className="table-state">No sales found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
