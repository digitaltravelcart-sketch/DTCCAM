const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const path = require("path");

const store = require("./lib/store");
const { requireLogin } = require("./lib/auth");

async function main() {
  await store.load();

  // ---- First-run seed: create a default Super Admin so you can log in ----
  if (store.all("users").length === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    store.insert("users", {
      full_name: "System Administrator",
      email: "admin@digitaltravelcart.com",
      password_hash: hash,
      role_id: 1, // Super Admin
      status: "active",
    });
    console.log("=================================================================");
    console.log(" First run: created default login");
    console.log("   Email:    admin@digitaltravelcart.com");
    console.log("   Password: admin123");
    console.log(" Log in, then go to Admin > Users to create real accounts.");
    console.log("=================================================================");
  }

  const app = express();
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) app.set("trust proxy", 1); // needed so secure cookies work behind Render's proxy

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));
  app.use(express.static(path.join(__dirname, "public")));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  let sessionStore;
  if (process.env.DATABASE_URL) {
    const pgSession = require("connect-pg-simple")(session);
    const { Pool } = require("pg");
    sessionStore = new pgSession({
      pool: new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
      }),
      createTableIfMissing: true,
    });
  }

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "travelcam-prototype-secret-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 1000 * 60 * 60 * 8, secure: isProd },
    })
  );

  // make flash-style messages available to all views
  app.use((req, res, next) => {
    res.locals.error = req.session.flashError || null;
    res.locals.success = req.session.flashSuccess || null;
    req.session.flashError = null;
    req.session.flashSuccess = null;
    res.locals.currentUser = null;
    res.locals.currentRole = null;
    next();
  });

  app.use("/", require("./routes/auth"));
  app.use("/", requireLogin, require("./routes/dashboard"));
  app.use("/leads", requireLogin, require("./routes/leads"));
  app.use("/hotels", requireLogin, require("./routes/hotels"));
  app.use("/transport", requireLogin, require("./routes/transport"));
  app.use("/activities", requireLogin, require("./routes/activities"));
  app.use("/quotations", requireLogin, require("./routes/quotations"));
  app.use("/bookings", requireLogin, require("./routes/bookings"));
  app.use("/admin", requireLogin, require("./routes/admin"));

  app.use((req, res) => {
    res.status(404).render("error", { title: "Not found", message: "That page does not exist." });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Travel CAM running at http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
