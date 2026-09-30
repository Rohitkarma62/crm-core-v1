import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Pipeline from "./pages/Pipeline";
import Customers from "./pages/Customers";
import Sales from "./pages/Sales";
import ImportExport from "./pages/ImportExport";
import Reports from "./pages/Reports";
import "./styles.css";

function App(){
  const [auth, setAuth] = useState(Boolean(localStorage.getItem("crm_access_token")));
  const [mode, setMode] = useState("login");
  const [page, setPage] = useState("dashboard");
  if(auth) return page === "leads" ? <Leads onBack={()=>setPage("dashboard")} /> : page === "pipeline" ? <Pipeline onBack={()=>setPage("dashboard")} /> : page === "customers" ? <Customers onBack={()=>setPage("dashboard")} /> : page === "sales" ? <Sales onBack={()=>setPage("dashboard")} /> : page === "import" ? <ImportExport onBack={()=>setPage("dashboard")} /> : page === "reports" ? <Reports onBack={()=>setPage("dashboard")} /> : <Dashboard onLogout={()=>{localStorage.clear(); setAuth(false)}} onLeads={()=>setPage("leads")} onPipeline={()=>setPage("pipeline")} onCustomers={()=>setPage("customers")} onSales={()=>setPage("sales")} onImport={()=>setPage("import")} onReports={()=>setPage("reports")} />;
  return mode === "login"
    ? <><Login onAuthenticated={()=>setAuth(true)} /><button className="switch" onClick={()=>setMode("register")}>Create a new business account</button></>
    : <><Register onAuthenticated={()=>setAuth(true)} /><button className="switch" onClick={()=>setMode("login")}>Already have an account? Sign in</button></>;
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
