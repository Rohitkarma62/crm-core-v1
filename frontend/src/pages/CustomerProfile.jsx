import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";
import { captureInvoice, openWhatsApp } from "../utils/documents";

const money = (v) => "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (v) => v ? new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-";

export default function CustomerProfile({ customerId, onBack }) {
  const [data, setData] = useState(null);
  const [company, setCompany] = useState(null);
  const [assets, setAssets] = useState({});
  const [document, setDocument] = useState(null);
  const [error, setError] = useState("");
  const [proofBusy, setProofBusy] = useState(null);
  const previewRef = useRef(null);

  async function load() {
    try {
      const [profile, companyRes] = await Promise.all([
        api.get("/api/v1/customers/" + customerId + "/profile"),
        api.get("/api/v1/billing/company"),
      ]);
      setData(profile.data);
      setCompany(companyRes.data);
      const next = {};
      for (const kind of ["logo", "signature", "stamp"]) {
        if (companyRes.data.assets?.[kind]) {
          const r = await api.get("/api/v1/billing/assets/" + kind, { responseType: "blob" });
          next[kind] = URL.createObjectURL(r.data);
        }
      }
      setAssets(next);
      setError("");
    } catch (e) {
      setError(e.response?.data?.detail || "Customer profile load nahi ho saka.");
    }
  }

  useEffect(() => { load(); }, [customerId]);

  async function invoice(saleId) {
    const r = await api.get("/api/v1/billing/sales/" + saleId + "/invoice");
    setDocument({ type: "invoice", id: saleId, invoice_number: r.data.invoice_number, data: r.data });
  }

  async function receipt(paymentId) {
    const r = await api.get("/api/v1/billing/payments/" + paymentId + "/receipt");
    setDocument({ type: "receipt", id: paymentId, receipt_number: r.data.receipt_number, data: r.data });
  }

  async function uploadProof(paymentId, file) {
    if (!file) return;
    setProofBusy(paymentId);
    try {
      const body = new FormData();
      body.append("file", file);
      await api.post("/api/v1/billing/payments/" + paymentId + "/proof", body, { headers: { "Content-Type": "multipart/form-data" } });
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || "Payment proof upload nahi hua.");
    } finally { setProofBusy(null); }
  }

  const timeline = useMemo(() => {
    if (!data) return [];
    return [
      { at: data.customer.created_at, text: "Customer profile बनाया गया" },
      ...data.sales.map(s => ({ at: s.sale_date, text: "Sale बनाया गया • " + money(s.amount) })),
      ...data.payments.map(p => ({ at: p.payment_date, text: "Payment received • " + money(p.amount) + " • " + (p.payment_method || "Other") })),
    ].sort((a,b) => new Date(b.at) - new Date(a.at));
  }, [data]);

  if (!data) return <main className="page"><button className="secondary" onClick={onBack}>← Customers</button><div className="panel">{error || "Loading customer profile..."}</div></main>;

  const c = data.customer;
  const docData = document?.data;
  const selectedSale = document?.type === "invoice" ? data.sales.find(s => s.id === document.id) : null;
  const selectedPayment = document?.type === "receipt" ? data.payments.find(p => p.id === document.id) : null;
  const number = document?.invoice_number || document?.receipt_number || "";

  return <main className="page customer-profile-page">
    <div className="page-head">
      <button className="secondary" onClick={onBack}>← Customers</button>
      <div><h1>{c.name}</h1><p className="profile-subtitle">{c.phone}{c.email ? " • " + c.email : ""}</p></div>
    </div>
    {error && <div className="error">{error}</div>}

    <section className="profile-summary">
      <div><span>Total Sales</span><strong>{money(data.summary.total_sales)}</strong></div>
      <div><span>Total Paid</span><strong>{money(data.summary.collected)}</strong></div>
      <div><span>Outstanding</span><strong>{money(data.summary.outstanding)}</strong></div>
      <div><span>Payments</span><strong>{data.summary.payment_count}</strong></div>
      <div><span>Invoices</span><strong>{data.summary.invoice_count}</strong></div>
    </section>

    <section className="panel">
      <div className="panel-heading"><h2>Customer Details</h2><p>Customer since {date(c.created_at)}</p></div>
      <div className="profile-details">
        <div><b>मोबाइल</b><span>{c.phone}</span></div>
        <div><b>ईमेल</b><span>{c.email || "-"}</span></div>
        <div><b>कंपनी</b><span>{c.company || "-"}</span></div>
        <div><b>पता</b><span>{c.address || "-"}</span></div>
      </div>
      <div className="profile-actions"><button onClick={() => openWhatsApp(c.phone, "नमस्ते " + c.name + " जी, आपका बिल/भुगतान विवरण तैयार है। धन्यवाद।")}>WhatsApp</button></div>
    </section>

    <section className="panel">
      <div className="toolbar"><div><h2>Sales & Invoices</h2><span className="record-count">{data.sales.length} sale(s)</span></div></div>
      <div className="profile-list">
        {data.sales.length ? data.sales.map(s => <div className="profile-row" key={s.id}>
          <div><strong>{money(s.amount)}</strong><small>{date(s.sale_date)} • {s.status}</small><small>{s.notes || "Fabrication work"}</small></div>
          <div className="profile-row-actions"><button className="small" onClick={() => invoice(s.id)}>Bill</button></div>
        </div>) : <div className="empty-state">No sales yet.</div>}
      </div>
    </section>

    <section className="panel">
      <div className="toolbar"><div><h2>Payment History & Proof</h2><span className="record-count">{data.payments.length} payment(s)</span></div></div>
      <div className="profile-list">
        {data.payments.length ? data.payments.map(p => {
          const proofs = data.proofs.filter(x => x.payment_id === p.id);
          return <div className="profile-row" key={p.id}>
            <div>
              <strong>{money(p.amount)}</strong>
              <small>{date(p.payment_date)} • {p.payment_method || "Other"} • {p.reference || "No reference"}</small>
              {proofs.length ? <div className="proof-list">{proofs.map(pr => <button className="proof-link" key={pr.id} onClick={async () => { const r = await api.get("/api/v1/billing/payment-proofs/" + pr.id, { responseType: "blob" }); window.open(URL.createObjectURL(r.data), "_blank", "noopener,noreferrer"); }}>{pr.filename}</button>)}</div> : <small>No payment proof uploaded</small>}
            </div>
            <div className="profile-row-actions">
              <button className="small" onClick={() => receipt(p.id)}>Receipt</button>
              <label className="small upload-btn">{proofBusy === p.id ? "Uploading..." : "Upload Proof"}<input type="file" accept="image/*,.pdf" disabled={proofBusy === p.id} onChange={e => uploadProof(p.id, e.target.files?.[0])} /></label>
            </div>
          </div>;
        }) : <div className="empty-state">No payments yet.</div>}
      </div>
    </section>

    <section className="panel">
      <div className="panel-heading"><h2>Customer Timeline</h2><p>Customer ke saath complete activity history.</p></div>
      <div className="timeline">{timeline.map((e,i) => <div className="timeline-item" key={i}><span></span><div><strong>{e.text}</strong><small>{date(e.at)}</small></div></div>)}</div>
    </section>

    {docData && <section className="panel">
      <div className="toolbar"><div><h2>{document.type === "invoice" ? "Bill Preview" : "Payment Receipt Preview"}</h2><span className="record-count">{number}</span></div>
        <div className="document-actions"><button onClick={() => captureInvoice(previewRef.current, number, "pdf")}>PDF</button><button onClick={() => captureInvoice(previewRef.current, number, "png")}>Image</button></div>
      </div>
      <div ref={previewRef} className="invoice-preview">
        {assets.logo && <img className="invoice-logo" src={assets.logo} alt="Company logo" />}
        <h2>विश्वकर्मा फैब्रिकेशन वर्कशॉप</h2>
        <p>मालिक: {company?.owner_name || "युवराज कर्मा"}</p>
        <p>{company?.phone || "9977932342 / 7089117898 / 9131766526"}</p>
        <p>{company?.address || "ग्राम घोटिया, जिला खरगोन, मध्य प्रदेश"}</p>
        <hr />
        <h1>{document.type === "invoice" ? "बिल / चालान" : "भुगतान रसीद"}</h1>
        <p><b>क्रमांक:</b> {number}</p>
        <p><b>ग्राहक:</b> {c.name} • {c.phone}</p>
        {document.type === "invoice" ? <>
          <table><tbody><tr><th>कार्य / विवरण</th><th>राशि</th></tr><tr><td>{selectedSale?.notes || "फैब्रिकेशन कार्य"}</td><td>{money(selectedSale?.amount)}</td></tr><tr><th>कुल भुगतान</th><th>{money(docData.paid_amount)}</th></tr><tr><th>बाकी राशि</th><th>{money(docData.balance_amount)}</th></tr></tbody></table>
          <h3>भुगतान विवरण</h3>{docData.payments.map(p => <p key={p.id}>{date(p.payment_date)} • {p.payment_method || "Other"} • {money(p.amount)} • {p.reference || "-"}</p>)}
          <p className="invoice-warranty"><b>वारंटी:</b> {company?.warranty_text}</p>
        </> : <table><tbody><tr><th>भुगतान राशि</th><td>{money(selectedPayment?.amount)}</td></tr><tr><th>माध्यम</th><td>{selectedPayment?.payment_method || "-"}</td></tr><tr><th>संदर्भ</th><td>{selectedPayment?.reference || "-"}</td></tr></tbody></table>}
        <div className="invoice-signatures">{assets.signature && <img src={assets.signature} alt="Owner signature" />}{assets.stamp && <img src={assets.stamp} alt="Company stamp" />}</div>
        <p><b>युवराज कर्मा, मालिक</b></p>
      </div>
    </section>}
  </main>;
}
