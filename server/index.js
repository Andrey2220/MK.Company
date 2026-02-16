const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

const reviewsFile = path.join(__dirname, 'reviews.json');

// Initialize reviews file if it doesn't exist
if (!fs.existsSync(reviewsFile)) {
  fs.writeFileSync(reviewsFile, JSON.stringify([]));
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

app.post('/api/contact', async (req, res) => {
  const { name, email, phone, category, budget, message } = req.body || {};
  if (!name || !email) return res.status(400).json({ ok: false, error: 'El nombre y correo electrónico son obligatorios' });

  const to = process.env.TO_EMAIL || process.env.SMTP_USER;
  const subject = `Solicitud del sitio web MK.COMPANY — ${category || 'Sin categoría'}`;
  const text = `Nombre: ${name}\nCorreo: ${email}\nTeléfono: ${phone || ''}\nCategoría: ${category || ''}\nPresupuesto: ${budget || 'no especificado'}\n\nMensaje:\n${message || ''}`;

  try {
    await transporter.sendMail({
      from: `MK.COMPANY <${process.env.SMTP_USER}>`,
      to,
      subject,
      text
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err && err.message ? err.message : err);
    res.status(500).json({ ok: false, error: 'Error al enviar el correo' });
  }
});

app.post('/api/reviews', async (req, res) => {
  const { name, email, rating, text } = req.body || {};
  if (!name || !email || !rating || !text) {
    return res.status(400).json({ ok: false, error: 'Todos los campos son obligatorios' });
  }

  const to = process.env.TO_EMAIL || process.env.SMTP_USER;
  const subject = `Nueva reseña en el sitio web MK.COMPANY — ${rating}★`;
  const mailText = `Nueva reseña:\n\nNombre: ${name}\nCorreo: ${email}\nCalificación: ${rating}/5\n\nTexto de la reseña:\n${text}`;

  try {
    // Save review to JSON file
    let reviews = [];
    try {
      const data = fs.readFileSync(reviewsFile, 'utf8');
      reviews = JSON.parse(data.replace(/^\uFEFF/, '')); // Remove BOM if present
    } catch (parseErr) {
      console.log('Reviews file corrupted or empty, reinitializing...');
      reviews = [];
      fs.writeFileSync(reviewsFile, JSON.stringify(reviews));
    }
    
    const newReview = {
      id: Date.now(),
      name,
      email,
      rating,
      text,
      date: new Date().toISOString()
    };
    reviews.push(newReview);
    fs.writeFileSync(reviewsFile, JSON.stringify(reviews, null, 2));

    // Send email notification
    await transporter.sendMail({
      from: `MK.COMPANY <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: mailText
    });
    
    res.json({ ok: true });
  } catch (err) {
    console.error('Review error:', err && err.message ? err.message : err);
    res.status(500).json({ ok: false, error: 'Error al enviar la reseña' });
  }
});

app.get('/api/reviews', (req, res) => {
  try {
    let reviews = [];
    try {
      const data = fs.readFileSync(reviewsFile, 'utf8');
      reviews = JSON.parse(data.replace(/^\uFEFF/, '')); // Remove BOM if present
    } catch (parseErr) {
      console.log('Reviews file corrupted, reinitializing...');
      reviews = [];
      fs.writeFileSync(reviewsFile, JSON.stringify(reviews));
    }
    res.json({ ok: true, reviews });
  } catch (err) {
    console.error('Error reading reviews:', err);
    res.status(500).json({ ok: false, error: 'Ошибка чтения отзывов' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Contact server listening on http://localhost:${PORT}`));
