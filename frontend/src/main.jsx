import React, { Component, useState } from "react";
import { createRoot } from "react-dom/client";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Pipeline from "./pages/FabricationPipeline";
import Quotations from "./pages/Quotations";
import Customers from "./pages/Customers";
import CustomerProfile from "./pages/CustomerProfile";
import Fabrication from "./pages/Fabrication";
import CompanySettings from "./pages/CompanySettings";
import Employees from "./pages/Employees";
import Expenses from "./pages/Expenses";
import Materials from "./pages/Materials";
import Payments from "./pages/Payments";
import WorkshopReports from "./pages/WorkshopReports";
import "./styles.css";

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error("CRM startup error:", error); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="auth-page">
        <section className="card">
          <h1>CRM Core</h1>
          <p>Application startup error. Your saved browser session may be corrupted.</p>
          <div className="error">{this.state.error?.message || "Unknown frontend error"}</div>
          <button onClick={() => { localStorage.removeItem("crm_access_token"); localStorage.removeItem("crm_user"); localStorage.removeItem("crm_business"); window.location.reload(); }}>
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
  const resetToken = new URLSearchParams(window.location.search).get("reset_token");

  if (auth) {
    return page === "enquiries" ? <Leads onBack={() => setPage("dashboard")} />
      : page === "pipeline" ? <Pipeline onBack={() => setPage("dashboard")} onEnquiries={() => setPage("enquiries")} />
      : page === "quotations" ? <Quotations onBack={() => setPage("dashboard")} onWorkOrders={() => setPage("fabrication")} />
      : page === "customers" ? <Customers onBack={() => setPage("dashboard")} onProfile={(id) => { setSelectedCustomer(id); setPage("customer-profile"); }} />
      : page === "customer-profile" ? <CustomerProfile customerId={selectedCustomer} onBack={() => setPage("customers")} />
      : page === "fabrication" ? <Fabrication onBack={() => setPage("dashboard")} onPipeline={() => setPage("pipeline")} />
      : page === "employees" ? <Employees onBack={() => setPage("dashboard")} />
      : page === "expenses" ? <Expenses onBack={() => setPage("dashboard")} />
      : page === "materials" ? <Materials onBack={() => setPage("dashboard")} />
      : page === "payments" ? <Payments onBack={() => setPage("dashboard")} />
      : page === "reports" ? <WorkshopReports onBack={() => setPage("dashboard")} />
      : page === "settings" ? <CompanySettings onBack={() => setPage("dashboard")} />
      : <Dashboard
          onLogout={() => { localStorage.clear(); setAuth(false); }}
          onEnquiries={() => setPage("enquiries")}
          onPipeline={() => setPage("pipeline")}
          onQuotations={() => setPage("quotations")}
          onCustomers={() => setPage("customers")}
          onFabrication={() => setPage("fabrication")}
          onSettings={() => setPage("settings")}
          onEmployees={() => setPage("employees")}
          onExpenses={() => setPage("expenses")}
          onMaterials={() => setPage("materials")}
          onPayments={() => setPage("payments")}
          onReports={() => setPage("reports")}
        />;
  }

  if (resetToken) return <ResetPassword token={resetToken} onDone={() => { window.history.replaceState({}, "", window.location.pathname); setMode("login"); }} />;

  return (
    <main className="auth-page">
      <div className="auth-shell">
        {mode === "login" ? <Login onAuthenticated={() => setAuth(true)} /> : <Register onAuthenticated={() => setAuth(true)} />}
        <button className="switch" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Create a new business account" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
