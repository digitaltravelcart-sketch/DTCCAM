const store = require("./store");

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  const user = store.find("users", req.session.userId);
  if (!user || user.status !== "active") {
    req.session.destroy(() => {});
    return res.redirect("/login");
  }
  res.locals.currentUser = user;
  res.locals.currentRole = store.roleName(user.role_id);
  next();
}

// role check: pass array of allowed role names
function requireRole(...allowedRoles) {
  return function (req, res, next) {
    const role = res.locals.currentRole;
    if (allowedRoles.includes(role)) return next();
    return res.status(403).render("error", {
      title: "Access denied",
      message: `Your role (${role}) does not have permission to access this page.`,
      currentUser: res.locals.currentUser,
      currentRole: res.locals.currentRole,
    });
  };
}

const SUPER_ADMIN_ONLY = ["Super Admin"];
const ADMIN_ROLES = ["Super Admin", "Director"];
const SALES_ROLES = ["Super Admin", "Director", "Sales Manager", "Sales Executive"];
const CONTRACTING_ROLES = ["Super Admin", "Director", "Contracting Team", "Product Team"];
const OPS_ROLES = ["Super Admin", "Director", "Operations Manager", "Operations Executive"];
const ACCOUNTS_ROLES = ["Super Admin", "Director", "Accounts"];

// What each role can actually do in this CAM — shown to whoever is
// assigning roles so it isn't a guess. Keep this in sync with the
// requireRole(...) checks above and in routes/*.js.
const ROLE_DESCRIPTIONS = {
  "Super Admin": "Full access to every module, plus the only role that can delete hotels/contracts/rates/transport routes/activities, and manage users.",
  "Director": "Full access to every module (Leads, Quotations, Hotel Contracts, Transport, Activities, Bookings, Manage Users) — same as Super Admin except cannot delete hotel/transport/activity records.",
  "Sales Manager": "Leads/CRM and Quotations — create and work leads, build quotations, apply pricing, send to guest, convert to bookings.",
  "Sales Executive": "Leads/CRM and Quotations — create and work leads, build quotations, apply pricing, send to guest, convert to bookings.",
  "Operations Manager": "Bookings — confirm booking components (hotel/transport/activity) and cancel bookings.",
  "Operations Executive": "Bookings — confirm booking components (hotel/transport/activity) and cancel bookings.",
  "Accounts": "Bookings — record customer payments and track outstanding balances.",
  "Contracting Team": "Hotel Contracts, Transport, Activities — add hotels, room categories, contracts, seasons, rates, transport routes, and activities.",
  "Product Team": "Hotel Contracts, Transport, Activities — add hotels, room categories, contracts, seasons, rates, transport routes, and activities.",
  "Guest Support": "View-only across Leads, Quotations, Bookings, Hotel Contracts, Transport, and Activities — no create/edit/delete rights in any module.",
};

module.exports = {
  requireLogin,
  requireRole,
  SUPER_ADMIN_ONLY,
  ADMIN_ROLES,
  SALES_ROLES,
  CONTRACTING_ROLES,
  OPS_ROLES,
  ACCOUNTS_ROLES,
  ROLE_DESCRIPTIONS,
};
