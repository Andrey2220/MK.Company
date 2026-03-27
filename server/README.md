# MK.COMPANY — Contact server

Simple Node.js server that accepts POST /api/contact and forwards the data via SMTP (Nodemailer).

Setup
1. Copy `.env.example` to `.env` and fill SMTP credentials.

2. Install dependencies and start:

```bash
cd server
npm install
npm start
```

3. By default server listens on port from `.env` `PORT` or `3000`.

Front-end
- Ensure front-end pages are opened from a static server (recommended) or allow CORS requests to `http://localhost:3000`.
- The contact form in the front-end posts JSON to `http://localhost:3000/api/contact` (implemented in `js/main.js`).

Security notes
- Keep SMTP credentials secret. Do not commit `.env` to git.

Render persistence (important)
- Render Web Service has an ephemeral filesystem by default. Uploaded images and admin edits can disappear after redeploy/restart.
- Add a Persistent Disk in Render and set env var `DATA_DIR` to the mounted path (for example `/var/data/mk-company`).
- The server stores these files inside `DATA_DIR`:
	- `reviews.json`
	- `site-config.json`
	- uploaded images in `uploads/` (served as `/img/uploads/...`).
