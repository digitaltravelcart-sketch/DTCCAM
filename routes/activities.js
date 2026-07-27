const express = require("express");
const router = express.Router();
const store = require("../lib/store");
const { requireRole, CONTRACTING_ROLES, SUPER_ADMIN_ONLY } = require("../lib/auth");

router.get("/", (req, res) => {
  const activities = store.all("activities").slice().reverse();
  res.render("activities/list", { title: "Activities", activities });
});

router.post("/new", requireRole(...CONTRACTING_ROLES), (req, res) => {
  const b = req.body;
  store.insert("activities", {
    name: b.name,
    city: b.city,
    price: Number(b.price || 0),
  });
  res.redirect("/activities");
});

router.post("/:id/delete", requireRole(...SUPER_ADMIN_ONLY), (req, res) => {
  store.remove("activities", req.params.id);
  res.redirect("/activities");
});

module.exports = router;
