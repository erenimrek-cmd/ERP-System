import React, { useState, useEffect } from 'react';
import { cihazAPI } from '../services/api';

function CihazListesi() {
  const [cihazlar, setCihazlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    durum: '',
    iade_turu: '',
    seri_no: ''
  });

  useEffect(() => {
    loadCihazlar();
  }, [page, filters]);

  const loadCihazlar = async () => {
    try {
      setLoading(true);
      const response = await cihazAPI.getAll({ page, ...filters });
      setCihazlar(response.data.cihazlar);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Cihaz listesi yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1);
  };

  const getDurumBadge = (durum) => {
    const classes = {
      'Beklemede': 'badge-warning',
      'İşlemde': 'badge-info',
      'Tamamlandı': 'badge-success'
    };
    return <span className={`badge ${classes[durum]}`}>{durum}</span>;
  };

  if (loading && page === 1) {
    return <div className="loading">Yükleniyor...</div>;
  }

  return (
    <div>
      <h1 className="page-title">Cihaz Listesi</h1>

      {/* Filtreler */}
      <div className="card mb-20">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div className="form-group">
            <label>Seri No</label>
            <input
              type="text"
              name="seri_no"
              className="form-control"
              placeholder="Ara..."
              value={filters.seri_no}
              onChange={handleFilterChange}
            />
          </div>
          <div className="form-group">
            <label>Durum</label>
            <select name="durum" className="form-control" value={filters.durum} onChange={handleFilterChange}>
              <option value="">Tümü</option>
              <option value="Beklemede">Beklemede</option>
              <option value="İşlemde">İşlemde</option>
              <option value="Tamamlandı">Tamamlandı</option>
            </select>
          </div>
          <div className="form-group">
            <label>İade Türü</label>
            <select name="iade_turu" className="form-control" value={filters.iade_turu} onChange={handleFilterChange}>
              <option value="">Tümü</option>
              <option value="Magaza">Mağaza</option>
              <option value="Teknik Ekip">Teknik Ekip</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tablo */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Seri No</th>
              <th>İade Türü</th>
              <th>Mağaza/Müşteri</th>
              <th>Durum</th>
              <th>Oluşturma Tarihi</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {cihazlar.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center">Kayıt bulunamadı</td>
              </tr>
            ) : (
              cihazlar.map((cihaz) => (
                <tr key={cihaz.id}>
                  <td><strong>{cihaz.seri_no}</strong></td>
                  <td>{cihaz.iade_turu}</td>
                  <td>{cihaz.magaza_adi || cihaz.musteri_adi || '-'}</td>
                  <td>{getDurumBadge(cihaz.durum)}</td>
                  <td>{new Date(cihaz.olusturma_tarihi).toLocaleDateString('tr-TR')}</td>
                  <td>
                    <button className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '12px' }}>
                      Detay
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Sayfalama */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Önceki
            </button>
            <span style={{ padding: '10px' }}>Sayfa {page} / {totalPages}</span>
            <button
              className="btn btn-secondary"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Sonraki
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CihazListesi;