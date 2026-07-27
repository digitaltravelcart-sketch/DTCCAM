const express = require("express");
const router = express.Router();
const store = require("../lib/store");
const { requireRole, CONTRACTING_ROLES } = require("../lib/auth");

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
    max_occupancy: Number(req.body.max_occupancy || 3),
  });
  res.redirect(`/hotels/${req.params.id}`);
});

router.post("/:id/contracts/new", requireRole(...CONTRACTING_ROLES), (req, res) => {
  const b = req.body;
  store.insert("hotel_contracts", {
    hotel_id: Number(req.params.id),
    contract_name: b.contract_name,
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
    base_rate_double: Number(b.base_rate_double),
    extra_adult_rate: Number(b.extra_adult_rate || 0),
    extra_child_wb_rate: Number(b.extra_child_wb_rate || 0),
    single_supplement: Number(b.single_supplement || 0),
  });
  res.redirect(`/hotels/${contract.hotel_id}`);
});

module.exports = router;
