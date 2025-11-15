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
