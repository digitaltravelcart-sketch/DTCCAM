const express = require("express");
const router = express.Router();
const store = require("../lib/store");
const costing = require("../lib/costing");
const { requireRole, SALES_ROLES } = require("../lib/auth");

function recalc(quotation) {
  const items = store.where("quotation_items", (i) => i.quotation_id === quotation.id);
  const totals = costing.computeQuotationTotals(
    items,
    quotation.markup_pct || 0,
    quotation.discount_amt || 0,
    quotation.gst_pct != null ? quotation.gst_pct : 5
  );
  store.update("quotations", quotation.id, {
    total_cost: totals.totalCost,
    total_sell_price: totals.sellPrice,
    margin_amount: totals.margin,
    margin_pct: totals.marginPct,
  });
  return totals;
}

router.get("/", (req, res) => {
  const quotations = store.all("quotations").slice().reverse();
  res.render("quotations/list", { title: "Quotations", quotations, store });
});

router.get("/new", requireRole(...SALES_ROLES), (req, res) => {
  const lead = req.query.lead_id ? store.find("leads", req.query.lead_id) : null;
  res.render("quotations/new", { title: "New Quotation", lead, leads: store.all("leads") });
});

router.post("/new", requireRole(...SALES_ROLES), (req, res) => {
  const b = req.body;
  const lead = b.lead_id ? store.find("leads", b.lead_id) : null;
  const quotation = store.insert("quotations", {
    lead_id: lead ? lead.id : null,
    created_by: req.session.userId,
    destination: b.destination || (lead ? lead.destination : ""),
    travel_start_date: b.travel_start_date || (lead ? lead.travel_start_date : null),
    nights: Number(b.nights || 1),
    pax_adults: Number(b.pax_adults || (lead ? lead.pax_adults : 2)),
    pax_children: Number(b.pax_children || (lead ? lead.pax_children : 0)),
    markup_pct: 15,
    discount_amt: 0,
    gst_pct: 5,
    status: "draft",
    total_cost: 0,
    total_sell_price: 0,
    margin_amount: 0,
    margin_pct: 0,
    created_at: new Date().toISOString(),
  });
  if (lead) store.update("leads", lead.id, { status: "quoted" });
  res.redirect(`/quotations/${quotation.id}`);
});

router.get("/:id", (req, res) => {
  const quotation = store.find("quotations", req.params.id);
  if (!quotation) return res.status(404).render("error", { title: "Not found", message: "Quotation not found." });
  const items = store.where("quotation_items", (i) => i.quotation_id === quotation.id);
  const hotels = store.all("hotels");
  const allRoomCategories = store.all("room_categories");
  res.render("quotations/detail", {
    title: `Quotation #${quotation.id}`,
    quotation,
    items,
    hotels,
    allRoomCategories,
    store,
    canEdit: ["Super Admin", "Director", "Sales Manager", "Sales Executive"].includes(res.locals.currentRole),
  });
});

router.post("/:id/add-hotel-item", requireRole(...SALES_ROLES), (req, res) => {
  const quotation = store.find("quotations", req.params.id);
  const b = req.body;
  const result = costing.computeHotelComponentCost(
    b.hotel_id,
    b.room_category_id,
    b.meal_plan_code,
    b.check_in,
    Number(b.nights || 1),
    quotation.pax_adults,
    quotation.pax_children
  );
  if (!result) {
    req.session.flashError = "No contracted rate found for that hotel/room/meal-plan/date combination. Add a rate under Hotel Contracts first.";
    return res.redirect(`/quotations/${quotation.id}`);
  }
  const hotel = store.find("hotels", b.hotel_id);
  store.insert("quotation_items", {
    quotation_id: quotation.id,
    component_type: "hotel",
    description: `${hotel.name} — ${b.nights} night(s), ${b.meal_plan_code}`,
    unit_cost: result.perNight,
    quantity: Number(b.nights),
    total_cost: result.total,
  });
  recalc(quotation);
  res.redirect(`/quotations/${quotation.id}`);
});

router.post("/:id/add-manual-item", requireRole(...SALES_ROLES), (req, res) => {
  const quotation = store.find("quotations", req.params.id);
  const b = req.body;
  const total = Number(b.unit_cost) * Number(b.quantity || 1);
  store.insert("quotation_items", {
    quotation_id: quotation.id,
    component_type: b.component_type,
    description: b.description,
    unit_cost: Number(b.unit_cost),
    quantity: Number(b.quantity || 1),
    total_cost: total,
  });
  recalc(quotation);
  res.redirect(`/quotations/${quotation.id}`);
});

router.post("/:id/remove-item/:itemId", requireRole(...SALES_ROLES), (req, res) => {
  const quotation = store.find("quotations", req.params.id);
  store.remove("quotation_items", req.params.itemId);
  recalc(quotation);
  res.redirect(`/quotations/${quotation.id}`);
});

router.post("/:id/pricing", requireRole(...SALES_ROLES), (req, res) => {
  const quotation = store.find("quotations", req.params.id);
  const b = req.body;
  store.update("quotations", quotation.id, {
    markup_pct: Number(b.markup_pct || 0),
    discount_amt: Number(b.discount_amt || 0),
    gst_pct: Number(b.gst_pct || 0),
  });
  recalc(store.find("quotations", quotation.id));
  res.redirect(`/quotations/${quotation.id}`);
});

router.post("/:id/send", requireRole(...SALES_ROLES), (req, res) => {
  store.update("quotations", req.params.id, { status: "sent" });
  req.session.flashSuccess = "Quotation marked as sent to guest.";
  res.redirect(`/quotations/${req.params.id}`);
});

router.post("/:id/convert", requireRole(...SALES_ROLES), (req, res) => {
  const quotation = store.find("quotations", req.params.id);
  const items = store.where("quotation_items", (i) => i.quotation_id === quotation.id);
  if (items.length === 0) {
    req.session.flashError = "Add at least one item before converting to a booking.";
    return res.redirect(`/quotations/${quotation.id}`);
  }
  const year = new Date().getFullYear();
  const bookingCode = `TCB-${year}-${String(quotation.id).padStart(5, "0")}`;
  const booking = store.insert("bookings", {
    booking_code: bookingCode,
    quotation_id: quotation.id,
    lead_id: quotation.lead_id,
    sales_owner_id: req.session.userId,
    destination: quotation.destination,
    travel_start_date: quotation.travel_start_date,
    nights: quotation.nights,
    pax_adults: quotation.pax_adults,
    pax_children: quotation.pax_children,
    total_sell_price: quotation.total_sell_price,
    total_cost_price: quotation.total_cost,
    gross_margin: quotation.margin_amount,
    status: "confirmed_pending_ops",
    created_at: new Date().toISOString(),
  });
  items.forEach((it) => {
    store.insert("booking_components", {
      booking_id: booking.id,
      component_type: it.component_type,
      description: it.description,
      sell_price: it.total_cost, // baseline; markup applied at booking level totals
      cost_price: it.total_cost,
      confirmation_status: "pending",
    });
  });
  store.update("quotations", quotation.id, { status: "converted" });
  if (quotation.lead_id) store.update("leads", quotation.lead_id, { status: "won" });
  req.session.flashSuccess = `Booking ${bookingCode} created.`;
  res.redirect(`/bookings/${booking.id}`);
});

module.exports = router;
