const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

dotenv.config({ path: path.join(__dirname, '.env') });

const dataDir = process.env.DATA_DIR && process.env.DATA_DIR.trim()
  ? process.env.DATA_DIR.trim()
  : path.join(__dirname, 'data');

const legacyReviewsFile = path.join(__dirname, 'reviews.json');
const legacySiteConfigFile = path.join(__dirname, 'site-config.json');

const app = express();
app.use(cors());
app.use(express.json());

const uploadsDir = path.join(dataDir, 'uploads');
app.use('/img/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, '..')));

function setNoCacheHeaders(req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}

app.use('/api/public', setNoCacheHeaders);
app.use('/api/admin', setNoCacheHeaders);
app.use('/api/reviews', setNoCacheHeaders);

const reviewsFile = path.join(dataDir, 'reviews.json');
const siteConfigFile = path.join(dataDir, 'site-config.json');
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

function ensureJsonFile(targetPath, fallbackValue, legacyPath = null) {
  if (fs.existsSync(targetPath)) return;

  let seedValue = fallbackValue;

  if (legacyPath && fs.existsSync(legacyPath)) {
    try {
      const legacyRaw = fs.readFileSync(legacyPath, 'utf8');
      seedValue = JSON.parse(legacyRaw.replace(/^\uFEFF/, ''));
    } catch {
      seedValue = fallbackValue;
    }
  }

  fs.writeFileSync(targetPath, JSON.stringify(seedValue, null, 2));
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize persistent JSON files if they don't exist yet
ensureJsonFile(reviewsFile, [], legacyReviewsFile);
ensureJsonFile(siteConfigFile, { commentsEnabled: false, overrides: [], galleryItems: defaultGalleryItems }, legacySiteConfigFile);

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
  const normalizeLangMap = (value) => {
    if (!value || typeof value !== 'object') return null;
    const map = {};
    ['ru', 'en', 'es', 'uk'].forEach((lang) => {
      if (typeof value[lang] === 'string' && value[lang].trim()) {
        map[lang] = value[lang].trim();
      }
    });
    return Object.keys(map).length ? map : null;
  };

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

      const normalizedItem = {
        image: coverImage,
        images: normalizedImages.length ? normalizedImages : (coverImage ? [coverImage] : []),
        alt: typeof item.alt === 'string' ? item.alt : '',
        title: typeof item.title === 'string' ? item.title : '',
        description: typeof item.description === 'string' ? item.description : ''
      };

      const titleTranslations = normalizeLangMap(item.titleTranslations);
      const descriptionTranslations = normalizeLangMap(item.descriptionTranslations);

      if (titleTranslations) {
        normalizedItem.titleTranslations = titleTranslations;
      }

      if (descriptionTranslations) {
        normalizedItem.descriptionTranslations = descriptionTranslations;
      }

      return normalizedItem;
    })
    .filter((item) => item.image);
}

function normalizeReviews(items) {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const parsedRating = Number(item.rating);
      const rating = Number.isFinite(parsedRating)
        ? Math.min(5, Math.max(1, Math.round(parsedRating)))
        : 5;

      return {
        id: typeof item.id === 'number' ? item.id : Date.now() + Math.floor(Math.random() * 100000),
        name: typeof item.name === 'string' ? item.name.trim() : '',
        email: typeof item.email === 'string' ? item.email.trim() : '',
        rating,
        text: typeof item.text === 'string' ? item.text.trim() : '',
        avatar: typeof item.avatar === 'string' ? item.avatar.trim() : '',
        date: typeof item.date === 'string' && item.date.trim() ? item.date.trim() : new Date().toISOString()
      };
    })
    .filter((item) => item.name && item.email && item.text);
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

