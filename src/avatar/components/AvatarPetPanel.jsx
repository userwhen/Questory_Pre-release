/* src/components/ui/AvatarPetPanel.jsx */
// AvatarPage.jsx 的寵物相關部件：AvatarStage 上的寵物渲染，以及購買/裝備門
// 的替換確認/取名彈窗管理。抽出來讓 AvatarPage.jsx 專心處理服裝換裝 UI；
// 衣櫥列表本身（分類 tab、WardrobeCard、買/裝備按鈕）是通用邏輯，橫跨所有
// 物品分類，不屬於寵物專屬內容，留在 AvatarPage.jsx，購買/裝備寵物的入口
// 完全不受這次抽離影響。
import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import PetReplaceModal from '@/pet/components/PetReplaceModal.jsx';
import PetNamingModal from '@/pet/components/PetNamingModal.jsx';

/* ─── AvatarStage 上疊層的寵物圖片渲染 ─────────────────── */
export function AvatarStagePets({ pets }) {
  return (
    <>
      {(pets ?? []).map((pet, idx) => (
        <div key={pet.id + idx} style={{ position: 'absolute', bottom: '5%', right: `${5 + idx * 25}%`, zIndex: 4 + idx, height: 90 }}>
          <img src={`img/${pet.id}.png`} style={{ height: '100%', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }} onError={e => { e.target.style.opacity = '0'; }} alt="" />
        </div>
      ))}
    </>
  );
}

/* ─── 購買/裝備門：滿位替換確認、新寵物取名 ───────────── */
export function AvatarPetDoorModals() {
  const activePets = useGameStore(s => s.activePets ?? []);
  const [petReplacePrompt, setPetReplacePrompt] = useState(null); // { newItemId } | null
  const [namingIndex, setNamingIndex] = useState(null); // 剛裝備/替換完成、還沒取名的寵物在 activePets 裡的 index

  useEffect(() => {
    const unsub = EventBus.on(Events.Pet.REPLACE_PROMPT, ({ newItemId }) => {
      setPetReplacePrompt({ newItemId });
    });
    return unsub;
  }, []);

  // 不管是直接裝備、還是替換後領養（PetReplaceModal 確認後），avatar.js 的
  // _addNewPet() 都會發這個事件，這裡是唯一需要監聽它的地方——裝備動作
  // 一定發生在這個頁面上，事件不會被漏接，取名視窗可以立即彈出。
  useEffect(() => {
    const unsub = EventBus.on(Events.Pet.PET_ADDED_NEEDS_NAMING, ({ index }) => {
      setNamingIndex(index);
    });
    return unsub;
  }, []);

  const handlePetReplaceConfirm = useCallback((index, newItemId) => {
    EventBus.emit(Events.Pet.REQUEST_CONFIRM_REPLACE, { index, newItemId });
    setPetReplacePrompt(null);
  }, []);

  const handleConfirmPetName = useCallback((name) => {
    EventBus.emit(Events.Pet.REQUEST_NAME_PET, { index: namingIndex, name });
    setNamingIndex(null);
  }, [namingIndex]);

  return (
    <>
      {petReplacePrompt && (
        <PetReplaceModal
          activePets={activePets}
          newItemId={petReplacePrompt.newItemId}
          onConfirm={handlePetReplaceConfirm}
          onCancel={() => setPetReplacePrompt(null)}
        />
      )}
      {namingIndex !== null && <PetNamingModal onConfirm={handleConfirmPetName} />}
    </>
  );
}