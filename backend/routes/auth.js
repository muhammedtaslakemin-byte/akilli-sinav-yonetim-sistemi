const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

// Giriş için rate limiter (10 dk, max 50 deneme)
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => `${req.ip}_${req.body?.email || ''}`,
  validate: false,
  message: { message: "Çok fazla giriş denemesi yaptınız. Lütfen 10 dakika sonra tekrar deneyin." }
});

// Kod doğrulama (Brute-force koruması: 10 dk, max 15 deneme)
const verifyCodeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  keyGenerator: (req) => `${req.ip}_${req.body?.email || req.query?.token || ''}`,
  validate: false,
  message: { message: "Çok fazla kod doğrulama denemesi yaptınız. Lütfen 10 dakika sonra tekrar deneyin." }
});

// MERNİS ve SMS/Mail gönderim koruması (15 dk, max 10 istek)
const mernisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Çok fazla kimlik doğrulama isteği gönderdiniz. Lütfen 15 dakika sonra tekrar deneyin." }
});

// Kayıt olma koruması (1 saat, IP başına max 10 kayıt)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: "Kısa sürede çok fazla hesap oluşturma denemesi yapıldı. Lütfen daha sonra deneyin." }
});

router.post('/login', loginLimiter, authController.login);
router.post('/register', registerLimiter, authController.register);
router.post('/verify-tc', mernisLimiter, authController.verifyTc);
router.post('/forgot-password', mernisLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-code', verifyCodeLimiter, authController.verifyCode);
router.get('/activate', verifyCodeLimiter, authController.activateByToken);
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
