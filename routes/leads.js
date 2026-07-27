const express = require("express");
const router = express.Router();
const store = require("../lib/store");

const SOURCES = ["Website", "B2B Agent", "Corporate", "Walk-in", "WhatsApp", "Facebook", "Instagram", "Google", "Referral"];

router.get("/", (req, res) => {
  const leads = store.all("leads").slice().reverse();
  res.render("leads/list", { title: "Leads / CRM", leads, store });
});

router.get("/new", (req, res) => {
  res.render("leads/form", { title: "New Lead", lead: null, sources: SOURCES, users: store.all("users"), store });
});

router.post("/new", (req, res) => {
  const b = req.body;
  const lead = store.insert("leads", {
    guest_name: b.guest_name,
    phone: b.phone,
    email: b.email,
    destination: b.destination,
    travel_start_date: b.travel_start_date || null,
    pax_adults: Number(b.pax_adults || 1),
    pax_children: Number(b.pax_children || 0),
    budget_per_pax: b.budget_per_pax || null,
    source: b.source,
    assigned_to: b.assigned_to ? Number(b.assigned_to) : null,
    priority: b.priority || "medium",
    status: "new",
    created_at: new Date().toISOString(),
  });
  req.session.flashSuccess = `Lead "${lead.guest_name}" created.`;
  res.redirect(`/leads/${lead.id}`);
});

router.get("/:id", (req, res) => {
  const lead = store.find("leads", req.params.id);
  if (!lead) return res.status(404).render("error", { title: "Not found", message: "Lead not found." });
  const notes = store.where("lead_notes", (n) => n.lead_id === lead.id).slice().reverse();
  const quotations = store.where("quotations", (q) => q.lead_id === lead.id);
  res.render("leads/detail", { title: lead.guest_name, lead, notes, quotations, users: store.all("users"), store });
});

router.post("/:id/note", (req, res) => {
  const lead = store.find("leads", req.params.id);
  if (lead) {
    store.insert("lead_notes", {
      lead_id: lead.id,
      note: req.body.note,
      created_by: req.session.userId,
      created_at: new Date().toISOString(),
    });
  }
  res.redirect(`/leads/${req.params.id}`);
});

router.post("/:id/update", (req, res) => {
  const b = req.body;
  store.update("leads", req.params.id, {
    status: b.status,
    priority: b.priority,
    assigned_to: b.assigned_to ? Number(b.assigned_to) : null,
  });
  req.session.flashSuccess = "Lead updated.";
  res.redirect(`/leads/${req.params.id}`);
});

module.exports = router;
