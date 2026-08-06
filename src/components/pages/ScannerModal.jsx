import React, { useState, useCallback } from 'react';
import { Scanner } from '@/plugins/scanner.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import Modal from '@/components/ui/Modal.jsx';
import { inputStyle, labelStyle, btnStyle } from '@/styles/modalStyles.js';

export default function ScannerModal({ onResult, onClose }) {
  const [manualBarcode, setManualBarcode] = useState('');
  const [loading,       setLoading]       = useState(false);
  const [scanResult,    setScanResult]    = useState(null);
  const [phase,         setPhase]         = useState('input');
  const [form,          setForm]          = useState({ name: '', kcal: '', size: '' });

  const doLookup = useCallback(async (barcode) => {
    if (!barcode) return;
    setLoading(true);
    EventBus.emit(Events.System.TOAST, '🔍 條碼解析中...');
    const result = await Scanner.lookup(barcode);
    setLoading(false);

    if (result.found) {
      setScanResult(result);
      setForm({ name: result.name, kcal: result.kcal ? String(result.kcal) : '', size: result.size ?? '' });
      setPhase('confirm');
    } else {
      setScanResult({ barcode });
      setForm({ name: '', kcal: '', size: '' });
      setPhase('create');
    }
  }, []);

  const handleManualSubmit = useCallback(async () => {
    const barcode = manualBarcode.trim();
    if (!barcode || barcode.length < 5 || !/^\d+$/.test(barcode)) {
      EventBus.emit(Events.System.TOAST, '⚠️ 請輸入有效的純數字條碼');
      return;
    }
    await doLookup(barcode);
  }, [manualBarcode, doLookup]);

  const handleScan = useCallback(async () => {
    setLoading(true);
    const result = await Scanner.scan();
    setLoading(false);
    if (result) {
      setScanResult(result);
      setForm({ name: result.name, kcal: result.kcal ? String(result.kcal) : '', size: result.size ?? '' });
      setPhase(result.found ? 'confirm' : 'create');
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (!form.name.trim()) { EventBus.emit(Events.System.TOAST, '⚠️ 請輸入商品名稱'); return; }
    const kcal = parseFloat(form.kcal) || 0;
    const size = form.size.replace(/[^\d.]/g, '');

    Scanner.contribute(scanResult.barcode, form.name.trim(), kcal, size);
    Scanner.giveContributeReward(scanResult.barcode);

    onResult?.({ barcode: scanResult.barcode, name: form.name.trim(), kcal, size });
    onClose?.();
  }, [form, scanResult, onResult, onClose]);

  return (
    <Modal
      title={phase === 'input' ? '📷 掃描條碼' : phase === 'confirm' ? '✅ 確認商品' : '✍️ 新增商品'}
      onClose={onClose}
      maxWidth={360}
    >
      {phase === 'input' && (
        <>
          <p style={{ fontSize:'0.85rem', color:'var(--text-muted,#8c6e52)', textAlign:'center', marginBottom:16, lineHeight:1.5 }}>
            掃描功能需要 App 版本<br/>可手動輸入條碼測試查詢
          </p>
          <input
            style={inputStyle}
            type="text"
            inputMode="numeric"
            placeholder="例如：4710088002340"
            value={manualBarcode}
            onChange={e => setManualBarcode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
          />
          <div style={{ display:'flex', gap:10 }}>
            <button style={{ ...btnStyle, flex:1, background:'rgba(91,138,240,0.15)', color:'var(--color-info,#2980b9)', border:'1.5px solid var(--color-info,#2980b9)' }}
              onClick={handleScan} disabled={loading}>
              📷 掃描
            </button>
            <button style={{ ...btnStyle, flex:2 }} onClick={handleManualSubmit} disabled={loading || !manualBarcode}>
              {loading ? '查詢中...' : '🔍 查詢'}
            </button>
          </div>
        </>
      )}

      {(phase === 'confirm' || phase === 'create') && (
        <>
          {phase === 'confirm' && scanResult?.brand === '玩家共創庫' && (
            <div style={{ background:'rgba(34,122,89,0.1)', border:'1px solid var(--color-correct,#227A59)', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:'0.82rem', color:'var(--color-correct,#227A59)' }}>
              ✅ 來自玩家共創庫
            </div>
          )}
          {phase === 'create' && (
            <div style={{ background:'rgba(245,166,35,0.1)', border:'1px solid var(--color-gold,#f5a623)', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:'0.82rem', color:'var(--color-gold-dark,#c47d0e)' }}>
              💡 建立新商品可獲得 1 顆免費鑽石 💎
            </div>
          )}

          <label style={labelStyle}>商品名稱</label>
          <input style={inputStyle} placeholder="例如：蘋果汁"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />

          <div style={{ display:'flex', gap:10 }}>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>熱量 (Kcal/100g)</label>
              <input style={inputStyle} type="text" inputMode="decimal" placeholder="0"
                value={form.kcal} onChange={e => setForm(f => ({ ...f, kcal: e.target.value }))} />
            </div>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>容量 (ml/g)</label>
              <input style={inputStyle} placeholder="例如：500"
                value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} />
            </div>
          </div>

          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button style={{ ...btnStyle, flex:1, background:'var(--bg-panel,#f7e7ce)', color:'var(--text,#2c1a0e)', border:'1.5px solid var(--border-input,#d5c5a8)', boxShadow:'none' }}
              onClick={() => setPhase('input')}>← 返回</button>
            <button style={{ ...btnStyle, flex:2 }} onClick={handleConfirm}>
              {phase === 'confirm' ? '✅ 確認並使用' : '📥 建立並使用'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

