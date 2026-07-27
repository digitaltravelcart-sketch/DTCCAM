const express = require("express");
const router = express.Router();
const store = require("../lib/store");
const { requireRole, OPS_ROLES, ACCOUNTS_ROLES } = require("../lib/auth");

router.get("/", (req, res) => {
  const bookings = store.all("bookings").slice().reverse();
  const payments = store.all("customer_payments");
  const withOutstanding = bookings.map((b) => {
    const paid = payments.filter((p) => p.booking_id === b.id).reduce((s, p) => s + Number(p.amount), 0);
    return { ...b, paid, outstanding: Math.max(0, Number(b.total_sell_price || 0) - paid) };
  });
  res.render("bookings/list", { title: "Bookings", bookings: withOutstanding });
});

router.get("/:id", (req, res) => {
  const booking = store.find("bookings", req.params.id);
  if (!booking) return res.status(404).render("error", { title: "Not found", message: "Booking not found." });
  const components = store.where("booking_components", (c) => c.booking_id === booking.id);
  const payments = store.where("customer_payments", (p) => p.booking_id === booking.id).slice().reverse();
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = Math.max(0, Number(booking.total_sell_price || 0) - paid);
  res.render("bookings/detail", {
    title: booking.booking_code,
    booking,
    components,
    payments,
    paid,
    outstanding,
    canConfirm: ["Super Admin", "Director", "Operations Manager", "Operations Executive"].includes(res.locals.currentRole),
    canRecordPayment: ["Super Admin", "Director", "Accounts"].includes(res.locals.currentRole),
  });
});

router.post("/:id/components/:componentId/confirm", requireRole(...OPS_ROLES), (req, res) => {
  const component = store.find("booking_components", req.params.componentId);
  const newStatus = component.confirmation_status === "confirmed" ? "pending" : "confirmed";
  store.update("booking_components", component.id, {
    confirmation_status: newStatus,
    confirmed_at: newStatus === "confirmed" ? new Date().toISOString() : null,
  });
  // auto-update booking status if all components confirmed
  const booking = store.find("bookings", req.params.id);
  const allComponents = store.where("booking_components", (c) => c.booking_id === booking.id);
  const allConfirmed = allComponents.length > 0 && allComponents.every((c) => c.confirmation_status === "confirmed");
  store.update("bookings", booking.id, { status: allConfirmed ? "fully_confirmed" : "confirmed_pending_ops" });
  res.redirect(`/bookings/${req.params.id}`);
});

router.post("/:id/payments/new", requireRole(...ACCOUNTS_ROLES), (req, res) => {
  const b = req.body;
  store.insert("customer_payments", {
    booking_id: Number(req.params.id),
    amount: Number(b.amount),
    payment_mode: b.payment_mode,
    received_at: new Date().toISOString(),
    recorded_by: req.session.userId,
  });
  req.session.flashSuccess = "Payment recorded.";
  res.redirect(`/bookings/${req.params.id}`);
});

router.post("/:id/cancel", requireRole(...OPS_ROLES), (req, res) => {
  store.update("bookings", req.params.id, { status: "cancelled" });
  res.redirect(`/bookings/${req.params.id}`);
});

module.exports = router;
