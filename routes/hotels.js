const express = require("express");
const router = express.Router();
const store = require("../lib/store");
const { requireRole, CONTRACTING_ROLES, SUPER_ADMIN_ONLY } = require("../lib/auth");

router.get("/", (req, res) => {
  const hotels = store.all("hotels").slice().reverse();
  res.render("hotels/list", { title: "Hotel Contracts", hotels });
});

router.get("/new", requireRole(...CONTRACTING_ROLES), (req, res) => {
  res.render("hotels/form", { title: "New Hotel" });
});

router.post("/new", requireRole(...CONTRACTING_ROLES), (req, res) => {
  const b = req.body;
  const hotel = store.insert("hotels", {
    name: b.name,
    city: b.city,
    country: b.country || "India",
    category_star: Number(b.category_star || 3),
    contact_person: b.contact_person,
    phone: b.phone,
    email: b.email,
    gstin: b.gstin,
    status: "active",
  });
  res.redirect(`/hotels/${hotel.id}`);
});

router.get("/:id", (req, res) => {
  const hotel = store.find("hotels", req.params.id);
  if (!hotel) return res.status(404).render("error", { title: "Not found", message: "Hotel not found." });
  const roomCategories = store.where("room_categories", (r) => r.hotel_id === hotel.id);
  const contracts = store.where("hotel_contracts", (c) => c.hotel_id === hotel.id);
  const seasonsByContract = {};
  const ratesBySeason = {};
  contracts.forEach((c) => {
    seasonsByContract[c.id] = store.where("hotel_contract_seasons", (s) => s.hotel_contract_id === c.id);
    seasonsByContract[c.id].forEach((s) => {
      ratesBySeason[s.id] = store.where("hotel_rates", (r) => r.season_id === s.id);
    });
  });
  res.render("hotels/detail", {
    title: hotel.name,
    hotel,
    roomCategories,
    contracts,
    seasonsByContract,
    ratesBySeason,
    mealPlans: store.all("meal_plans"),
  });
});

router.post("/:id/room-categories/new", requireRole(...CONTRACTING_ROLES), (req, res) => {
  store.insert("room_categories", {
    hotel_id: Number(req.params.id),
    name: req.body.name,
  });
  res.redirect(`/hotels/${req.params.id}`);
});

router.post("/:id/contracts/new", requireRole(...CONTRACTING_ROLES), (req, res) => {
  const b = req.body;
  store.insert("hotel_contracts", {
    hotel_id: Number(req.params.id),
    valid_from: b.valid_from,
    valid_to: b.valid_to,
    payment_terms: b.payment_terms,
    cancellation_policy: b.cancellation_policy,
    status: "active",
  });
  res.redirect(`/hotels/${req.params.id}`);
});

router.post("/contracts/:contractId/seasons/new", requireRole(...CONTRACTING_ROLES), (req, res) => {
  const contract = store.find("hotel_contracts", req.params.contractId);
  const b = req.body;
  store.insert("hotel_contract_seasons", {
    hotel_contract_id: contract.id,
    season_name: b.season_name,
    date_from: b.date_from,
    date_to: b.date_to,
  });
  res.redirect(`/hotels/${contract.hotel_id}`);
});

router.post("/seasons/:seasonId/rates/new", requireRole(...CONTRACTING_ROLES), (req, res) => {
  const season = store.find("hotel_contract_seasons", req.params.seasonId);
  const contract = store.find("hotel_contracts", season.hotel_contract_id);
  const b = req.body;
  store.insert("hotel_rates", {
    season_id: season.id,
    room_category_id: Number(b.room_category_id),
    meal_plan_code: b.meal_plan_code,
    base_rate_single: Number(b.base_rate_single || 0),
    base_rate_double: Number(b.base_rate_double),
    extra_adult_rate: Number(b.extra_adult_rate || 0),
    extra_child_nb_rate: Number(b.extra_child_nb_rate || 0),
    extra_child_wb_rate: Number(b.extra_child_wb_rate || 0),
  });
  res.redirect(`/hotels/${contract.hotel_id}`);
});

// ---- Delete endpoints — Super Admin only, each cascades to its children ----

router.post("/:id/delete", requireRole(...SUPER_ADMIN_ONLY), (req, res) => {
  const hotelId = Number(req.params.id);
  const contracts = store.where("hotel_contracts", (c) => c.hotel_id === hotelId);
  contracts.forEach((c) => {
    const seasons = store.where("hotel_contract_seasons", (s) => s.hotel_contract_id === c.id);
    seasons.forEach((s) => {
      store.where("hotel_rates", (r) => r.season_id === s.id).forEach((r) => store.remove("hotel_rates", r.id));
      store.remove("hotel_contract_seasons", s.id);
    });
    store.remove("hotel_contracts", c.id);
  });
  store.where("room_categories", (r) => r.hotel_id === hotelId).forEach((r) => store.remove("room_categories", r.id));
  store.remove("hotels", hotelId);
  req.session.flashSuccess = "Hotel deleted.";
  res.redirect("/hotels");
});

router.post("/:id/room-categories/:rcId/delete", requireRole(...SUPER_ADMIN_ONLY), (req, res) => {
  store.remove("room_categories", req.params.rcId);
  res.redirect(`/hotels/${req.params.id}`);
});

router.post("/:id/contracts/:contractId/delete", requireRole(...SUPER_ADMIN_ONLY), (req, res) => {
  const seasons = store.where("hotel_contract_seasons", (s) => s.hotel_contract_id === Number(req.params.contractId));
  seasons.forEach((s) => {
    store.where("hotel_rates", (r) => r.season_id === s.id).forEach((r) => store.remove("hotel_rates", r.id));
    store.remove("hotel_contract_seasons", s.id);
  });
  store.remove("hotel_contracts", req.params.contractId);
  res.redirect(`/hotels/${req.params.id}`);
});

router.post("/:id/seasons/:seasonId/delete", requireRole(...SUPER_ADMIN_ONLY), (req, res) => {
  store.where("hotel_rates", (r) => r.season_id === Number(req.params.seasonId)).forEach((r) => store.remove("hotel_rates", r.id));
  store.remove("hotel_contract_seasons", req.params.seasonId);
  res.redirect(`/hotels/${req.params.id}`);
});

router.post("/:id/rates/:rateId/delete", requireRole(...SUPER_ADMIN_ONLY), (req, res) => {
  store.remove("hotel_rates", req.params.rateId);
  res.redirect(`/hotels/${req.params.id}`);
});

module.exports = router;
