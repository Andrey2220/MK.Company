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