const fixedPhraseTranslations = {
  'reparacion capitular de apartamentos': {
    ru: 'Капитальный ремонт квартиры',
    en: 'Apartment capital renovation',
    es: 'Reparación capitular de apartamentos'
  },
  'apartment capital renovation': {
    ru: 'Капитальный ремонт квартиры',
    en: 'Apartment capital renovation',
    es: 'Reparación capitular de apartamentos'
  },
  'капитальный ремонт квартиры': {
    ru: 'Капитальный ремонт квартиры',
    en: 'Apartment capital renovation',
    es: 'Reparación capitular de apartamentos'
  },

  'construccion de cabana': {
    ru: 'Строительство коттеджа',
    en: 'Cottage construction',
    es: 'Construcción de cabaña'
  },
  'cottage construction': {
    ru: 'Строительство коттеджа',
    en: 'Cottage construction',
    es: 'Construcción de cabaña'
  },
  'строительство коттеджа': {
    ru: 'Строительство коттеджа',
    en: 'Cottage construction',
    es: 'Construcción de cabaña'
  },

  'trabajos de instalacion electrica': {
    ru: 'Электромонтажные работы',
    en: 'Electrical installation works',
    es: 'Trabajos de instalación eléctrica'
  },
  'electrical installation works': {
    ru: 'Электромонтажные работы',
    en: 'Electrical installation works',
    es: 'Trabajos de instalación eléctrica'
  },
  'электромонтажные работы': {
    ru: 'Электромонтажные работы',
    en: 'Electrical installation works',
    es: 'Trabajos de instalación eléctrica'
  },

  'trabajos de fontaneria': {
    ru: 'Сантехнические работы',
    en: 'Plumbing works',
    es: 'Trabajos de fontanería'
  },
  'plumbing works': {
    ru: 'Сантехнические работы',
    en: 'Plumbing works',
    es: 'Trabajos de fontanería'
  },
  'сантехнические работы': {
    ru: 'Сантехнические работы',
    en: 'Plumbing works',
    es: 'Trabajos de fontanería'
  },

  'trabajos de fachada': {
    ru: 'Фасадные работы',
    en: 'Facade works',
    es: 'Trabajos de fachada'
  },
  'facade works': {
    ru: 'Фасадные работы',
    en: 'Facade works',
    es: 'Trabajos de fachada'
  },
  'фасадные работы': {
    ru: 'Фасадные работы',
    en: 'Facade works',
    es: 'Trabajos de fachada'
  },

  'limpieza y acabados finales': {
    ru: 'Уборка и финальная отделка',
    en: 'Cleaning and final finishing',
    es: 'Limpieza y acabados finales'
  },
  'cleaning and final finishing': {
    ru: 'Уборка и финальная отделка',
    en: 'Cleaning and final finishing',
    es: 'Limpieza y acabados finales'
  },
  'уборка и финальная отделка': {
    ru: 'Уборка и финальная отделка',
    en: 'Cleaning and final finishing',
    es: 'Limpieza y acabados finales'
  },

  'reparacion integral desde cero': {
    ru: 'Комплексный ремонт с нуля',
    en: 'Comprehensive renovation from scratch',
    es: 'Reparación integral desde cero'
  },
  'comprehensive renovation from scratch': {
    ru: 'Комплексный ремонт с нуля',
    en: 'Comprehensive renovation from scratch',
    es: 'Reparación integral desde cero'
  },
  'комплексный ремонт с нуля': {
    ru: 'Комплексный ремонт с нуля',
    en: 'Comprehensive renovation from scratch',
    es: 'Reparación integral desde cero'
  },

  'construccion de casas segun proyecto individual': {
    ru: 'Строительство дома по индивидуальному проекту',
    en: 'House construction according to individual project',
    es: 'Construcción de casas según proyecto individual'
  },
  'house construction according to individual project': {
    ru: 'Строительство дома по индивидуальному проекту',
    en: 'House construction according to individual project',
    es: 'Construcción de casas según proyecto individual'
  },
  'строительство дома по индивидуальному проекту': {
    ru: 'Строительство дома по индивидуальному проекту',
    en: 'House construction according to individual project',
    es: 'Construcción de casas según proyecto individual'
  },

  'instalacion y modernizacion del cableado electrico': {
    ru: 'Монтаж и модернизация электропроводки',
    en: 'Installation and modernization of electrical wiring',
    es: 'Instalación y modernización del cableado eléctrico'
  },
  'installation and modernization of electrical wiring': {
    ru: 'Монтаж и модернизация электропроводки',
    en: 'Installation and modernization of electrical wiring',
    es: 'Instalación y modernización del cableado eléctrico'
  },
  'монтаж и модернизация электропроводки': {
    ru: 'Монтаж и модернизация электропроводки',
    en: 'Installation and modernization of electrical wiring',
    es: 'Instalación y modernización del cableado eléctrico'
  },

  'instalacion y reparacion de sistemas de agua': {
    ru: 'Монтаж и ремонт систем водоснабжения',
    en: 'Installation and repair of water systems',
    es: 'Instalación y reparación de sistemas de agua'
  },
  'installation and repair of water systems': {
    ru: 'Монтаж и ремонт систем водоснабжения',
    en: 'Installation and repair of water systems',
    es: 'Instalación y reparación de sistemas de agua'
  },
  'монтаж и ремонт систем водоснабжения': {
    ru: 'Монтаж и ремонт систем водоснабжения',
    en: 'Installation and repair of water systems',
    es: 'Instalación y reparación de sistemas de agua'
  },

  'revestimiento y restauracion de fachadas': {
    ru: 'Облицовка и реставрация фасадов',
    en: 'Facade cladding and restoration',
    es: 'Revestimiento y restauración de fachadas'
  },
  'facade cladding and restoration': {
    ru: 'Облицовка и реставрация фасадов',
    en: 'Facade cladding and restoration',
    es: 'Revestimiento y restauración de fachadas'
  },
  'облицовка и реставрация фасадов': {
    ru: 'Облицовка и реставрация фасадов',
    en: 'Facade cladding and restoration',
    es: 'Revestimiento y restauración de fachadas'
  },

  'limpieza profesional despues de la reparacion': {
    ru: 'Профессиональная уборка после ремонта',
    en: 'Professional cleaning after renovation',
    es: 'Limpieza profesional después de la reparación'
  },
  'professional cleaning after renovation': {
    ru: 'Профессиональная уборка после ремонта',
    en: 'Professional cleaning after renovation',
    es: 'Limpieza profesional después de la reparación'
  },
  'профессиональная уборка после ремонта': {
    ru: 'Профессиональная уборка после ремонта',
    en: 'Professional cleaning after renovation',
    es: 'Limpieza profesional después de la reparación'
  }
};

