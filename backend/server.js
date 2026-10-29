require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

// ──────────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────────

// CORS: Sadece izin verilen origin'e izin ver (production güvenliği)
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://140.245.7.158:5001',
      'http://140.245.7.158:5000'
    ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS politikası: Bu origin izinli değil.'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.set('trust proxy', 1);

// ──────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────
const authRoutes      = require('./routes/auth');
const examRoutes      = require('./routes/exam');
const userRoutes      = require('./routes/user');
const questionRoutes  = require('./routes/question');
const sessionRoutes   = require('./routes/session');
const logRoutes       = require('./routes/log');
const adminRoutes     = require('./routes/admin');
const protocolRoutes  = require('./routes/protocol');
const academicRoutes  = require('./routes/academic');
const biometricsRoutes = require('./routes/biometrics');

// Auth rotaları (login'in kendi rate limiter'i var)
app.use('/api/auth', authRoutes);

app.use('/api/users',      userRoutes);
app.use('/api/exams',      examRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/protocol',   protocolRoutes);
app.use('/api/academic',   academicRoutes);
app.use('/api/biometrics', biometricsRoutes);

// Sınav altındaki iç içe (nested) rotalar
app.use('/api/exams/:examId/questions', questionRoutes);
app.use('/api/exams/:examId/session',   sessionRoutes);
app.use('/api/exams/:examId/logs',      logRoutes);

// Ping endpoint — ExamRoom preflight bağlantı kontrolü için
app.get('/api/ping', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static frontend files (Single-Server deployment)
const path = require('path');
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// API routes are defined above. Any non-API request falls back to serving React SPA index.html
const fs = require('fs');
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'Uç nokta bulunamadı (404)' });
  }
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('LEUKOLION API Aktif. Frontend arayüzünü görüntülemek için lütfen derleme yapınız.');
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err.message);
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ message: err.message });
  }
  res.status(err.status || 500).json({ 
    message: err.message || 'Sunucuda beklenmeyen bir hata oluştu.' 
  });
});

app.listen(port, () => {
  console.log(`\n🚀 LEUKOLION API: http://localhost:${port}`);
});

