const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

const reviewsFile = path.join(__dirname, 'reviews.json');
const siteConfigFile = path.join(__dirname, 'site-config.json');
const uploadsDir = path.join(__dirname, '..', 'img', 'uploads');
const defaultGalleryItems = [
  {
    image: 'img/ремонты.jpeg',
    alt: 'Reparación de apartamentos',
    title: 'Reparación capitular de apartamentos',
    description: 'Reparación integral desde cero'
  },
  {
    image: 'img/стройка.jfif',
    alt: 'Construcción de casas',
    title: 'Construcción de cabaña',
    description: 'Construcción de casas según proyecto individual'
  },
  {
    image: 'img/Электрик.jfif',
    alt: 'Instalación eléctrica',
    title: 'Trabajos de instalación eléctrica',
    description: 'Instalación y modernización del cableado eléctrico'
  },
  {
    image: 'img/сантехник.jfif',
    alt: 'Trabajos de fontanería',
    title: 'Trabajos de fontanería',
    description: 'Instalación y reparación de sistemas de agua'
  },
  {
    image: 'img/Фасад.jfif',
    alt: 'Trabajos de fachada',
    title: 'Trabajos de fachada',
    description: 'Revestimiento y restauración de fachadas'
  },
  {
    image: 'img/Уборка.jfif',
    alt: 'Limpieza después de la reparación',
    title: 'Limpieza y acabados finales',
    description: 'Limpieza profesional después de la reparación'
  }
];

// Initialize reviews file if it doesn't exist
if (!fs.existsSync(reviewsFile)) {
  fs.writeFileSync(reviewsFile, JSON.stringify([]));
}

if (!fs.existsSync(siteConfigFile)) {
  fs.writeFileSync(siteConfigFile, JSON.stringify({ commentsEnabled: false, overrides: [], galleryItems: defaultGalleryItems }, null, 2));
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function readJsonFile(filePath, fallback) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data.replace(/^\uFEFF/, ''));
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function normalizeGalleryItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const image = typeof item.image === 'string' ? item.image.trim() : '';
      const images = Array.isArray(item.images)
        ? item.images
            .filter((img) => typeof img === 'string')
            .map((img) => img.trim())
            .filter((img) => !!img)
        : [];

      const normalizedImages = images.length ? images : (image ? [image] : []);
      const coverImage = image || normalizedImages[0] || '';

      return {
        image: coverImage,
        images: normalizedImages.length ? normalizedImages : (coverImage ? [coverImage] : []),
        alt: typeof item.alt === 'string' ? item.alt : '',
        title: typeof item.title === 'string' ? item.title : '',
        description: typeof item.description === 'string' ? item.description : ''
      };
    })
    .filter((item) => item.image);
}

function getSiteConfig() {
  const raw = readJsonFile(siteConfigFile, { commentsEnabled: false, overrides: [], galleryItems: defaultGalleryItems });
  const normalized = {
    commentsEnabled: !!raw.commentsEnabled,
    overrides: Array.isArray(raw.overrides) ? raw.overrides : [],
    galleryItems: normalizeGalleryItems(raw.galleryItems)
  };

  if (!normalized.galleryItems.length) {
    normalized.galleryItems = [...defaultGalleryItems];
  }

  return normalized;
}

const adminPassword = process.env.ADMIN_PASSWORD || 'mkcompany-admin';
const adminToken = process.env.ADMIN_TOKEN || Buffer.from(adminPassword).toString('base64url');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext && ext.length <= 5 ? ext : '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== adminToken) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
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

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== adminPassword) {
    return res.status(401).json({ ok: false, error: 'Invalid password' });
  }
  res.json({ ok: true, token: adminToken });
});

app.get('/api/public/config', (req, res) => {
  const config = getSiteConfig();
  res.json({ ok: true, commentsEnabled: !!config.commentsEnabled });
});

app.get('/api/public/overrides', (req, res) => {
  const config = getSiteConfig();
  res.json({ ok: true, overrides: Array.isArray(config.overrides) ? config.overrides : [] });
});

app.get('/api/public/gallery', (req, res) => {
  const config = getSiteConfig();
  res.json({ ok: true, galleryItems: config.galleryItems });
});

app.get('/api/admin/config', requireAdmin, (req, res) => {
  const config = getSiteConfig();
  res.json({ ok: true, config });
});

app.put('/api/admin/config', requireAdmin, (req, res) => {
  const current = getSiteConfig();
  const commentsEnabled = !!(req.body && req.body.commentsEnabled);
  const next = {
    commentsEnabled,
    overrides: Array.isArray(current.overrides) ? current.overrides : [],
    galleryItems: Array.isArray(current.galleryItems) ? current.galleryItems : [...defaultGalleryItems]
  };
  writeJsonFile(siteConfigFile, next);
  res.json({ ok: true, config: next });
});

app.put('/api/admin/overrides', requireAdmin, (req, res) => {
  const current = getSiteConfig();
  const overrides = Array.isArray(req.body && req.body.overrides)
    ? req.body.overrides
        .filter((item) => item && typeof item.selector === 'string' && typeof item.type === 'string')
        .map((item) => ({
          selector: item.selector.trim(),
          type: item.type,
          value: typeof item.value === 'string' ? item.value : ''
        }))
        .filter((item) => item.selector)
    : [];

  const next = {
    commentsEnabled: !!current.commentsEnabled,
    overrides,
    galleryItems: Array.isArray(current.galleryItems) ? current.galleryItems : [...defaultGalleryItems]
  };
  writeJsonFile(siteConfigFile, next);
  res.json({ ok: true, config: next });
});

app.put('/api/admin/gallery', requireAdmin, (req, res) => {
  const current = getSiteConfig();
  const galleryItems = normalizeGalleryItems(req.body && req.body.galleryItems);
  const next = {
    commentsEnabled: !!current.commentsEnabled,
    overrides: Array.isArray(current.overrides) ? current.overrides : [],
    galleryItems
  };
  writeJsonFile(siteConfigFile, next);
  res.json({ ok: true, config: next });
});

app.post('/api/admin/upload', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: 'Image is required' });
  }

  const publicPath = `/img/uploads/${req.file.filename}`;
  res.json({ ok: true, path: publicPath });
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
  const config = getSiteConfig();
  if (!config.commentsEnabled) {
    return res.status(403).json({ ok: false, error: 'Reviews are currently disabled' });
  }

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
      reviews = readJsonFile(reviewsFile, []);
    } catch (parseErr) {
      console.log('Reviews file corrupted or empty, reinitializing...');
      reviews = [];
      writeJsonFile(reviewsFile, reviews);
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
    writeJsonFile(reviewsFile, reviews);

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
      reviews = readJsonFile(reviewsFile, []);
    } catch (parseErr) {
      console.log('Reviews file corrupted, reinitializing...');
      reviews = [];
      writeJsonFile(reviewsFile, reviews);
    }
    res.json({ ok: true, reviews });
  } catch (err) {
    console.error('Error reading reviews:', err);
    res.status(500).json({ ok: false, error: 'Ошибка чтения отзывов' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Contact server listening on http://localhost:${PORT}`));
