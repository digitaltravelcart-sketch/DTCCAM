const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const store = require("../lib/store");

router.get("/login", (req, res) => {
  if (req.session.userId) return res.redirect("/");
  res.render("login", { title: "Log in" });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = store.where("users", (u) => u.email.toLowerCase() === String(email || "").toLowerCase())[0];
  if (!user || user.status !== "active" || !bcrypt.compareSync(password || "", user.password_hash)) {
    req.session.flashError = "Invalid email or password.";
    return res.redirect("/login");
  }
  req.session.userId = user.id;
  res.redirect("/");
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

module.exports = router;
