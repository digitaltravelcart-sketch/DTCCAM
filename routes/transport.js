const express = require("express");
const router = express.Router();
const store = require("../lib/store");
const { requireRole, CONTRACTING_ROLES, SUPER_ADMIN_ONLY } = require("../lib/auth");

router.get("/", (req, res) => {
  const routes = store.all("transport_routes").slice().reverse();
  res.render("transport/list", { title: "Transport Rates", routes });
});

router.post("/new", requireRole(...CONTRACTING_ROLES), (req, res) => {
  const b = req.body;
  store.insert("transport_routes", {
    route_name: b.route_name,
    itinerary: b.itinerary,
    price: Number(b.price || 0),
  });
  res.redirect("/transport");
});

router.post("/:id/delete", requireRole(...SUPER_ADMIN_ONLY), (req, res) => {
  store.remove("transport_routes", req.params.id);
  res.redirect("/transport");
});

module.exports = router;
