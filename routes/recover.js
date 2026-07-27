// Emergency account-recovery route — completely inert unless the
// RECOVERY_TOKEN environment variable is set. Lets you restore a locked-out
// account to Super Admin without database access, by setting RECOVERY_TOKEN
// in your host's environment variables, using this page once, then removing
// the env var again to close the door.
const express = require("express");
const router = express.Router();
const store = require("../lib/store");

router.get("/recover-admin", (req, res) => {
  if (!process.env.RECOVERY_TOKEN) {
    return res.status(404).render("error", { title: "Not found", message: "That page does not exist." });
  }
  res.render("recover", { title: "Account Recovery", error: null, success: null });
});

router.post("/recover-admin", (req, res) => {
  if (!process.env.RECOVERY_TOKEN) {
    return res.status(404).render("error", { title: "Not found", message: "That page does not exist." });
  }
  const { token, email } = req.body;
  if (token !== process.env.RECOVERY_TOKEN) {
    return res.render("recover", { title: "Account Recovery", error: "Incorrect token.", success: null });
  }
  const user = store.where("users", (u) => u.email.toLowerCase() === String(email || "").toLowerCase())[0];
  if (!user) {
    return res.render("recover", { title: "Account Recovery", error: `No user found with email ${email}.`, success: null });
  }
  store.update("users", user.id, { role_id: 1, status: "active" }); // 1 = Super Admin
  res.render("recover", {
    title: "Account Recovery",
    error: null,
    success: `${user.full_name} (${user.email}) is now Super Admin and active. Remove the RECOVERY_TOKEN environment variable now to close this off.`,
  });
});

module.exports = router;
