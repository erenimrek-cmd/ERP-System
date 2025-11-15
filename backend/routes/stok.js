const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('./auth');

router.use(authenticateToken);

// FIFO Stok Listesi
router.get('/fifo', async (req, res) => {
  try {
    const { durum = 'Stokta' } = req.query;

    const result = await db.query(`
      SELECT fs.*, c.seri_no, c.iade_turu, c.magaza_adi, c.musteri_adi,
             EXTRACT(DAY FROM (CURRENT_TIMESTAMP - fs.giris_tarihi)) as gun_sayisi
      FROM fifo_stok fs
      JOIN cihazlar c ON fs.cihaz_id = c.id
      WHERE fs.durum = $1
      ORDER BY fs.giris_tarihi ASC
    `, [durum]);

    res.json({ stok: result.rows });
  } catch (error) {
    console.error('FIFO stok listesi hatası:', error);
    res.status(500).json({ error: 'FIFO stok listesi alınırken hata oluştu' });
  }
});

// İlk giren ilk çıkar - Cihaz çıkışı
router.post('/fifo/cikis', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { teknik_ekip, adet = 1 } = req.body;

    // En eski cihazları al (FIFO)
    const stokResult = await client.query(`
      SELECT fs.id, fs.cihaz_id, c.seri_no
      FROM fifo_stok fs
      JOIN cihazlar c ON fs.cihaz_id = c.id
      WHERE fs.durum = 'Stokta'
      ORDER BY fs.giris_tarihi ASC
      LIMIT $1
    `, [adet]);

    if (stokResult.rows.length < adet) {
      throw new Error(`Yeterli stok yok. İstenen: ${adet}, Mevcut: ${stokResult.rows.length}`);
    }

    const cikisCihazlar = [];

    for (const row of stokResult.rows) {
      // FIFO çıkış kaydı
      await client.query(`
        UPDATE fifo_stok 
        SET durum = 'Çıktı', cikis_tarihi = CURRENT_TIMESTAMP, teknik_ekip = $1
        WHERE id = $2
      `, [teknik_ekip, row.id]);

      // Log
      await client.query(
        'INSERT INTO islem_loglari (cihaz_id, kullanici_id, islem_tipi, aciklama) VALUES ($1, $2, $3, $4)',
        [row.cihaz_id, req.user.id, 'Stok Çıkışı', `${teknik_ekip} ekibine verildi (FIFO)`]
      );

      cikisCihazlar.push(row.seri_no);
    }

    await client.query('COMMIT');
    res.json({ 
      message: 'Cihazlar başarıyla çıkışı yapıldı', 
      cihazlar: cikisCihazlar,
      teknik_ekip
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('FIFO çıkış hatası:', error);
    res.status(500).json({ error: error.message || 'FIFO çıkış işlemi sırasında hata oluştu' });
  } finally {
    client.release();
  }
});

// 1 Aylık Stoktaki Cihazlar
router.get('/bir-aylik', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT bi.*, c.seri_no, c.iade_turu, c.magaza_adi,
             EXTRACT(DAY FROM (CURRENT_TIMESTAMP - bi.zimmet_tarihi)) as zimmet_gun_sayisi
      FROM bir_aylik_stok bi
      JOIN cihazlar c ON bi.cihaz_id = c.id
      ORDER BY bi.zimmet_tarihi DESC
    `);

    // 1 aydan uzun süre zimmetli olanları işaretle
    const stok = result.rows.map(item => ({
      ...item,
      gecmis_1_ay: item.zimmet_gun_sayisi > 30
    }));

    res.json({ stok });
  } catch (error) {
    console.error('1 aylık stok listesi hatası:', error);
    res.status(500).json({ error: '1 aylık stok listesi alınırken hata oluştu' });
  }
});

// 1 Aylık stoktan çıkarma
router.delete('/bir-aylik/:id', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    const result = await client.query('SELECT * FROM bir_aylik_stok WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Kayıt bulunamadı');
    }

    const stok = result.rows[0];

    // Kayıt sil
    await client.query('DELETE FROM bir_aylik_stok WHERE id = $1', [id]);

    // Stoka geri ekle
    await client.query(
      'INSERT INTO fifo_stok (cihaz_id, durum) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [stok.cihaz_id, 'Stokta']
    );

    // Log
    await client.query(
      'INSERT INTO islem_loglari (cihaz_id, kullanici_id, islem_tipi, aciklama) VALUES ($1, $2, $3, $4)',
      [stok.cihaz_id, req.user.id, '1 Aylık Stoktan Çıkarma', 'Cihaz stoka geri eklendi']
    );

    await client.query('COMMIT');
    res.json({ message: 'Cihaz 1 aylık stoktan çıkarıldı ve stoka eklendi' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('1 aylık stok çıkarma hatası:', error);
    res.status(500).json({ error: error.message || 'İşlem sırasında hata oluştu' });
  } finally {
    client.release();
  }
});

// Arızalı Stok Listesi
router.get('/arizali', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT as2.*, c.seri_no, c.iade_turu, c.magaza_adi, c.musteri_adi, c.ariza_aciklama as genel_ariza
      FROM arizali_stok as2
      JOIN cihazlar c ON as2.cihaz_id = c.id
      ORDER BY as2.kayit_tarihi DESC
    `);

    res.json({ stok: result.rows });
  } catch (error) {
    console.error('Arızalı stok listesi hatası:', error);
    res.status(500).json({ error: 'Arızalı stok listesi alınırken hata oluştu' });
  }
});

