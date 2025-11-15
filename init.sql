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
VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Admin');
