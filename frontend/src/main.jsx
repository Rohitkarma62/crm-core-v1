import React, { Component, useState } from "react";
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
import CustomerProfile from "./pages/CustomerProfile";
import CompanySettings from "./pages/CompanySettings";
import "./styles.css";

class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("CRM startup error:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="auth-page">
        <section className="card">
          <h1>CRM Core</h1>
          <p>Application startup error. Your saved browser session may be corrupted.</p>
          <div className="error">{this.state.error?.message || "Unknown frontend error"}</div>
          <button
            onClick={() => {
              localStorage.removeItem("crm_access_token");
              localStorage.removeItem("crm_user");
              localStorage.removeItem("crm_business");
              window.location.reload();
            }}
          >
            Reset session and reload
          </button>
        </section>
      </main>
    );
  }
}

function App() {
  const [auth, setAuth] = useState(Boolean(localStorage.getItem("crm_access_token")));
  const [mode, setMode] = useState("login");
  const [page, setPage] = useState("dashboard");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  if (auth) {
    return page === "leads" ? <Leads onBack={() => setPage("dashboard")} />
      : page === "pipeline" ? <Pipeline onBack={() => setPage("dashboard")} onLeads={() => setPage("leads")} />
      : page === "customers" ? <Customers onBack={() => setPage("dashboard")} onProfile={(id) => { setSelectedCustomer(id); setPage("customer-profile"); }} />
      : page === "customer-profile" ? <CustomerProfile customerId={selectedCustomer} onBack={() => setPage("customers")} />
      : page === "settings" ? <CompanySettings onBack={() => setPage("dashboard")} />
      : page === "sales" ? <Sales onBack={() => setPage("dashboard")} />
      : page === "import" ? <ImportExport onBack={() => setPage("dashboard")} />
      : page === "reports" ? <Reports onBack={() => setPage("dashboard")} />
      : <Dashboard
          onLogout={() => { localStorage.clear(); setAuth(false); }}
          onLeads={() => setPage("leads")}
          onPipeline={() => setPage("pipeline")}
          onCustomers={() => setPage("customers")}
          onSales={() => setPage("sales")}
          onImport={() => setPage("import")}
          onReports={() => setPage("reports")}
          onSettings={() => setPage("settings")}
        />;
  }

  return mode === "login"
    ? <><Login onAuthenticated={() => setAuth(true)} /><button className="switch" onClick={() => setMode("register")}>Create a new business account</button></>
    : <><Register onAuthenticated={() => setAuth(true)} /><button className="switch" onClick={() => setMode("login")}>Already have an account? Sign in</button></>;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
