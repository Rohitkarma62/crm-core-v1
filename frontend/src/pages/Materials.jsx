import React,{useEffect,useState} from "react";
import {api} from "../services/api";
const money=v=>`₹${Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:0})}`;
const FABRICATION_MATERIALS=[
 // Structural pipes
 ["MS Square Pipe 20x20 (3/4x3/4)","ft"],["MS Square Pipe 25x25 (1x1)","ft"],["MS Square Pipe 32x32 (1.25x1.25)","ft"],["MS Square Pipe 40x40 (1.5x1.5)","ft"],["MS Square Pipe 50x50 (2x2)","ft"],["MS Square Pipe 75x75 (3x3)","ft"],["MS Square Pipe 100x100 (4x4)","ft"],
 ["MS Rectangular Pipe 40x20","ft"],["MS Rectangular Pipe 50x25","ft"],["MS Rectangular Pipe 60x40","ft"],["MS Rectangular Pipe 80x40","ft"],["MS Rectangular Pipe 100x50","ft"],
 ["MS Round Pipe 3/4 inch","ft"],["MS Round Pipe 1 inch","ft"],["MS Round Pipe 1.25 inch","ft"],["MS Round Pipe 1.5 inch","ft"],["MS Round Pipe 2 inch","ft"],["MS Round Pipe 2.5 inch","ft"],["MS Round Pipe 3 inch","ft"],
 // Angles, channels and purlins
 ["MS Angle 1x1","ft"],["MS Angle 1.5x1.5","ft"],["MS Angle 2x2","ft"],["MS Angle 2.5x2.5","ft"],["MS Angle 3x3","ft"],
 ["MS Flat Patti 1 inch","ft"],["MS Flat Patti 1.5 inch","ft"],["MS Flat Patti 2 inch","ft"],["MS Flat Patti 3 inch","ft"],
 ["MS Channel 2 inch","ft"],["MS Channel 3 inch","ft"],["MS Channel 4 inch","ft"],["MS Channel 5 inch","ft"],["MS Channel 6 inch","ft"],
 ["C Purlin 80mm","ft"],["C Purlin 100mm","ft"],["C Purlin 120mm","ft"],["C Purlin 150mm","ft"],["C Purlin 200mm","ft"],
 ["Z Purlin 100mm","ft"],["Z Purlin 120mm","ft"],["Z Purlin 150mm","ft"],["Z Purlin 200mm","ft"],
 // Roofing sheets and accessories
 ["GI Roofing Sheet 0.35mm","sqft"],["GI Roofing Sheet 0.40mm","sqft"],["GI Roofing Sheet 0.45mm","sqft"],["GI Roofing Sheet 0.50mm","sqft"],
 ["Color Coated Roofing Sheet 0.35mm","sqft"],["Color Coated Roofing Sheet 0.40mm","sqft"],["Color Coated Roofing Sheet 0.45mm","sqft"],
 ["PPGI Roofing Sheet","sqft"],["Polycarbonate Roofing Sheet","sqft"],["Roofing Ridge Cap","ft"],["Roofing Flashing","ft"],["Roof Gutter","ft"],["Down Pipe","ft"],
 ["Roofing J Bolt","pcs"],["Self Drilling Roofing Screw","pcs"],["Roofing Washer","pcs"],["Rubber Washer","pcs"],
 // Plates and fabrication hardware
 ["MS Sheet 18 Gauge","sqft"],["MS Sheet 20 Gauge","sqft"],["MS Sheet 22 Gauge","sqft"],["MS Sheet 24 Gauge","sqft"],["MS Sheet 26 Gauge","sqft"],
 ["MS Plate 3mm","sqft"],["MS Plate 5mm","sqft"],["MS Plate 6mm","sqft"],["MS Plate 8mm","sqft"],["MS Plate 10mm","sqft"],
 ["Base Plate","pcs"],["Gusset Plate","pcs"],["Cleat Angle","pcs"],["MS Bracket","pcs"],["MS Clamp","pcs"],
 ["GI Pipe 1 inch","ft"],["GI Pipe 1.5 inch","ft"],["GI Pipe 2 inch","ft"],["GI Pipe 2.5 inch","ft"],["GI Pipe 3 inch","ft"],
 ["SS Pipe 1 inch","ft"],["SS Pipe 1.5 inch","ft"],["SS Pipe 2 inch","ft"],["SS Sheet 18 Gauge","sqft"],["SS Sheet 20 Gauge","sqft"],
 ["Nut Bolt Set","set"],["Anchor Fastener","pcs"],["Rawl Anchor","pcs"],["Hinges","pcs"],["Door Lock","pcs"],["Tower Bolt","pcs"],
 // Welding, cutting and consumables
 ["Welding Rod 2.5mm","kg"],["Welding Rod 3.15mm","kg"],["Welding Rod 4mm","kg"],["MIG Wire","kg"],["Welding Gas","kg"],
 ["Cutting Disc 4 inch","pcs"],["Cutting Disc 7 inch","pcs"],["Cutting Disc 14 inch","pcs"],["Grinding Disc 4 inch","pcs"],["Grinding Disc 7 inch","pcs"],["Flap Disc","pcs"],["Drill Bit Set","set"],
 // Paint and finishing
 ["Red Oxide Primer","ltr"],["Zinc Primer","ltr"],["Metal Primer","ltr"],["Paint","ltr"],["Enamel Paint","ltr"],["Thinner","ltr"],["Putty","kg"],["Sand Paper","pcs"],["Wire Brush","pcs"],
 // Shed insulation and rain protection
 ["Roof Insulation Sheet","sqft"],["Bubble Insulation","sqft"],["Thermal Insulation","sqft"],["Silicone Sealant","pcs"],["PU Sealant","pcs"]
];

