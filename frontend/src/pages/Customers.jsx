import React, { useEffect, useState } from "react";
import { api } from "../services/api";

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function Customers({ onBack, onProfile }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", company: "", address: "" });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/api/v1/customers", {
        params: { search: search.trim() || undefined, page_size: 100 },
      });
      setCustomers(data.items || []);
      setError("");
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to load customers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => load(), search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  function reset() {
    setForm({ name: "", phone: "", email: "", company: "", address: "" });
    setEditing(null);
  }

  async function save(e) {
    e.preventDefault();
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      if (editing) await api.put(`/api/v1/customers/${editing}`, form);
      else await api.post("/api/v1/customers", form);
      reset();
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to save customer");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this customer?")) return;
    setError("");
    try {
      await api.delete(`/api/v1/customers/${id}`);
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to delete customer");
    }
  }

  function edit(c) {
    setEditing(c.id);
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email || "",
      company: c.company || "",
      address: c.address || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="page customers-page">
      <div className="page-head">
        <button className="secondary" onClick={onBack}>← Dashboard</button>
        <h1>Customers</h1>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{editing ? "Edit Customer" : "Add Customer"}</h2>
            <p>Add and manage your customer records.</p>
          </div>
        </div>

        <form className="form-grid customer-form" onSubmit={save}>
          {[
            ["name", "Name *"],
            ["phone", "Phone *"],
            ["email", "Email"],
            ["company", "Company"],
            ["address", "Address"],
          ].map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <input
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={key === "name" || key === "phone"}
                placeholder={key === "name" ? "Customer name" : key === "phone" ? "Phone number" : ""}
              />
            </label>
          ))}
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Update Customer" : "Add Customer"}
            </button>
            {editing && <button type="button" className="secondary" onClick={reset}>Cancel</button>}
          </div>
        </form>

        {error && <p className="error">{error}</p>}
      </section>

      <section className="panel">
        <div className="toolbar">
          <div>
            <h2>Customer List</h2>
            <span className="record-count">{loading ? "Loading..." : `${customers.length} customer${customers.length === 1 ? "" : "s"}`}</span>
          </div>
          <input
            className="search-input"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Phone</th><th>Company</th><th>Email</th><th>Job Value</th><th>Paid</th><th>Balance</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="table-state">Loading customers...</td></tr>
              ) : customers.length ? (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td>{c.phone}</td>
                    <td>{c.company || "-"}</td>
                    <td>{c.email || "-"}</td>
                    <td>{money(c.total_sales)}</td>
                    <td>{money(c.collected)}</td>
                    <td>{money(c.outstanding)}</td>
                    <td className="actions-cell">
                      <button className="small" onClick={() => onProfile && onProfile(c.id)}>Profile / Bill</button>
                      <button className="small" onClick={() => edit(c)}>Edit</button>
                      <button className="small danger" onClick={() => remove(c.id)}>Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="8" className="table-state">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
