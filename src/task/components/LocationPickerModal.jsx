/* src/components/task/LocationPickerModal.jsx */
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { btnStyle, inputStyle } from '@/task/components/TaskStyles.js';
import Modal from '@/components/ui/Modal.jsx';

// Vite/webpack 打包會讓 Leaflet 預設圖示路徑失效，需手動指定
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const DEFAULT_CENTER = [25.0330, 121.5654]; // 找不到定位時的預設中心點（台北）

export default function LocationPickerModal({ initialLocation, onConfirm, onClose }) {
  const mapRef       = useRef(null);
  const mapInstance  = useRef(null);
  const markerRef    = useRef(null);
  const [searchText,      setSearchText]      = useState('');
  const [results,         setResults]         = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(initialLocation || '');
  const [searching,       setSearching]       = useState(false);

  useEffect(() => {
    mapInstance.current = L.map(mapRef.current).setView(DEFAULT_CENTER, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    mapInstance.current.on('click', async (e) => {
      placeMarker(e.latlng.lat, e.latlng.lng);
      const addr = await reverseGeocode(e.latlng.lat, e.latlng.lng);
      setSelectedAddress(addr || `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`);
    });

    return () => mapInstance.current?.remove();
  }, []);

  const placeMarker = (lat, lng) => {
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
    else markerRef.current = L.marker([lat, lng]).addTo(mapInstance.current);
    mapInstance.current.setView([lat, lng], 15);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
        headers: { 'Accept-Language': 'zh-TW' },
      });
      const data = await res.json();
      return data?.display_name || null;
    } catch (e) { return null; }
  };

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=5`, {
        headers: { 'Accept-Language': 'zh-TW' },
      });
      setResults(await res.json());
    } catch (e) {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handlePickResult = (r) => {
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon);
    placeMarker(lat, lng);
    setSelectedAddress(r.display_name);
    setResults([]);
    setSearchText('');
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      placeMarker(latitude, longitude);
      const addr = await reverseGeocode(latitude, longitude);
      setSelectedAddress(addr || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    });
  };

  return (
    <Modal
      title="📍 選擇地點"
      onClose={onClose}
      zIndex={9500}
      maxWidth={480}
      bodyStyle={{ padding: 0 }}
      footer={
        <>
          <button style={{ ...btnStyle, background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}
            onClick={() => { setSelectedAddress(''); onConfirm(''); }}>清除定位</button>
          <button style={{ ...btnStyle, flex: 1 }} onClick={() => onConfirm(selectedAddress)}>確認</button>
        </>
      }
    >
        <div style={{ padding: '10px 14px 0' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input
              style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
              placeholder="搜尋地點名稱或地址..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button style={{ ...btnStyle, padding: '10px 14px' }} onClick={handleSearch} disabled={searching}>
              {searching ? '...' : '🔍'}
            </button>
          </div>

          {results.length > 0 && (
            <div style={{ marginBottom: 8, maxHeight: 140, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
              {results.map((r, i) => (
                <div key={i}
                  style={{ padding: '8px 10px', fontSize: '0.85rem', cursor: 'pointer', borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none' }}
                  onClick={() => handlePickResult(r)}>
                  {r.display_name}
                </div>
              ))}
            </div>
          )}

          <button style={{ ...btnStyle, background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: 'none', marginBottom: 8, width: '100%' }}
            onClick={handleUseMyLocation}>📌 使用目前位置</button>
        </div>

        <div ref={mapRef} style={{ width: '100%', height: 280, flexShrink: 0 }} />

        <div style={{ padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-muted)', minHeight: 20 }}>
          {selectedAddress || '點擊地圖或搜尋以選擇地點'}
        </div>
    </Modal>
  );
}