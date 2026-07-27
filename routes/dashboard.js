const express = require("express");
const router = express.Router();
const store = require("../lib/store");

router.get("/", (req, res) => {
  const leads = store.all("leads");
  const quotations = store.all("quotations");
  const bookings = store.all("bookings");
  const components = store.all("booking_components");
  const payments = store.all("customer_payments");

  const today = new Date().toISOString().slice(0, 10);

  const todaysEnquiries = leads.filter((l) => l.created_at && l.created_at.slice(0, 10) === today).length;
  const pendingQuotations = quotations.filter((q) => q.status === "sent" || q.status === "draft").length;
  const pendingHotelConfirmations = components.filter(
    (c) => c.component_type === "hotel" && c.confirmation_status === "pending"
  ).length;

  const upcoming = bookings
    .filter((b) => b.status !== "cancelled")
    .sort((a, b) => new Date(a.travel_start_date) - new Date(b.travel_start_date))
    .slice(0, 8);

  const travellingToday = bookings.filter((b) => b.travel_start_date === today).length;

  let profitMTD = 0;
  const thisMonth = today.slice(0, 7);
  bookings.forEach((b) => {
    if (b.created_at && b.created_at.slice(0, 7) === thisMonth) {
      profitMTD += Number(b.gross_margin || 0);
    }
  });

  let paymentsPending = 0;
  bookings.forEach((b) => {
    const paid = payments.filter((p) => p.booking_id === b.id).reduce((s, p) => s + Number(p.amount), 0);
    paymentsPending += Math.max(0, Number(b.total_sell_price || 0) - paid);
  });

  // Sales leaderboard
  const leaderboard = {};
  bookings.forEach((b) => {
    const owner = store.find("users", b.sales_owner_id);
    const name = owner ? owner.full_name : "Unassigned";
    leaderboard[name] = (leaderboard[name] || 0) + Number(b.total_sell_price || 0);
  });
  const leaderboardArr = Object.entries(leaderboard)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Destination-wise revenue
  const destRevenue = {};
  bookings.forEach((b) => {
    destRevenue[b.destination] = (destRevenue[b.destination] || 0) + Number(b.total_sell_price || 0);
  });
  const destArr = Object.entries(destRevenue).sort((a, b) => b[1] - a[1]).slice(0, 6);

  res.render("dashboard", {
    title: "Dashboard",
    todaysEnquiries,
    pendingQuotations,
    pendingHotelConfirmations,
    travellingToday,
    profitMTD,
    paymentsPending,
    leaderboardArr,
    destArr,
    upcoming,
    bookingsTotal: bookings.length,
    leadsTotal: leads.length,
    store,
  });
});

module.exports = router;
