# Travel CAM — Working Prototype

A real, working web application for Digital Travel Cart Pvt Ltd, built from the
Travel CAM blueprint. It has a real multi-user login, role-based permissions,
and a working core workflow: **Leads → Quotation Builder (live costing from
contracted hotel rates) → Booking → Confirmations → Payments**.

This is the "core sales-to-booking spine" module set (Login/RBAC, Dashboard,
Leads/CRM, Hotel Contract & Rate Engine, Quotation Builder, Booking Management,
Admin/User Management). Vouchers, GST invoicing, full accounting ledgers, and
the other modules from the full blueprint are not built yet — see
"What's next" below.

## How to run it

You need [Node.js](https://nodejs.org) installed (version 18 or newer — the
free "LTS" download from nodejs.org is fine). No database server, no PHP, no
build step — everything else is included.

1. Open a terminal / command prompt in this folder.
2. Install dependencies (one-time):
   ```
   npm install
   ```
3. Start the app:
   ```
   npm start
   ```
4. Open your browser to **http://localhost:3000**

The very first time you start it, it creates one login for you:

```
Email:    admin@digitaltravelcart.com
Password: admin123
```

Log in with that, then go to **Admin: Users** in the top menu to create real
accounts for your team — each person gets their own email/password and a role
(Director, Sales Manager, Sales Executive, Operations Manager, Operations
Executive, Accounts, Contracting Team, Product Team, Guest Support, or Super
Admin). Everyone logs in with their own account at the same URL; what they can
see and edit is controlled by their role, enforced on the server (not just
hidden buttons).

**Change the default admin password** the first time you log in for real use
(there's no self-service password-change screen yet in this prototype — for
now, ask a Super Admin/Director to update it via Admin > Users, or edit
`data/db.json` directly).

## How your data is stored

All data (users, leads, hotels, contracts, rates, quotations, bookings,
payments) lives in a single file: `data/db.json`. It's created automatically
the first time you run the app. Back it up like any important file (copy it
somewhere safe periodically) — there's no separate database server to manage.

This is intentional for a first working version: it needs zero setup beyond
installing Node.js. It's not built for many people hitting it at the exact
same second (no file-locking), which is fine for a small team testing the
workflow, but should be swapped for a real database (PostgreSQL, per the full
blueprint's schema) before heavier day-to-day production use.

## Suggested first walkthrough

1. Log in as admin → **Admin: Users** → create a Sales Executive and a
   Contracting Team user for your team.
2. Log in as the Contracting Team user → **Hotel Contracts** → add a hotel →
   add a room category → add a contract (validity dates) → add a season →
   add a rate (room + meal plan + price).
3. Log in as the Sales Executive → **Leads / CRM** → add a lead → open it →
   **+ Create Quotation**.
4. In the Quotation Builder, add the hotel you just contracted (it pulls the
   real rate automatically for the dates you enter), add a manual line item
   for transport, set your markup %, and watch the sell price/GST/margin
   calculate live.
5. **Convert to Booking** → go to **Bookings**, confirm each component, and
   record a customer payment to see the outstanding balance update.

## What's next (from the full blueprint)

This prototype proves the core engine works end to end. The full blueprint
(`Travel_CAM_Blueprint.docx` from our design phase) covers 25 sections and 18
modules — vouchers, GST invoicing/numbering, full accounting ledgers & credit
limits, margin analytics rollups & the 10-report suite, transport/activity
contracting, document management, multi-channel notifications, bulk Excel
rate upload, and more. Building those out, plus moving from the JSON file to
PostgreSQL and hardening this for real multi-user production traffic, is the
natural next phase — happy to keep building whichever module matters most to
you first.

## Deploying so your team can reach it at a URL

Locally this app stores everything in `data/db.json`. For a shared team URL
you want a real always-on host plus a database that survives restarts and
deploys - the app already supports both automatically:

- If a `DATABASE_URL` environment variable is set, it stores data in that
  Postgres database instead of the JSON file, and stores login sessions
  there too (so people stay logged in across restarts).
- If `DATABASE_URL` is not set, it falls back to `data/db.json` exactly as
  before - nothing changes for local use.

The repo includes `render.yaml`, a one-click "Blueprint" for
[Render](https://render.com) that provisions both the web app and a free
Postgres database, wired together automatically:

1. Push this folder to a new GitHub repository (private is fine).
2. Sign up / log in at [render.com](https://render.com) (free).
3. Click **New > Blueprint**, connect your GitHub account, and select this
   repo. Render reads `render.yaml` and creates:
   - a **Web Service** running `npm install` / `npm start`
   - a **free Postgres database**, automatically linked via `DATABASE_URL`
   - a random `SESSION_SECRET`
4. Click **Apply** / **Deploy**. After the first build finishes (a couple of
   minutes), Render gives you a URL like
   `https://travelcam-xxxx.onrender.com` - that's the link to share with
   your team. Everyone logs in there with their own account, same as
   localhost.
5. Log in with the default admin (`admin@digitaltravelcart.com` /
   `admin123` - created fresh on first boot since the new database starts
   empty), then go to **Admin: Users** to create real accounts for your
   team and change the default password.

Notes:
- The free Render plan spins the service down after 15 minutes of no
  traffic and takes 30-60 seconds to wake back up on the next request -
  data isn't lost (it's in Postgres), it just takes a moment to respond
  after being idle. Upgrade to a paid instance later if you want it always
  warm.
- Back up the Postgres database periodically. The free-tier Postgres
  database on Render expires after 90 days unless upgraded to a paid plan -
  worth knowing before relying on it long-term.
