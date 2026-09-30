import React, { useEffect, useState } from "react";
import { api } from "../services/api";

function downloadBlob(response, fallbackName) {
  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const name = match?.[1] || fallbackName;
  const url = URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

export default function ImportExport({ onBack }) {
  const [file,setFile]=useState(null), [preview,setPreview]=useState(null), [mapping,setMapping]=useState({}), [action,setAction]=useState("skip");
  const [result,setResult]=useState(null), [history,setHistory]=useState([]), [error,setError]=useState(""), [busy,setBusy]=useState(false);
  async function loadHistory(){ try { const r=await api.get("/api/v1/imports/history"); setHistory(r.data); } catch(e){} }
  useEffect(()=>{loadHistory()},[]);
  async function previewFile(){
    if(!file)return; setBusy(true);setError("");setResult(null);
    try { const fd=new FormData();fd.append("file",file);const r=await api.post("/api/v1/imports/leads/preview",fd,{headers:{"Content-Type":"multipart/form-data"}});setPreview(r.data);setMapping(r.data.suggested_mapping||{}); }
    catch(e){setError(e.response?.data?.detail||"Preview failed")} finally{setBusy(false)}
  }
  async function importRows(){
    if(!preview?.job_id){ setError("Upload and preview the file first."); return; }
    setBusy(true);setError("");
    try { const r=await api.post("/api/v1/imports/leads/import",{job_id:preview.job_id,mapping,duplicate_action:action});setResult(r.data);await loadHistory(); }
    catch(e){setError(e.response?.data?.detail||"Import failed")} finally{setBusy(false)}
  }
  async function exportData(type,fmt="xlsx"){
    try { const r=await api.get(`/api/v1/imports/${type}/export`,{params:{fmt},responseType:"blob"}); downloadBlob(r,`crm-${type}.${fmt}`); }
    catch(e){setError("Export failed")}
  }
  return <div className="page">
    <div className="page-head"><div><button onClick={onBack}>← Dashboard</button><h1>Import / Export</h1><p>Bulk CRM data movement with validation, exports and import history.</p></div></div>
    {error&&<p className="error">{error}</p>}
    <section className="card"><h2>Lead Import</h2><input type="file" accept=".csv,.xlsx" onChange={e=>{setFile(e.target.files?.[0]);setPreview(null)}}/><button disabled={!file||busy} onClick={previewFile}>{busy?"Processing…":"Preview File"}</button>
      {preview&&<><p>{preview.total_rows} rows detected.</p><h3>Column Mapping</h3><div className="mapping-grid">{preview.headers.map(h=><label key={h}>{h}<select value={mapping[h]||""} onChange={e=>setMapping({...mapping,[h]:e.target.value})}><option value="">Ignore</option>{["name","phone","email","company","source","status","priority","interested_service","estimated_value","notes","assigned_to"].map(f=><option key={f} value={f}>{f}</option>)}</select></label>)}</div><label>Duplicate handling <select value={action} onChange={e=>setAction(e.target.value)}><option value="skip">Skip duplicates</option><option value="update">Update existing</option><option value="create">Create anyway</option></select></label><button onClick={importRows} disabled={busy||preview.required_missing?.length>0}>Import {preview.total_rows} Rows</button></>}
      {result&&<div className="card"><h3>Import Result</h3><p>Total: {result.total_rows} · Imported: {result.imported} · Skipped: {result.skipped} · Errors: {result.errors}</p></div>}
    </section>
    <section className="card"><h2>Export</h2><p>Download tenant-isolated CRM data as Excel or CSV.</p><div className="button-row">{["leads","customers","sales","payments"].map(type=><div key={type}><strong>{type}</strong><button onClick={()=>exportData(type,"xlsx")}>Excel</button><button onClick={()=>exportData(type,"csv")}>CSV</button></div>)}</div></section>
    <section className="card"><h2>Import History</h2>{history.length===0?<p>No imports recorded yet.</p>:<table><thead><tr><th>Date</th><th>File</th><th>Rows</th><th>Imported</th><th>Skipped</th><th>Errors</th><th>Status</th><th>Error CSV</th></tr></thead><tbody>{history.map(j=><tr key={j.id}><td>{new Date(j.created_at).toLocaleString()}</td><td>{j.filename}</td><td>{j.total_rows}</td><td>{j.imported}</td><td>{j.skipped}</td><td>{j.errors}</td><td>{j.status}</td><td><button onClick={async()=>{const r=await api.get(`/api/v1/imports/history/${j.id}/errors`,{responseType:"blob"});downloadBlob(r,`import-${j.id}-errors.csv`)}}>Download</button></td></tr>)}</tbody></table>}</section>
  </div>
}
