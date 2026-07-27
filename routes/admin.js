const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const store = require("../lib/store");
const { requireRole, ADMIN_ROLES, ROLE_DESCRIPTIONS } = require("../lib/auth");

router.use(requireRole(...ADMIN_ROLES));

router.get("/users", (req, res) => {
  const users = store.all("users");
  res.render("admin/users", { title: "Manage Users", users, roles: store.all("roles"), roleDescriptions: ROLE_DESCRIPTIONS, store });
});

router.get("/users/new", (req, res) => {
  res.render("admin/user_form", { title: "New User", user: null, roles: store.all("roles"), roleDescriptions: ROLE_DESCRIPTIONS });
});

router.post("/users/new", (req, res) => {
  const b = req.body;
  const existing = store.where("users", (u) => u.email.toLowerCase() === b.email.toLowerCase())[0];
  if (existing) {
    req.session.flashError = "A user with that email already exists.";
    return res.redirect("/admin/users/new");
  }
  store.insert("users", {
    full_name: b.full_name,
    email: b.email,
    password_hash: bcrypt.hashSync(b.password || "changeme123", 10),
    role_id: Number(b.role_id),
    status: "active",
  });
  req.session.flashSuccess = `User "${b.full_name}" created.`;
  res.redirect("/admin/users");
});

router.post("/users/:id/toggle-status", (req, res) => {
  const user = store.find("users", req.params.id);
  if (user.id === req.session.userId) {
    req.session.flashError = "You cannot deactivate your own account.";
    return res.redirect("/admin/users");
  }
  store.update("users", user.id, { status: user.status === "active" ? "inactive" : "active" });
  res.redirect("/admin/users");
});

router.post("/users/:id/role", (req, res) => {
  if (Number(req.params.id) === req.session.userId) {
    req.session.flashError = "You cannot change your own role — ask another Super Admin or Director to do it.";
    return res.redirect("/admin/users");
  }
  store.update("users", req.params.id, { role_id: Number(req.body.role_id) });
  req.session.flashSuccess = "Role updated.";
  res.redirect("/admin/users");
});

module.exports = router;
