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
  if (!name || !email) return res.status(400).json({ ok: false, error: 'Имя и email обязательны' });

  const to = process.env.TO_EMAIL || process.env.SMTP_USER;
  const subject = `Заявка с сайта MK.COMPANY — ${category || 'Без категории'}`;
  const text = `Имя: ${name}\nEmail: ${email}\nТелефон: ${phone || ''}\nКатегория: ${category || ''}\nБюджет: ${budget || 'не указан'}\n\nСообщение:\n${message || ''}`;

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
    res.status(500).json({ ok: false, error: 'Ошибка отправки письма' });
  }
});

app.post('/api/reviews', async (req, res) => {
  const { name, email, rating, text } = req.body || {};
  if (!name || !email || !rating || !text) {
    return res.status(400).json({ ok: false, error: 'Все поля обязательны' });
  }

  const to = process.env.TO_EMAIL || process.env.SMTP_USER;
  const subject = `Новый отзыв на сайте MK.COMPANY — ${rating}★`;
  const mailText = `Новый отзыв:\n\nИмя: ${name}\nEmail: ${email}\nРейтинг: ${rating}/5\n\nТекст отзыва:\n${text}`;

  try {
    // Save review to JSON file
    const reviews = JSON.parse(fs.readFileSync(reviewsFile, 'utf8'));
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
    res.status(500).json({ ok: false, error: 'Ошибка отправки отзыва' });
  }
});

app.get('/api/reviews', (req, res) => {
  try {
    const reviews = JSON.parse(fs.readFileSync(reviewsFile, 'utf8'));
    res.json({ ok: true, reviews });
  } catch (err) {
    console.error('Error reading reviews:', err);
    res.status(500).json({ ok: false, error: 'Ошибка чтения отзывов' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Contact server listening on http://localhost:${PORT}`));
