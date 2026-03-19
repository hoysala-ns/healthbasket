# Health Basket — Complete Deployment Guide

## What you need before starting
- A PC with internet connection
- A Cloudflare account (free) — cloudflare.com
- A GitHub account (free) — github.com
- Node.js installed — nodejs.org (for Wrangler CLI)

---

## PART 1 — Create the D1 Database (do this FIRST)

### Step 1 — Install Wrangler
Open Command Prompt (Windows) or Terminal (Mac) and run:
```
npm install -g wrangler
```

### Step 2 — Login to Cloudflare
```
wrangler login
```
A browser window opens — click Allow.

### Step 3 — Create the database
```
wrangler d1 create healthbasket-db
```
You will see output like:
```
✅ Successfully created DB 'healthbasket-db'
[[d1_databases]]
binding = "DB"
database_name = "healthbasket-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
**Copy the database_id value.**

### Step 4 — Paste database_id into wrangler.toml
Open wrangler.toml in this folder and replace:
```
database_id = "REPLACE_WITH_YOUR_D1_DATABASE_ID"
```
With the actual ID you copied, for example:
```
database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### Step 5 — Create the database tables
Run from inside the healthbasket-deploy folder:
```
wrangler d1 execute healthbasket-db --remote --file=schema.sql
```

### Step 6 — Add the 12 default products
```
wrangler d1 execute healthbasket-db --remote --file=seed-products.sql
```

---

## PART 2 — Upload to GitHub

### Step 7 — Create a GitHub repository
1. Go to github.com and sign in
2. Click the + icon (top right) → New repository
3. Name it: healthbasket
4. Set to Public
5. Do NOT tick "Add a README file"
6. Click Create repository

### Step 8 — Upload the files
1. On the empty repo page, click "uploading an existing file"
2. Open the healthbasket-deploy folder on your PC
3. Select ALL files and folders inside it (Ctrl+A)
4. Drag them into the GitHub upload box
5. Wait for upload to finish
6. Type a commit message: "Initial upload"
7. Click Commit changes

---

## PART 3 — Deploy on Cloudflare Pages

### Step 9 — Create a Pages project
1. Go to dash.cloudflare.com
2. Left sidebar → Workers & Pages
3. Click Create → Pages → Connect to Git
4. Authorise GitHub if prompted
5. Select your healthbasket repository
6. Click Begin setup

### Step 10 — Build settings
- Framework preset: None
- Build command: (leave completely blank)
- Build output directory: (leave completely blank)
- Click Save and Deploy

Wait about 30 seconds for the first deployment to complete.

### Step 11 — Add the D1 binding
1. Go to your Pages project
2. Click Settings → Bindings
3. Click Add → D1 database
4. Variable name: DB  (must be uppercase)
5. D1 database: select healthbasket-db from the dropdown
6. Click Save

### Step 12 — Redeploy to activate the binding
1. Click the Deployments tab
2. Click the three dots next to your latest deployment
3. Click Retry deployment
4. Wait ~30 seconds

Your site is now live at: https://healthbasket.pages.dev
(or whatever name Cloudflare assigned)

---

## PART 4 — First-time Admin Setup

### Step 13 — Set your admin password
1. Open your live site URL + /admin.html
   Example: https://healthbasket.pages.dev/admin.html
2. You will see the admin login screen
3. Username: admin
4. Password: admin123
5. Go to Settings → change your username and password immediately

---

## PART 5 — Add product images (optional but recommended)

### Step 14 — Upload images to GitHub
1. Go to your GitHub repo → images folder
2. Click Add file → Upload files
3. Upload your product photos with these exact filenames:
   - toor-dal.jpg
   - moong-dal.jpg
   - masoor-dal.jpg
   - chana-dal.jpg
   - urad-dal.jpg
   - red-rice.jpg
   - sona-masoori-rice.jpg
   - foxtail-millet.jpg
   - pearl-millet-bajra.jpg
   - finger-millet-ragi.jpg
   - turmeric-powder.jpg
   - coriander-seeds.jpg
4. Commit — Cloudflare redeploys automatically

---

## PART 6 — Telegram notifications (optional)

### Step 15 — Set up Telegram bot
1. Open Telegram → search @BotFather → tap Start
2. Send /newbot → follow instructions → copy the Bot Token
3. Open @userinfobot → tap Start → copy your Chat ID (numbers only)
4. Open your live orders.html
5. Click the Telegram settings icon (top right)
6. Paste Bot Token and Chat ID → Save & verify

---

## Updating the site in future

Whenever you change any file:
1. Go to github.com → your healthbasket repo
2. Click the file you want to update → Edit (pencil icon)
3. Make changes → Commit changes
4. Cloudflare redeploys automatically in ~30 seconds

Or upload a new version of the file the same way you did in Step 8.

---

## Summary of all URLs after deployment

| Page            | URL                                      |
|-----------------|------------------------------------------|
| Shop            | https://yoursite.pages.dev/              |
| My Account      | https://yoursite.pages.dev/auth.html     |
| Order Tracking  | https://yoursite.pages.dev/track.html    |
| Admin Panel     | https://yoursite.pages.dev/admin.html    |
| Orders Dashboard| https://yoursite.pages.dev/orders.html   |

---

## If something goes wrong

**"D1 binding not found" error in functions**
→ Make sure you added the binding in Step 11 with variable name DB (uppercase)
→ Make sure you redeployed after adding the binding (Step 12)

**Admin login not working**
→ Use username: admin and password: admin123 for first login
→ The database must be set up (Steps 5-6) before login works

**Products not showing**
→ Run seed-products.sql again: wrangler d1 execute healthbasket-db --remote --file=seed-products.sql

**Telegram not working**
→ Make sure you tapped Start on your bot in Telegram before saving credentials
→ Chat ID must be numbers only from @userinfobot
