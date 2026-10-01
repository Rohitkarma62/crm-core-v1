import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function Sales({ onBack }) {
  const needsReference = method => String(method || "").toLowerCase() !== "cash";
  const referencePlaceholder = method => String(method || "").toLowerCase() === "upi" ? "UTR / UPI Reference" : String(method || "").toLowerCase() === "cheque" ? "Cheque No." : String(method || "").toLowerCase() === "bank_transfer" ? "Transaction Reference" : String(method || "").toLowerCase() === "card" ? "Card Reference (optional)" : "Reference (optional)";
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ customer_id: "", amount: "", notes: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentId, setPaymentId] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentForm, setPaymentForm] = useState({ amount: "", payment_method: "upi", reference: "" });
  const [salePaymentEnabled, setSalePaymentEnabled] = useState(false);
  const [salePaymentsForm, setSalePaymentsForm] = useState([{ amount: "", payment_method: "upi", reference: "" }]);

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
      const initialPayments = salePaymentEnabled
        ? salePaymentsForm.filter(p => Number(p.amount) > 0).map(p => ({ ...p, amount: Number(p.amount), reference: p.reference || null }))
        : [];
      const initialTotal = initialPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      if (initialTotal > Number(form.amount)) {
        setError("Initial payment total sale amount se zyada nahi ho sakta.");
        return;
      }
      if (salePaymentEnabled && initialPayments.length === 0) {
        setError("Payment received select kiya hai, payment amount enter karo.");
        return;
      }
      await api.post("/api/v1/sales", {
        ...form,
        customer_id: Number(form.customer_id),
        amount: Number(form.amount),
        payments: initialPayments,
      });
      setForm({ customer_id: "", amount: "", notes: "" });
      setSalePaymentEnabled(false);
      setSalePaymentsForm([{ amount: "", payment_method: "upi", reference: "" }]);
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
          <div className="full-field sale-payment-capture">
            <div className="sale-payment-toggle">
              <label><input type="checkbox" checked={salePaymentEnabled} onChange={e => setSalePaymentEnabled(e.target.checked)} /> Payment received at sale time</label>
              <span>Sale create karte waqt payment ka record yahin add karein.</span>
            </div>
            {salePaymentEnabled && <div className="initial-payments">
              {salePaymentsForm.map((p, index) => <div className="initial-payment-row" key={index}>
                <input type="number" min="0.01" step="0.01" placeholder="Amount" value={p.amount} onChange={e => setSalePaymentsForm(rows => rows.map((r,i) => i === index ? {...r, amount:e.target.value} : r))} />
                <select value={p.payment_method} onChange={e => setSalePaymentsForm(rows => rows.map((r,i) => i === index ? {...r, payment_method:e.target.value, reference: e.target.value === "cash" ? "" : r.reference} : r))}>
                  <option value="upi">UPI</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option><option value="other">Other</option>
                </select>
                {needsReference(p.payment_method) && <input placeholder={referencePlaceholder(p.payment_method)} value={p.reference} onChange={e => setSalePaymentsForm(rows => rows.map((r,i) => i === index ? {...r, reference:e.target.value} : r))} />}
                {salePaymentsForm.length > 1 && <button type="button" className="small danger" onClick={() => setSalePaymentsForm(rows => rows.filter((_,i) => i !== index))}>Remove</button>}
              </div>)}
              <button type="button" className="small" onClick={() => setSalePaymentsForm(rows => [...rows, {amount:"", payment_method:"upi", reference:""}])}>+ Add Payment Method</button>
              <div className="initial-payment-total">Initial payment: ₹{salePaymentsForm.reduce((sum,p) => sum + Number(p.amount || 0), 0).toLocaleString("en-IN", {minimumFractionDigits:2})} / Sale: ₹{Number(form.amount || 0).toLocaleString("en-IN", {minimumFractionDigits:2})}</div>
            </div>}
          </div>
          <div className="form-actions"><button type="submit" disabled={saving || loading}>{saving ? "Creating Sale..." : "Create Sale"}</button></div>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="panel">
        <div className="toolbar"><div><h2>Sales</h2><span className="record-count">{loading ? "Loading..." : `${sales.length} sale${sales.length === 1 ? "" : "s"}`}</span></div></div>
        <div className="sales-desktop-table table-wrap">
          <table><thead><tr><th>Customer</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Payment</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="6" className="table-state">Loading sales...</td></tr> :
                sales.length ? sales.map(s => {
                  const customer = customers.find(x => x.id === s.customer_id);
                  const history = salePayments(s.id);
                  const byMethod = history.reduce((acc, p) => { const key = p.payment_method || "other"; acc[key] = (acc[key] || 0) + Number(p.amount); return acc; }, {});
                  return <React.Fragment key={s.id}>
                    <tr><td><strong>{customer?.name || `Customer #${s.customer_id}`}</strong></td><td>₹{Number(s.amount).toFixed(2)}</td><td>₹{Number(s.paid_amount).toFixed(2)}</td><td>₹{Number(s.balance_amount).toFixed(2)}</td><td><span className={`sale-status ${s.status}`}>{s.status}</span></td><td>{Number(s.balance_amount) > 0 ? "Pending" : "Paid"}</td></tr>
                    <tr><td colSpan="6"><div className="sale-payment-details">
                      <div className="payment-breakup"><strong>Payment Break-up</strong>{Object.keys(byMethod).length ? Object.entries(byMethod).map(([method, amount]) => <span key={method}>{method.replace("_"," ").toUpperCase()}: ₹{amount.toFixed(2)}</span>) : <span>No payments yet</span>}</div>
                      {history.length > 0 && <div className="payment-history"><small>Payment History</small>{history.map(p => <div className="payment-history-row" key={p.id}><div><strong>{p.payment_method ? p.payment_method.replace("_"," ").toUpperCase() : "OTHER"}</strong><span>{new Date(p.payment_date).toLocaleDateString("en-IN")}{p.reference ? " · " + p.reference : ""}</span></div><strong>₹{Number(p.amount).toFixed(2)}</strong></div>)}</div>}
                      {Number(s.balance_amount) > 0 && <div className="payment-entry"><input type="number" min="0.01" max={Number(s.balance_amount)} step="0.01" placeholder="Payment Amount" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}/><select value={paymentForm.payment_method} onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value, reference: e.target.value === "cash" ? "" : paymentForm.reference })}><option value="upi">UPI</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option><option value="other">Other</option></select>{needsReference(paymentForm.payment_method) && <input placeholder={referencePlaceholder(paymentForm.payment_method)} value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}/>}<button type="button" className="small" disabled={paymentId === s.id} onClick={() => addPayment(s)}>{paymentId === s.id ? "Saving..." : "Save Payment"}</button></div>}
                    </div></td></tr>
                  </React.Fragment>;
                }) : <tr><td colSpan="6" className="table-state">No sales found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="sales-mobile-list">
          {loading ? <div className="table-state">Loading sales...</div> : sales.length ? sales.map(s => {
            const customer = customers.find(x => x.id === s.customer_id);
            const history = salePayments(s.id);
            const byMethod = history.reduce((acc, p) => { const key = p.payment_method || "other"; acc[key] = (acc[key] || 0) + Number(p.amount); return acc; }, {});
            return <article className="sale-mobile-card" key={s.id}>
              <div className="sale-mobile-head"><div><strong>{customer?.name || `Customer #${s.customer_id}`}</strong><small>{new Date(s.sale_date).toLocaleDateString("en-IN")}</small></div><span className={`sale-status ${s.status}`}>{s.status}</span></div>
              <div className="sale-mobile-stats"><div><small>Sale</small><strong>₹{Number(s.amount).toFixed(2)}</strong></div><div><small>Paid</small><strong>₹{Number(s.paid_amount).toFixed(2)}</strong></div><div><small>Balance</small><strong>₹{Number(s.balance_amount).toFixed(2)}</strong></div></div>
              <div className="payment-breakup"><strong>Payment Break-up</strong>{Object.keys(byMethod).length ? Object.entries(byMethod).map(([method, amount]) => <span key={method}>{method.replace("_"," ").toUpperCase()}: ₹{amount.toFixed(2)}</span>) : <span>No payments yet</span>}</div>
              {history.length > 0 && <div className="payment-history"><small>Payment History</small>{history.map(p => <div className="payment-history-row" key={p.id}><div><strong>{p.payment_method ? p.payment_method.replace("_"," ").toUpperCase() : "OTHER"}</strong><span>{new Date(p.payment_date).toLocaleDateString("en-IN")}{p.reference ? " · " + p.reference : ""}</span></div><strong>₹{Number(p.amount).toFixed(2)}</strong></div>)}</div>}
              {Number(s.balance_amount) > 0 && <div className="payment-entry"><input type="number" min="0.01" max={Number(s.balance_amount)} step="0.01" placeholder="Payment Amount" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}/><select value={paymentForm.payment_method} onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value, reference: e.target.value === "cash" ? "" : paymentForm.reference })}><option value="upi">UPI</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option><option value="other">Other</option></select>{needsReference(paymentForm.payment_method) && <input placeholder={referencePlaceholder(paymentForm.payment_method)} value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}/>}<button type="button" className="small" disabled={paymentId === s.id} onClick={() => addPayment(s)}>{paymentId === s.id ? "Saving..." : "Save Payment"}</button></div>}
            </article>;
          }) : <div className="table-state">No sales found.</div>}
        </div>
      </section>
    </main>
  );
}
