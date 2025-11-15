const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

// Login
router.post('/login', [
  body('kullanici_adi').trim().notEmpty(),
  body('sifre').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { kullanici_adi, sifre } = req.body;

    const result = await db.query(
      'SELECT * FROM kullanicilar WHERE kullanici_adi = $1 AND aktif = true',
      [kullanici_adi]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(sifre, user.sifre_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    }

    const token = jwt.sign(
      { id: user.id, kullanici_adi: user.kullanici_adi, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        kullanici_adi: user.kullanici_adi,
        ad_soyad: user.ad_soyad,
        rol: user.rol
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Giriş yapılırken hata oluştu' });
  }
});

// Register (sadece admin)
router.post('/register', [
  body('kullanici_adi').trim().isLength({ min: 3 }),
  body('sifre').isLength({ min: 6 }),
  body('ad_soyad').trim().notEmpty(),
  body('rol').isIn(['Admin', 'Depo', 'Teknik'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { kullanici_adi, sifre, ad_soyad, rol } = req.body;

    const hashedPassword = await bcrypt.hash(sifre, 10);

    const result = await db.query(
      'INSERT INTO kullanicilar (kullanici_adi, sifre_hash, ad_soyad, rol) VALUES ($1, $2, $3, $4) RETURNING id, kullanici_adi, ad_soyad, rol',
      [kullanici_adi, hashedPassword, ad_soyad, rol]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Kayıt olurken hata oluştu' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, kullanici_adi, ad_soyad, rol FROM kullanicilar WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Kullanıcı bilgileri alınırken hata oluştu' });
  }
});

// Middleware: JWT doğrulama
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token gerekli' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Geçersiz token' });
    }
    req.user = user;
    next();
  });
}

module.exports = router;
module.exports.authenticateToken = authenticateToken;