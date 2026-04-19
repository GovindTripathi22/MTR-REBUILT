import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import rateLimit from 'express-rate-limit';

import productsRouter from './routes/products.js';
import categoriesRouter from './routes/categories.js';
import authRouter from './routes/auth.js';
import affiliateRouter from './routes/affiliate.js';
import testimonialsRouter from './routes/testimonials.js';
import wishlistRouter from './routes/wishlist.js';
import comparisonRouter from './routes/comparison.js';
import newsletterRouter from './routes/newsletter.js';
import reviewsRouter from './routes/reviews.js';
import mediaRouter from './routes/media.js';
import adminRouter from './routes/admin.js';
import contactRouter from './routes/contact.js';
import blogRouter from './routes/blog.js';
import prisma from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure upload directory
const uploadDir = path.join(__dirname, '../public/assets/uploads');
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

// SECURITY: Hardened CORS (Restricted to Production URL if available)
const corsOptions = {
  origin: process.env.PRODUCTION_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// SECURITY: Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per `window` (here, per 15 minutes) for auth routes
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 200, 
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api/admin', apiLimiter);

// SECURITY: Formal input sanitization middleware
const sanitizeInput = (obj) => {
    if (typeof obj !== 'object' || obj === null) return;
    Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string') {
            obj[key] = obj[key].replace(/<[^>]*>?/gm, ''); // simple strip tags
        } else if (typeof obj[key] === 'object') {
            sanitizeInput(obj[key]);
        }
    });
};
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
    if (req.body) sanitizeInput(req.body);
    next();
});

app.use(express.static(path.resolve(process.cwd(), 'public'))); // ABSOLUTE ASSET SERVING

// ENHANCED: Prevent API Caching ONLY for specific data routes to save server load
app.use('/api', (req, res, next) => {
  // Only aggressively prevent caching on dynamic data routes, let static assets/media cache normally
  if (req.method === 'GET' && !req.url.includes('/media')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});
// Debug Logger
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/auth', authRouter);
app.use('/api/affiliate', affiliateRouter);
app.use('/api/testimonials', testimonialsRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/comparison', comparisonRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/media', mediaRouter);
app.use('/api/admin', adminRouter);
app.use('/api/contact', contactRouter);
app.use('/api/blog', blogRouter);

// ENHANCED: Resilient legacy compatibility route WITH Missing Category Alerts
app.get('/api/legacy/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: { select: { slug: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(products.map(p => {
      // Missing Category Alert System
      if (!p.category) {
        console.warn(`[CMS ALERT] Product missing category link: ID [${p.id}] - "${p.name}". Falling back to 'uncategorized'.`);
      }

      let keyBenefits = [];
      try { keyBenefits = JSON.parse(p.keyBenefits || '[]'); } catch(e) { keyBenefits = p.keyBenefits || []; }

      return {
        ...p,
        name: p.name,
        shortBenefit: p.shortBenefit,
        price: p.price,
        ratingValue: p.ratingValue,
        badge: p.badge,
        image: p.image,
        category: p.category ? p.category.slug : 'uncategorized',
        keyBenefits: Array.isArray(p.keyBenefits) ? p.keyBenefits : (() => { try { return JSON.parse(p.keyBenefits || '[]'); } catch(e) { return []; } })(),
        tags: Array.isArray(p.tags) ? p.tags : (() => { try { return JSON.parse(p.tags || '[]'); } catch(e) { return []; } })(),
      };
    }));
  } catch (err) {
    console.error('Legacy Products Fetch Error:', err);
    res.status(500).json([]);
  }
});

// Legacy: Themes as object keyed by slug
app.get('/api/legacy/themes', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ include: { theme: true } });
    const themes = {};
    categories.forEach(c => {
      if (c.theme) {
        themes[c.slug] = {
          primary: c.theme.primary,
          secondary: c.theme.secondary,
          title: c.theme.title,
          subtitle: c.theme.subtitle,
          seoTitle: c.theme.seoTitle,
          seoIntro: c.theme.seoIntro,
          image: c.image,
        };
      }
    });
    res.json(themes);
  } catch (err) {
    res.status(500).json({});
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'MRT International Server is healthy' });
});

// EXPLICIT ADMIN ROUTING FIX
// Serve static admin files (Support both build and dev structures)
const adminPath = existsSync(path.join(__dirname, '../dist/admin')) 
  ? path.join(__dirname, '../dist/admin') 
  : path.join(__dirname, '../admin');

app.use('/admin', express.static(adminPath));

// Ensure /admin/anything serves the admin dashboard, preventing frontend interception
app.get(/^\/admin(?:\/.*)?$/, (req, res) => {
  res.sendFile(path.join(adminPath, 'index.html'));
});

// Robust Catch-all Middleware (Path-Agnostic for Express 5 compatibility)
app.use((req, res, next) => {
  // Only serve index.html if it's not an API or Media route
  if (req.url.startsWith('/api') || req.url.includes('/assets') || req.url.startsWith('/admin')) return next();
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`[server] MRT International backend running on http://localhost:${PORT}`);
});
