// Data store. Locally (no DATABASE_URL) this is a JSON file — zero setup,
// just Node.js needed. In production (DATABASE_URL set, e.g. on Render) the
// whole data object is persisted as a single JSONB blob in Postgres instead,
// so data survives deploys/restarts on hosts with an ephemeral filesystem.
// Either way the in-memory `db` object and the all/find/where/insert/... API
// below are unchanged, so no route or business-logic code needs to know
// which backend is active.

const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "..", "data", "db.json");

const DATABASE_URL = process.env.DATABASE_URL;
let pool = null;
if (DATABASE_URL) {
  const { Pool } = require("pg");
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
  });
}

function defaultData() {
  return {
    nextId: 1,
    roles: [
      { id: 1, name: "Super Admin" },
      { id: 2, name: "Director" },
      { id: 3, name: "Sales Manager" },
      { id: 4, name: "Sales Executive" },
      { id: 5, name: "Operations Manager" },
      { id: 6, name: "Operations Executive" },
      { id: 7, name: "Accounts" },
      { id: 8, name: "Contracting Team" },
      { id: 9, name: "Product Team" },
      { id: 10, name: "Guest Support" },
    ],
    meal_plans: [
      { code: "CP", description: "Continental Plan (Breakfast only)" },
      { code: "MAP", description: "Modified American Plan (Breakfast + 1 meal)" },
      { code: "AP", description: "American Plan (All meals)" },
      { code: "AI", description: "All Inclusive" },
    ],
    users: [],
    leads: [],
    lead_notes: [],
    hotels: [],
    room_categories: [],
    hotel_contracts: [],
    hotel_contract_seasons: [],
    hotel_rates: [],
    quotations: [],
    quotation_items: [],
    bookings: [],
    booking_components: [],
    customer_payments: [],
    transport_routes: [],
    activities: [],
  };
}

let db = null;

// Must be awaited once at startup (see server.js). After that, `db` is
// populated and every function below reads/writes it synchronously.
async function load() {
  if (db) return db;
  if (pool) {
    await pool.query(
      "CREATE TABLE IF NOT EXISTS app_data (id INT PRIMARY KEY, data JSONB NOT NULL)"
    );
    const res = await pool.query("SELECT data FROM app_data WHERE id = 1");
    db = res.rows.length ? res.rows[0].data : defaultData();
    if (!res.rows.length) {
      await pool.query("INSERT INTO app_data (id, data) VALUES (1, $1)", [JSON.stringify(db)]);
    }
  } else if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } else {
    db = defaultData();
    save();
  }
  // Backfill any collections added after this database was first created.
  const defaults = defaultData();
  let changed = false;
  for (const key of Object.keys(defaults)) {
    if (!(key in db)) {
      db[key] = defaults[key];
      changed = true;
    }
  }
  if (changed) save();
  return db;
}

// Fire-and-forget persist of the whole in-memory db. Safe for a single-
// instance deployment (small team, one Render service) — not for multiple
// instances writing concurrently.
function save() {
  if (pool) {
    pool
      .query("UPDATE app_data SET data = $1 WHERE id = 1", [JSON.stringify(db)])
      .catch((err) => console.error("Failed to persist to database:", err));
  } else {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }
}

function nextId() {
  const id = db.nextId;
  db.nextId += 1;
  return id;
}

function all(table) {
  load();
  return db[table];
}

function find(table, id) {
  load();
  return db[table].find((r) => r.id === Number(id));
}

function where(table, predicate) {
  load();
  return db[table].filter(predicate);
}

function insert(table, record) {
  load();
  const id = nextId();
  const row = { id, ...record };
  db[table].push(row);
  save();
  return row;
}

function update(table, id, patch) {
  load();
  const row = find(table, id);
  if (!row) return null;
  Object.assign(row, patch);
  save();
  return row;
}

function remove(table, id) {
  load();
  db[table] = db[table].filter((r) => r.id !== Number(id));
  save();
}

function roleName(roleId) {
  const r = find("roles", roleId);
  return r ? r.name : "Unknown";
}

module.exports = { load, save, all, find, where, insert, update, remove, roleName };
