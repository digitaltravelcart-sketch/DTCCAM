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

module.exports = {
  requireLogin,
  requireRole,
  SUPER_ADMIN_ONLY,
  ADMIN_ROLES,
  SALES_ROLES,
  CONTRACTING_ROLES,
  OPS_ROLES,
  ACCOUNTS_ROLES,
};
