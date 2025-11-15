# ERP Sistemi - Tum Dosyalari Otomatik Olustur
# Kullanim: Sag tik > "Run with PowerShell"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ERP Sistemi - Otomatik Kurulum" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Klasorleri olustur
Write-Host "Klasorler olusturuluyor..." -ForegroundColor Yellow
$folders = @(
    "backend", "backend/config", "backend/routes",
    "frontend", "frontend/public", "frontend/src",
    "frontend/src/components", "frontend/src/pages", "frontend/src/services",
    "nginx", "nginx/conf.d", "ssl"
)
foreach ($folder in $folders) {
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
}

# docker-compose.yml
Write-Host "docker-compose.yml olusturuluyor..." -ForegroundColor Green
@"
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: erp_postgres
    environment:
      POSTGRES_DB: erp_db
      POSTGRES_USER: erp_user
      POSTGRES_PASSWORD: erp_pass_2024
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - erp_network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: erp_redis
    ports:
      - "6379:6379"
    networks:
      - erp_network
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: erp_backend
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: erp_db
      DB_USER: erp_user
      DB_PASSWORD: erp_pass_2024
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: change_this_secret_123
      PORT: 3000
    depends_on:
      - postgres
      - redis
    ports:
      - "3000:3000"
    networks:
      - erp_network
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: erp_frontend
    depends_on:
      - backend
    networks:
      - erp_network

  nginx:
    image: nginx:alpine
    container_name: erp_nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - backend
      - frontend
    networks:
      - erp_network

volumes:
  postgres_data:

networks:
  erp_network:
    driver: bridge
"@ | Out-File -FilePath "docker-compose.yml" -Encoding UTF8

# init.sql
Write-Host "init.sql olusturuluyor..." -ForegroundColor Green
@"
CREATE TABLE cihazlar (
    id SERIAL PRIMARY KEY,
    seri_no VARCHAR(100) UNIQUE NOT NULL,
    iade_turu VARCHAR(50) NOT NULL,
    magaza_adi VARCHAR(200),
    musteri_adi VARCHAR(200),
    ariza_aciklama TEXT,
    durum VARCHAR(50) DEFAULT 'Beklemede',
    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE kullanicilar (
    id SERIAL PRIMARY KEY,
    kullanici_adi VARCHAR(100) UNIQUE NOT NULL,
    sifre_hash VARCHAR(255) NOT NULL,
    ad_soyad VARCHAR(200) NOT NULL,
    rol VARCHAR(50) NOT NULL
);

CREATE TABLE fifo_stok (
    id SERIAL PRIMARY KEY,
    cihaz_id INTEGER REFERENCES cihazlar(id),
    giris_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    durum VARCHAR(50) DEFAULT 'Stokta'
);

INSERT INTO kullanicilar (kullanici_adi, sifre_hash, ad_soyad, rol) 
VALUES ('admin', '`$2a`$10`$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Admin');
"@ | Out-File -FilePath "init.sql" -Encoding UTF8

# backend/Dockerfile
Write-Host "backend/Dockerfile olusturuluyor..." -ForegroundColor Green
@"
FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
"@ | Out-File -FilePath "backend/Dockerfile" -Encoding UTF8

# backend/package.json
@"
{
  "name": "erp-backend",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  }
}
"@ | Out-File -FilePath "backend/package.json" -Encoding UTF8

# backend/server.js
@"
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
      'INSERT INTO cihazlar (seri_no, iade_turu, magaza_adi) VALUES (`$1, `$2, `$3) RETURNING *',
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
"@ | Out-File -FilePath "backend/server.js" -Encoding UTF8

# frontend/Dockerfile
Write-Host "frontend/Dockerfile olusturuluyor..." -ForegroundColor Green
@"
FROM node:18-alpine as build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
"@ | Out-File -FilePath "frontend/Dockerfile" -Encoding UTF8

