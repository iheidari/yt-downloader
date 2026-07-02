const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('node:path');
const fs = require('node:fs');

const infoRoutes = require('./routes/info');
const downloadRoutes = require('./routes/download');
const filesRoutes = require('./routes/files');
const { startCleanupScheduler } = require('./services/cleanup');
const { downloadsDir } = require('./utils/storage');
const { rateLimit } = require('./utils/rateLimit');

const app = express();
const PORT = process.env.PORT || 3001;

// Use helmet with a scoped CSP. It can't be fully locked down — the Tailwind
// Play CDN JIT-compiles with `new Function` (needs unsafe-eval) and the inline
// tailwind.config block needs unsafe-inline — but it still restricts where the
// app can connect/embed, which is real defense-in-depth for reflected content.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.tailwindcss.com'],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.tailwindcss.com',
          'https://fonts.googleapis.com',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
        mediaSrc: ["'self'", 'blob:', 'data:'],
        connectSrc: ["'self'"],
        workerSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin resource sharing
    crossOriginEmbedderPolicy: false, // Allow embedding media
  }),
);

// Configure CORS - allow same-origin requests and configured FRONTEND_URL.
// No cookies/Authorization are used, so credentials stay off (enabling them
// alongside a reflected origin is a needless risk).
const corsOrigin = process.env.FRONTEND_URL || false; // false = allow same-origin only

app.use(
  cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Range'],
    exposedHeaders: ['Content-Range', 'Content-Length', 'Accept-Ranges'],
  }),
);

app.use(morgan('dev'));
app.use(express.json());

if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Throttle the endpoints that each shell out to yt-dlp. Generous limits: this
// is a personal app, so the goal is only to cap runaway abuse, not normal use.
app.use('/api/info', rateLimit({ windowMs: 60_000, max: 30 }), infoRoutes);
app.use('/api/download', rateLimit({ windowMs: 60_000, max: 40 }), downloadRoutes);
app.use('/api/files', filesRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^\/(?!api\/|health$).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

startCleanupScheduler();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Downloads directory: ${downloadsDir}`);
});

module.exports = app;