function normalizePhraseForLookup(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

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

async function translateTextViaGoogle(text, source, target) {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: source,
    tl: target,
    dt: 't',
    q: text
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`Translate HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      throw new Error('Invalid translation response');
    }

    return data[0]
      .map((chunk) => Array.isArray(chunk) ? (chunk[0] || '') : '')
      .join('')
      .trim();
  } finally {
    clearTimeout(timeout);
  }
}

app.post('/api/admin/translate', requireAdmin, async (req, res) => {
  const { text, source, targets } = req.body || {};
  const sourceLang = typeof source === 'string' ? source.toLowerCase() : 'ru';
  const textValue = typeof text === 'string' ? text.trim() : '';
  const targetLangs = Array.isArray(targets) ? targets : ['en', 'es', 'uk'];
  const allowedLangs = new Set(['ru', 'en', 'es', 'uk']);

  if (!textValue) {
    return res.status(400).json({ ok: false, error: 'Text is required' });
  }

  if (!allowedLangs.has(sourceLang)) {
    return res.status(400).json({ ok: false, error: 'Unsupported source language' });
  }

  const normalizedTargets = targetLangs
    .map((lang) => (typeof lang === 'string' ? lang.toLowerCase() : ''))
    .filter((lang) => allowedLangs.has(lang) && lang !== sourceLang);

  const translations = { [sourceLang]: textValue };

  const phraseKey = normalizePhraseForLookup(textValue);
  const fixedTranslation = fixedPhraseTranslations[phraseKey];

  if (fixedTranslation) {
    normalizedTargets.forEach((lang) => {
      translations[lang] = fixedTranslation[lang] || fixedTranslation.ru || fixedTranslation.en || textValue;
    });
    if (!translations.en) translations.en = fixedTranslation.en || textValue;
    if (!translations.es) translations.es = fixedTranslation.es || textValue;
    if (!translations.ru) translations.ru = fixedTranslation.ru || textValue;
    if (!translations.uk) translations.uk = fixedTranslation.uk || fixedTranslation.ru || textValue;
    return res.json({ ok: true, translations });
  }

  try {
    for (const targetLang of normalizedTargets) {
      const translated = await translateTextViaGoogle(textValue, sourceLang, targetLang);
      translations[targetLang] = translated || textValue;
    }
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'Translation service unavailable' });
  }

  if (!translations.en) translations.en = textValue;
  if (!translations.es) translations.es = textValue;
  if (!translations.ru) translations.ru = textValue;
  if (!translations.uk) translations.uk = textValue;

  res.json({ ok: true, translations });
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

app.get('/api/admin/reviews', requireAdmin, (req, res) => {
  const reviews = normalizeReviews(readJsonFile(reviewsFile, []));
  res.json({ ok: true, reviews });
});

app.put('/api/admin/reviews', requireAdmin, (req, res) => {
  const reviews = normalizeReviews(req.body && req.body.reviews);
  writeJsonFile(reviewsFile, reviews);
  res.json({ ok: true, reviews });
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
        .filter((item) => {
          if (!item || typeof item.type !== 'string') return false;
          const hasKey = typeof item.key === 'string' && item.key.trim();
          const hasSelector = typeof item.selector === 'string' && item.selector.trim();
          return hasKey || hasSelector;
        })
        .map((item) => {
          const safeItem = {
            type: item.type,
            value: typeof item.value === 'string' ? item.value : ''
          };

          if (typeof item.key === 'string' && item.key.trim()) {
            safeItem.key = item.key.trim();
          }

          if (typeof item.selector === 'string' && item.selector.trim()) {
            safeItem.selector = item.selector.trim();
          }

          if (item.translations && typeof item.translations === 'object') {
            const translationMap = {};
            ['ru', 'en', 'es', 'uk'].forEach((lang) => {
              if (typeof item.translations[lang] === 'string') {
                translationMap[lang] = item.translations[lang];
              }
            });

            if (Object.keys(translationMap).length) {
              safeItem.translations = translationMap;
            }
          }

          return safeItem;
        })
        .filter((item) => item.key || item.selector)
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