# frontend/package.json
@"
{
  "name": "erp-frontend",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "axios": "^1.6.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  },
  "browserslist": {
    "production": [">0.2%", "not dead"],
    "development": ["last 1 chrome version"]
  }
}
"@ | Out-File -FilePath "frontend/package.json" -Encoding UTF8

# frontend/public/index.html
@"
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ERP Cihaz Deposu</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>
"@ | Out-File -FilePath "frontend/public/index.html" -Encoding UTF8

# frontend/src/index.js
@"
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
"@ | Out-File -FilePath "frontend/src/index.js" -Encoding UTF8

# frontend/src/App.js
@"
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [cihazlar, setCihazlar] = useState([]);
  const [form, setForm] = useState({ seri_no: '', iade_turu: 'Magaza', magaza_adi: '' });

  useEffect(() => {
    loadCihazlar();
  }, []);

  const loadCihazlar = async () => {
    try {
      const res = await axios.get('/api/cihazlar');
      setCihazlar(res.data);
    } catch (error) {
      console.error('Hata:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/cihazlar', form);
      setForm({ seri_no: '', iade_turu: 'Magaza', magaza_adi: '' });
      loadCihazlar();
      alert('Cihaz eklendi!');
    } catch (error) {
      alert('Hata: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>ERP Cihaz Deposu Sistemi</h1>
      
      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2>Yeni Cihaz Ekle</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '10px' }}>
            <label>Seri No: </label>
            <input 
              type="text" 
              value={form.seri_no} 
              onChange={(e) => setForm({...form, seri_no: e.target.value})}
              required 
              style={{ padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Iade Turu: </label>
            <select 
              value={form.iade_turu} 
              onChange={(e) => setForm({...form, iade_turu: e.target.value})}
              style={{ padding: '5px' }}
            >
              <option value="Magaza">Magaza</option>
              <option value="Teknik Ekip">Teknik Ekip</option>
            </select>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Magaza Adi: </label>
            <input 
              type="text" 
              value={form.magaza_adi} 
              onChange={(e) => setForm({...form, magaza_adi: e.target.value})}
              style={{ padding: '5px' }}
            />
          </div>
          <button type="submit" style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
            Ekle
          </button>
        </form>
      </div>

      <h2>Cihaz Listesi</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#007bff', color: 'white' }}>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>ID</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Seri No</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Iade Turu</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Magaza</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Durum</th>
          </tr>
        </thead>
        <tbody>
          {cihazlar.map(cihaz => (
            <tr key={cihaz.id}>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{cihaz.id}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{cihaz.seri_no}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{cihaz.iade_turu}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{cihaz.magaza_adi || '-'}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{cihaz.durum}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
"@ | Out-File -FilePath "frontend/src/App.js" -Encoding UTF8

# nginx/nginx.conf
Write-Host "nginx/nginx.conf olusturuluyor..." -ForegroundColor Green
@"
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    include /etc/nginx/conf.d/*.conf;
}
"@ | Out-File -FilePath "nginx/nginx.conf" -Encoding UTF8

# nginx/conf.d/default.conf
@"
upstream backend {
    server backend:3000;
}

upstream frontend {
    server frontend:80;
}

server {
    listen 80;
    
    location /api/ {
        proxy_pass http://backend/api/;
        proxy_set_header Host `$host;
    }
    
    location / {
        proxy_pass http://frontend/;
        proxy_set_header Host `$host;
    }
}
"@ | Out-File -FilePath "nginx/conf.d/default.conf" -Encoding UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  BASARILI! TUM DOSYALAR OLUSTURULDU!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Simdi su komutu calistirin:" -ForegroundColor Yellow
Write-Host "  docker-compose up -d --build" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tarayicida acin:" -ForegroundColor Yellow
Write-Host "  http://localhost" -ForegroundColor Cyan
Write-Host ""
Read-Host "Devam etmek icin Enter'a basin"
