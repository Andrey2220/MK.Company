const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Contact server listening on http://localhost:${PORT}`));
