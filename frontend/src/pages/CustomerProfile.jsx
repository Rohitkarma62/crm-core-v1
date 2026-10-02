import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";
import { captureInvoice, openWhatsApp } from "../utils/documents";

const money = (v) => "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (v) => v ? new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-";
const dateOnly = (v) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

export default function CustomerProfile({ customerId, onBack }) {
  const [data, setData] = useState(null);
  const [company, setCompany] = useState(null);
  const [assets, setAssets] = useState({});
  const [fabricationJobs, setFabricationJobs] = useState([]);
  const [document, setDocument] = useState(null);
  const [error, setError] = useState("");
  const [proofBusy, setProofBusy] = useState(null);
  const previewRef = useRef(null);

  async function load() {
    try {
      const [profile, companyRes, fabricationRes] = await Promise.all([
        api.get("/api/v1/customers/" + customerId + "/profile"),
        api.get("/api/v1/billing/company"),
        api.get("/api/v1/fabrication"),
      ]);
      setData(profile.data);
      setCompany(companyRes.data);
      setFabricationJobs((fabricationRes.data.items || []).filter(job => Number(job.customer_id) === Number(customerId)));
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

  async function fabricationInvoice(jobId) {
    const r = await api.get("/api/v1/billing/fabrication/" + jobId + "/invoice");
    setDocument({ type: "fabrication-invoice", id: jobId, invoice_number: r.data.invoice_number, data: r.data });
  }

  async function receipt(paymentId) {
    const r = await api.get("/api/v1/billing/payments/" + paymentId + "/receipt");
    setDocument({ type: "receipt", id: paymentId, receipt_number: r.data.receipt_number, data: r.data });
  }

  async function workshopReceipt(paymentId) {
    const r = await api.get("/api/v1/billing/workshop-payments/" + paymentId + "/receipt");
    setDocument({ type: "workshop-receipt", id: paymentId, receipt_number: r.data.receipt_number, data: r.data });
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
  const selectedJob = document?.type === "fabrication-invoice" ? (data.fabrication_jobs || []).find(j => j.id === document.id) : null;
  const selectedPayment = document?.type === "receipt" ? data.payments.find(p => p.id === document.id) : null;
  const selectedWorkshopPayment = document?.type === "workshop-receipt" ? data.workshop_payments.find(p => p.id === document.id) : null;
  const paymentHistory = [
    ...data.payments.map(p => ({ ...p, payment_source: "crm" })),
    ...data.workshop_payments.map(p => ({ ...p, payment_source: "workshop" })),
  ].sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
  const number = document?.invoice_number || document?.receipt_number || "";

  return <main className="page customer-profile-page">
    <div className="page-head">
      <button className="secondary" onClick={onBack}>← Customers</button>
      <div><h1>{c.name}</h1><p className="profile-subtitle">{c.phone}{c.email ? " • " + c.email : ""}</p></div>
    </div>
    {error && <div className="error">{error}</div>}

    <section className="profile-summary">
      <div><span>Job Value</span><strong>{money(data.summary.total_sales)}</strong></div>
      <div><span>Total Paid</span><strong>{money(data.summary.collected)}</strong></div>
      <div><span>Outstanding</span><strong>{money(data.summary.outstanding)}</strong></div>
      <div><span>Payments</span><strong>{data.summary.payment_count}</strong></div>
      <div><span>Bills</span><strong>{data.summary.invoice_count}</strong></div>
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
      <div className="toolbar"><div><h2>Jobs & Bills</h2><span className="record-count">{data.sales.length} bill record(s)</span></div></div>
      <div className="profile-list">
        {data.sales.length ? data.sales.map(s => <div className="profile-row" key={s.id}>
          <div><strong>{money(s.amount)}</strong><small>{date(s.sale_date)} • {s.status}</small><small>{s.notes || "Fabrication work"}</small></div>
          <div className="profile-row-actions"><button className="small" onClick={() => invoice(s.id)}>Bill</button></div>
        </div>) : <div className="empty-state">No bill records yet.</div>}
      </div>
    </section>

    <section className="panel">
      <div className="toolbar"><div><h2>🏭 Fabrication Jobs</h2><span className="record-count">{fabricationJobs.length} job(s)</span></div></div>
      <div className="profile-list">
        {fabricationJobs.length ? fabricationJobs.map(job => <div className="profile-row" key={job.id}>
          <div><strong>{job.work}</strong><small>Stage: {job.stage} • {job.measurement || "Measurement pending"}</small><small>{job.site || "Site not added"} • Delivery: {job.delivery ? dateOnly(job.delivery) : "-"}</small></div>
          <div className="profile-row-actions"><strong>{money(job.amount)}</strong><button className="small" onClick={() => fabricationInvoice(job.id)}>Bill</button></div>
        </div>) : <div className="empty-state">No linked fabrication jobs yet.</div>}
      </div>
    </section>

    <section className="panel">
      <div className="toolbar"><div><h2>Payment History & Proof</h2><span className="record-count">{paymentHistory.length} payment(s)</span></div></div>
      <div className="profile-list">
        {paymentHistory.length ? paymentHistory.map(p => {
          const proofs = p.payment_source === "crm" ? data.proofs.filter(x => x.payment_id === p.id) : [];
          return <div className="profile-row" key={p.payment_source + "-" + p.id}>
            <div>
              <strong>{money(p.amount)}</strong>
              <small>{date(p.payment_date)} • {p.payment_method || "Other"} • {p.reference || "No reference"}</small>
              <small>{p.payment_source === "workshop" ? "Workshop payment • " + (p.notes || "Work order advance/payment") : "Customer payment"}</small>
              {proofs.length ? <div className="proof-list">{proofs.map(pr => <button className="proof-link" key={pr.id} onClick={async () => { const r = await api.get("/api/v1/billing/payment-proofs/" + pr.id, { responseType: "blob" }); window.open(URL.createObjectURL(r.data), "_blank", "noopener,noreferrer"); }}>{pr.filename}</button>)}</div> : p.payment_source === "crm" ? <small>No payment proof uploaded</small> : null}
            </div>
            <div className="profile-row-actions">
              <button className="small" onClick={() => p.payment_source === "workshop" ? workshopReceipt(p.id) : receipt(p.id)}>Payment Receipt</button>
              {p.payment_source === "crm" && <label className="small upload-btn">{proofBusy === p.id ? "Uploading..." : "Upload Proof"}<input type="file" accept="image/*,.pdf" disabled={proofBusy === p.id} onChange={e => uploadProof(p.id, e.target.files?.[0])} /></label>}
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
      <div className="toolbar"><div><h2>{document.type === "receipt" ? "Payment Receipt Preview" : "Bill Preview"}</h2><span className="record-count">{number}</span></div>
        <div className="document-actions"><button onClick={() => captureInvoice(previewRef.current, number, "pdf")}>PDF</button><button onClick={() => captureInvoice(previewRef.current, number, "png")}>Image</button></div>
      </div>
      <div ref={previewRef} className="invoice-preview">
        <div className="invoice-top">
          <div className="invoice-brand">
            {assets.logo && <img className="invoice-logo" src={assets.logo} alt="Company logo" />}
            <div>
              <h2>{company?.name || "विश्वकर्मा फैब्रिकेशन वर्कशॉप"}</h2>
              <p><b>मालिक</b></p>
              <p>{company?.phone || "9977932342 / 7089117898 / 9131766526"}</p>
              <p>{company?.address || "ग्राम घोटिया, जिला खरगोन, मध्य प्रदेश"}</p>
              {company?.gstin && <p><b>GSTIN:</b> {company.gstin}</p>}
            </div>
          </div>
          <div className="invoice-meta">
            <h1>{document.type === "invoice" || document.type === "fabrication-invoice" ? "बिल / चालान" : "भुगतान रसीद"}</h1>
            <p><b>क्रमांक:</b> {number}</p>
            <p><b>दिनांक:</b> {dateOnly(selectedJob?.created_at || selectedSale?.sale_date || selectedPayment?.payment_date || selectedWorkshopPayment?.payment_date || new Date())}</p>
          </div>
        </div>
        <hr />
        <div className="invoice-customer">
          <div><span>ग्राहक</span><strong>{c.name}</strong></div>
          <div><span>मोबाइल</span><strong>{c.phone || "-"}</strong></div>
          <div><span>पता</span><strong>{c.address || "-"}</strong></div>
        </div>
        {document.type === "fabrication-invoice" ? <>
          <table className="invoice-table"><thead><tr><th>क्र.</th><th>कार्य / विवरण</th><th>माप</th><th>राशि</th></tr></thead><tbody>
            <tr><td>1</td><td>{selectedJob?.work || "फैब्रिकेशन कार्य"}</td><td>{selectedJob?.measurement || "-"}</td><td>{money(selectedJob?.amount)}</td></tr>
            <tr className="invoice-total"><td colSpan="3">कुल बिल</td><td>{money(selectedJob?.amount)}</td></tr>
            <tr><td colSpan="3">कुल भुगतान</td><td>{money(docData.paid_amount)}</td></tr>
            <tr className="invoice-balance"><td colSpan="3">बाकी राशि</td><td>{money(docData.balance_amount)}</td></tr>
          </tbody></table>
          <div className="invoice-payment-box"><h3>भुगतान विवरण</h3>
            {docData.payments.length ? docData.payments.map(p => <div className="invoice-payment-row" key={p.id}><span>{dateOnly(p.payment_date)}</span><span>{p.payment_method || "Other"}</span><span>{money(p.amount)}</span><span>{p.reference || "-"}</span></div>) : <p>कोई भुगतान दर्ज नहीं है।</p>}
          </div>
          <div className="invoice-status">{Number(docData.balance_amount || 0) <= 0 ? "PAID / भुगतान पूर्ण" : "PAYMENT DUE / भुगतान बाकी"}</div>
          {company?.warranty_text && <p className="invoice-warranty"><b>वारंटी:</b> {company.warranty_text}</p>}
        </> : document.type === "invoice" ? <>
          <table className="invoice-table"><thead><tr><th>क्र.</th><th>कार्य / विवरण</th><th>राशि</th></tr></thead><tbody>
            <tr><td>1</td><td>{selectedSale?.notes || "फैब्रिकेशन कार्य"}</td><td>{money(selectedSale?.amount)}</td></tr>
            <tr className="invoice-total"><td colSpan="2">कुल बिल</td><td>{money(selectedSale?.amount)}</td></tr>
            <tr><td colSpan="2">कुल भुगतान</td><td>{money(docData.paid_amount)}</td></tr>
            <tr className="invoice-balance"><td colSpan="2">बाकी राशि</td><td>{money(docData.balance_amount)}</td></tr>
          </tbody></table>
          <div className="invoice-payment-box">
            <h3>भुगतान विवरण</h3>
            {docData.payments.length ? docData.payments.map(p => <div className="invoice-payment-row" key={p.id}><span>{dateOnly(p.payment_date)}</span><span>{p.payment_method || "Other"}</span><span>{money(p.amount)}</span><span>{p.reference || "-"}</span></div>) : <p>कोई भुगतान दर्ज नहीं है।</p>}
          </div>
          <div className="invoice-status">{Number(docData.balance_amount || 0) <= 0 ? "PAID / भुगतान पूर्ण" : "PAYMENT DUE / भुगतान बाकी"}</div>
          {company?.warranty_text && <p className="invoice-warranty"><b>वारंटी:</b> {company.warranty_text}</p>}
        </> : document.type === "workshop-receipt" ? <>
          <table className="invoice-table"><tbody>
            <tr><th>वर्क ऑर्डर</th><td>{docData.fabrication?.work || "फैब्रिकेशन कार्य"}</td></tr>
            <tr><th>कुल जॉब राशि</th><td>{money(docData.fabrication?.amount)}</td></tr>
            <tr><th>इस भुगतान की राशि</th><td>{money(selectedWorkshopPayment?.amount)}</td></tr>
            <tr><th>भुगतान दिनांक</th><td>{dateOnly(selectedWorkshopPayment?.payment_date)}</td></tr>
            <tr><th>भुगतान माध्यम</th><td>{selectedWorkshopPayment?.payment_method || "-"}</td></tr>
            <tr><th>संदर्भ</th><td>{selectedWorkshopPayment?.reference || "-"}</td></tr>
            <tr><th>अब तक कुल भुगतान</th><td>{money(docData.paid_amount)}</td></tr>
            <tr className="invoice-balance"><th>बाकी राशि</th><td>{money(docData.balance_amount)}</td></tr>
          </tbody></table>
          <div className="invoice-status">ADVANCE / PAYMENT RECEIVED</div>
          {company?.warranty_text && <p className="invoice-warranty"><b>वारंटी:</b> {company.warranty_text}</p>}
        </> : <table className="invoice-table"><tbody><tr><th>भुगतान राशि</th><td>{money(selectedPayment?.amount)}</td></tr><tr><th>दिनांक</th><td>{dateOnly(selectedPayment?.payment_date)}</td></tr><tr><th>माध्यम</th><td>{selectedPayment?.payment_method || "-"}</td></tr><tr><th>संदर्भ</th><td>{selectedPayment?.reference || "-"}</td></tr></tbody></table>}
        <div className="invoice-footer">
          <div><p>धन्यवाद!</p><p>कृपया भुगतान रसीद/बिल सुरक्षित रखें।</p></div>
          <div className="invoice-signatures">
            {assets.stamp && <div className="invoice-signature-item"><img className="invoice-stamp" src={assets.stamp} alt="Company stamp" /></div>}
            {assets.signature && <div className="invoice-signature-item"><img className="invoice-signature" src={assets.signature} alt="Owner signature" /></div>}
          </div>
        </div>
      </div>
    </section>}
  </main>;
}