// Arızalı cihaz düzeltildi - stoka al
router.put('/arizali/:id/duzelt', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    const result = await client.query('SELECT * FROM arizali_stok WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Arızalı cihaz kaydı bulunamadı');
    }

    const cihaz = result.rows[0];

    // Arızalı stoktan çıkar
    await client.query('DELETE FROM arizali_stok WHERE id = $1', [id]);

    // Stoka ekle
    await client.query(
      'INSERT INTO fifo_stok (cihaz_id, durum) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [cihaz.cihaz_id, 'Stokta']
    );

    // Cihaz durumunu güncelle
    await client.query(
      'UPDATE cihazlar SET durum = $1 WHERE id = $2',
      ['Tamamlandı', cihaz.cihaz_id]
    );

    // Log
    await client.query(
      'INSERT INTO islem_loglari (cihaz_id, kullanici_id, islem_tipi, aciklama) VALUES ($1, $2, $3, $4)',
      [cihaz.cihaz_id, req.user.id, 'Arıza Düzeltme', 'Arızalı cihaz düzeltildi ve stoka eklendi']
    );

    await client.query('COMMIT');
    res.json({ message: 'Arızalı cihaz düzeltildi ve stoka eklendi' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Arıza düzeltme hatası:', error);
    res.status(500).json({ error: error.message || 'İşlem sırasında hata oluştu' });
  } finally {
    client.release();
  }
});

// Stok özeti (Dashboard için)
router.get('/ozet', async (req, res) => {
  try {
    const [fifoCount, birAylikCount, arizaliCount, toplamCihaz] = await Promise.all([
      db.query('SELECT COUNT(*) FROM fifo_stok WHERE durum = $1', ['Stokta']),
      db.query('SELECT COUNT(*) FROM bir_aylik_stok'),
      db.query('SELECT COUNT(*) FROM arizali_stok'),
      db.query('SELECT COUNT(*) FROM cihazlar')
    ]);

    // Son 7 günlük giriş/çıkış
    const hareketResult = await db.query(`
      SELECT 
        DATE(olusturma_tarihi) as tarih,
        COUNT(*) as giris_sayisi
      FROM cihazlar
      WHERE olusturma_tarihi >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(olusturma_tarihi)
      ORDER BY tarih DESC
    `);

    const cikisResult = await db.query(`
      SELECT 
        DATE(cikis_tarihi) as tarih,
        COUNT(*) as cikis_sayisi
      FROM fifo_stok
      WHERE cikis_tarihi >= CURRENT_DATE - INTERVAL '7 days' AND durum = 'Çıktı'
      GROUP BY DATE(cikis_tarihi)
      ORDER BY tarih DESC
    `);

    res.json({
      ozet: {
        fifo_stok: parseInt(fifoCount.rows[0].count),
        bir_aylik_stok: parseInt(birAylikCount.rows[0].count),
        arizali_stok: parseInt(arizaliCount.rows[0].count),
        toplam_cihaz: parseInt(toplamCihaz.rows[0].count)
      },
      hareketler: {
        girisler: hareketResult.rows,
        cikislar: cikisResult.rows
      }
    });

  } catch (error) {
    console.error('Stok özeti hatası:', error);
    res.status(500).json({ error: 'Stok özeti alınırken hata oluştu' });
  }
});

module.exports = router;