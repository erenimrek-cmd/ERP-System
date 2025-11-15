const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: 5432,
  database: process.env.DB_NAME || 'erp_db',
  user: process.env.DB_USER || 'erp_user',
  password: process.env.DB_PASSWORD || 'erp_pass_2024'
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.get('/api/cihazlar', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cihazlar ORDER BY id DESC LIMIT 10');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cihazlar', async (req, res) => {
  try {
    const { seri_no, iade_turu, magaza_adi } = req.body;
    const result = await pool.query(
      'INSERT INTO cihazlar (seri_no, iade_turu, magaza_adi) VALUES ($1, $2, $3) RETURNING *',
      [seri_no, iade_turu, magaza_adi]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