export default function Materials({onBack}){
 const [items,setItems]=useState([]),[orders,setOrders]=useState([]),[form,setForm]=useState({name:"",unit:"pcs",stock_qty:"",min_stock_qty:"",rate:"",supplier:""}),[error,setError]=useState("");
 async function load(){try{const [m,o]=await Promise.all([api.get("/api/v1/workshop-materials"),api.get("/api/v1/fabrication")]);setItems(m.data.items||[]);setOrders(o.data.items||[])}catch(e){setError(e.response?.data?.detail||"Materials load nahi hue.")}}
 useEffect(()=>{load()},[]);
 async function save(e){e.preventDefault();try{const {data}=await api.post("/api/v1/workshop-materials",form);setItems(v=>[...v,data]);setForm({name:"",unit:"pcs",stock_qty:"",min_stock_qty:"",rate:"",supplier:""})}catch(e){setError(e.response?.data?.detail||"Material save nahi hua.")}}
 async function txn(id,type){const q=window.prompt(type==="in"?"Kitna stock add karna hai?":"Kitna stock use hua?");if(!q)return;try{const {data}=await api.post(`/api/v1/workshop-materials/${id}/transaction`,{txn_type:type,qty:q});setItems(v=>v.map(x=>x.id===id?data:x))}catch(e){setError(e.response?.data?.detail||"Stock update nahi hua.")}}
 return <main className="page workshop-page materials-page"><div className="page-head"><div><button className="secondary" onClick={onBack}>← Dashboard</button><h1>📦 Materials</h1><p className="form-help">Stock, rate aur material usage track karein.</p></div></div>{error&&<p className="error">{error}</p>}
 <section className="panel"><h2>Add Material</h2><form className="form-grid workshop-form" onSubmit={save}><label><span>Fabrication Material List</span><select value="" onChange={e=>{const x=FABRICATION_MATERIALS.find(v=>v[0]===e.target.value);if(x)setForm({...form,name:x[0],unit:x[1]})}}><option value="">Select common material</option>{FABRICATION_MATERIALS.map(x=><option key={x[0]} value={x[0]}>{x[0]} ({x[1]})</option>)}</select></label><label><span>Material</span><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="MS Pipe 1x1"/></label><label><span>Unit</span><input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></label><label><span>Opening Stock</span><input type="number" value={form.stock_qty} onChange={e=>setForm({...form,stock_qty:e.target.value})}/></label><label><span>Minimum Stock</span><input type="number" value={form.min_stock_qty} onChange={e=>setForm({...form,min_stock_qty:e.target.value})}/></label><label><span>Rate / Unit</span><input type="number" value={form.rate} onChange={e=>setForm({...form,rate:e.target.value})}/></label><label><span>Supplier</span><input value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})}/></label><div className="form-actions"><button>Add Material</button></div></form></section>
 <section className="panel"><div className="toolbar"><div><h2>Material Stock</h2><span className="record-count">{items.length} items</span></div></div><div className="table-wrap"><table><thead><tr><th>Material</th><th>Stock</th><th>Rate</th><th>Stock Value</th><th>Supplier</th><th>Action</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td><strong>{x.name}</strong><br/><small>{x.unit}</small></td><td>{x.stock_qty} {x.unit}{x.stock_qty<=x.min_stock_qty&&<b className="low-stock"> Low</b>}</td><td>{money(x.rate)}</td><td>{money(x.stock_qty*x.rate)}</td><td>{x.supplier||"-"}</td><td><button className="small" onClick={()=>txn(x.id,"in")}>+ In</button> <button className="small" onClick={()=>txn(x.id,"out")}>- Use</button></td></tr>)}{!items.length&&<tr><td colSpan="6">No materials added.</td></tr>}</tbody></table></div></section>
 </main>;
}
