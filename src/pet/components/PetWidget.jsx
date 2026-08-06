// src/pet/components/PetWidget.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import PetNamingModal from '@/pet/components/PetNamingModal.jsx';
import { SinglePet, BabyPet } from './PetCreatures.jsx';
import { PetDetailModal, BirthModal, LineageArchiveModal } from './PetModals.jsx';
import { ItemTray, FlyingItem, PetBoxButton } from './PetSupplyTray.jsx';
import { useStage, assignGridSlot, getGridCellX, getGridCellY } from '@/components/ui/stage.js';

const petAnim = `
  @keyframes petWalk {
    0%,100% { transform: translateX(0) scaleX(1); }
    25%      { transform: translateX(18px) scaleX(1); }
    50%      { transform: translateX(18px) scaleX(-1); }
    75%      { transform: translateX(0) scaleX(-1); }
  }
  @keyframes petJump {
    0%,100% { transform: translateY(0); }
    40%     { transform: translateY(-18px); }
  }
  @keyframes petWiggle {
    0%,100% { transform: rotate(0deg); }
    25%     { transform: rotate(-8deg); }
    75%     { transform: rotate(8deg); }
  }
  @keyframes petFloat {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-6px); }
  }
  @keyframes bubbleIn {
    from { opacity:0; transform:translate(-50%, 6px) scale(0.95); }
    to   { opacity:1; transform:translate(-50%, 0) scale(1); }
  }
  @keyframes petModalIn {
    from { opacity:0; transform:scale(0.92) translateY(12px); }
    to   { opacity:1; transform:scale(1) translateY(0); }
  }
  @keyframes poopPop {
    from { opacity:0; transform:scale(0); }
    to   { opacity:1; transform:scale(1); }
  }
  @keyframes heartFloat {
    0%   { opacity:1; transform:translateY(0) scale(0.8); }
    100% { opacity:0; transform:translateY(-40px) scale(1.3); }
  }
  @keyframes petRubWiggle {
    0%, 100% { transform: rotate(0deg); }
    25%      { transform: rotate(-6deg); }
    75%      { transform: rotate(6deg); }
  }
  @keyframes targetPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(245,166,35,0.6); }
    50%     { box-shadow: 0 0 0 10px rgba(245,166,35,0); }
  }
  @keyframes trayIn {
    from { opacity:0; transform:translateY(6px) scale(0.9); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
`;

function StaticPetFallback({ wearing }) {
  const stage = useStage();
  const slot = assignGridSlot(0, stage.grid, 'ground');
  const x = getGridCellX(stage.grid, slot.col);
  const y = getGridCellY(stage, slot.row);
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -100%)', zIndex: 15, pointerEvents: 'none' }}>
      <img
        src={`img/${wearing.pet}.png`}
        style={{ height: 90, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.15))' }}
        onError={e => { e.target.style.display = 'none'; }}
      />
    </div>
  );
}

export default function PetWidget() {
  const { activePets, babyPet, babyPetName, babyPetData, petArchive, wearing, isModuleActive } = useGameStore(s => ({
    activePets: s.activePets ?? [],
    babyPet: s.babyPet ?? null,
    babyPetName: s.babyPetName ?? null,
    babyPetData: s.babyPetData ?? null,
    petArchive: s.petArchive ?? [],
    wearing: s.avatar?.wearing ?? {},
    isModuleActive: !!(s.unlocks?.module_pet),
  }));

  const [showArchive, setShowArchive] = useState(false);
  const [birthData, setBirthData] = useState(null);
  const [namingIndex, setNamingIndex] = useState(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [pickedItem, setPickedItem] = useState(null);
  const [flying, setFlying] = useState([]);
  const [openBubbleFor, setOpenBubbleFor] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);

  const containerRef = useRef(null);
  const boxRef = useRef(null);
  const trayWrapRef = useRef(null);
  const petElRefs = useRef({});
  const babyElRef = useRef(null);

  useEffect(() => {
    const unsub = EventBus.on(Events.Pet.BIRTH_READY, ({ motherIndex }) => {
      const pool = useGameStore.getState().activePets ?? [];
      const id = pool[motherIndex]?.id ?? pool[0]?.id ?? 'pet_01';
      setBirthData({ babyId: id });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (namingIndex !== null) return;
    const idx = activePets.findIndex(p => p.needsNaming);
    if (idx !== -1) setNamingIndex(idx);
  }, [activePets, namingIndex]);

  const handleConfirmName = useCallback((name) => {
    EventBus.emit(Events.Pet.REQUEST_NAME_PET, { index: namingIndex, name });
    setNamingIndex(null);
  }, [namingIndex]);

  const getValidTargets = useCallback(() => {
    const targets = [];
    activePets.forEach((p, i) => { if (p.status !== 'exploring') targets.push(i); });
    if (babyPet && babyPetData) targets.push('baby');
    return targets;
  }, [activePets, babyPet, babyPetData]);

  const registerPetRef = useCallback((index, el) => { petElRefs.current[index] = el; }, []);
  const registerBabyRef = useCallback((el) => { babyElRef.current = el; }, []);

  const flyItemTo = useCallback((shopItem, targetEl) => {
    if (!boxRef.current || !targetEl || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const boxRect = boxRef.current.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const from = {
      x: boxRect.left - containerRect.left + boxRect.width / 2,
      y: boxRect.top - containerRect.top + boxRect.height / 2,
    };
    const to = {
      x: targetRect.left - containerRect.left + targetRect.width / 2,
      y: targetRect.top - containerRect.top + targetRect.height / 2,
    };
    const flyId = `fly_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setFlying(f => [...f, { id: flyId, emoji: shopItem.icon, from, to }]);
  }, []);

  const consumeItemAndInteract = useCallback((shopItem, target) => {
    const bag = useGameStore.getState().bag ?? [];
    const owned = bag.find(b => b.id === shopItem.id)?.count ?? 0;
    if (owned <= 0) return;
    useGameStore.setState(s => ({
      bag: (s.bag ?? []).map(i => i.id === shopItem.id ? { ...i, count: i.count - 1 } : i),
    }));
    EventBus.emit(Events.Pet.REQUEST_INTERACT, { target, action: shopItem.type, amount: shopItem.val });
  }, []);

  const handlePickItem = useCallback((shopItem) => {
    const targets = getValidTargets();
    if (targets.length === 0) {
      EventBus.emit(Events.System.TOAST, '目前沒有在家的寵物可以互動喔！');
      return;
    }
    if (targets.length === 1) {
      const only = targets[0];
      const el = only === 'baby' ? babyElRef.current : petElRefs.current[only];
      flyItemTo(shopItem, el);
      consumeItemAndInteract(shopItem, only);
      return;
    }
    setPickedItem(shopItem);
    EventBus.emit(Events.System.TOAST, '選一隻寵物送過去吧！');
  }, [getValidTargets, flyItemTo, consumeItemAndInteract]);

  const handleBecomeTarget = useCallback((target) => {
    if (!pickedItem) return;
    const el = target === 'baby' ? babyElRef.current : petElRefs.current[target];
    flyItemTo(pickedItem, el);
    consumeItemAndInteract(pickedItem, target);
    setPickedItem(null);
    setTrayOpen(false);
  }, [pickedItem, flyItemTo, consumeItemAndInteract]);

  const handleOpenDetailFor = useCallback((target, petData, isBaby) => {
    setOpenBubbleFor(null);
    setDetailTarget({ target, pet: petData, isBaby });
  }, []);

  const isInsideAnyPet = useCallback((target) => {
    if (babyElRef.current?.contains(target)) return true;
    return Object.values(petElRefs.current).some(el => el?.contains(target));
  }, []);

  const handleOutsidePointerDown = useCallback((e) => {
    if (!trayOpen && !pickedItem) return;
    const target = e.target;
    const insideTray = trayWrapRef.current?.contains(target);
    const insideBox = boxRef.current?.contains(target);
    if (insideTray || insideBox) return;
    if (pickedItem) {
      if (isInsideAnyPet(target)) return;
      setPickedItem(null);
      setTrayOpen(false);
      EventBus.emit(Events.System.TOAST, '已取消送出');
      return;
    }
    setTrayOpen(false);
  }, [trayOpen, pickedItem, isInsideAnyPet]);

  useEffect(() => {
    if (!trayOpen && !pickedItem) return;
    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown);
  }, [trayOpen, pickedItem, handleOutsidePointerDown]);

  const hasStaticPet = !isModuleActive && !!wearing.pet;

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <style>{petAnim}</style>

      {/* 寵物各自定位 + 各自 pointerEvents:'auto'，不再用地面大框 */}
      {isModuleActive && activePets.map((pet, i) => (
        <SinglePet
          key={pet.id + i}
          pet={pet}
          index={i}
          targeting={!!pickedItem}
          onBecomeTarget={handleBecomeTarget}
          registerRef={registerPetRef}
          isBubbleOpen={openBubbleFor === i}
          onOpenBubble={() => setOpenBubbleFor(i)}
          onCloseBubble={() => setOpenBubbleFor(cur => cur === i ? null : cur)}
          onOpenDetail={() => handleOpenDetailFor(i, pet, false)}
        />
      ))}

      {hasStaticPet && <StaticPetFallback wearing={wearing} />}

      {babyPet && babyPetData && (
        <BabyPet
          babyId={babyPet}
          babyData={babyPetData}
          babyName={babyPetName}
          siblingCount={activePets.length}
          targeting={!!pickedItem}
          onBecomeTarget={handleBecomeTarget}
          registerRef={registerBabyRef}
          isBubbleOpen={openBubbleFor === 'baby'}
          onOpenBubble={() => setOpenBubbleFor('baby')}
          onCloseBubble={() => setOpenBubbleFor(cur => cur === 'baby' ? null : cur)}
          onOpenDetail={() => handleOpenDetailFor('baby', { ...babyPetData, name: babyPetName, level: 0, isGrowing: true }, true)}
        />
      )}

      {isModuleActive && (
        <div style={{ pointerEvents: 'auto' }}>
          <PetBoxButton
            boxRef={boxRef}
            trayOpen={trayOpen}
            onToggleTray={() => setTrayOpen(o => !o)}
            onOpenArchive={() => { setTrayOpen(false); setShowArchive(true); }}
          />
        </div>
      )}

      {trayOpen && (
        <div ref={trayWrapRef} style={{ position: 'absolute', bottom: '32%', right: '4%', zIndex: 31, pointerEvents: 'auto' }}>
          <ItemTray onPickItem={handlePickItem} />
        </div>
      )}

      {flying.map(f => (
        <FlyingItem
          key={f.id}
          emoji={f.emoji}
          from={f.from}
          to={f.to}
          onArrive={() => setFlying(list => list.filter(x => x.id !== f.id))}
        />
      ))}

      {detailTarget && (
        <div style={{ pointerEvents: 'auto' }}>
          <PetDetailModal
            pet={detailTarget.pet}
            isBaby={detailTarget.isBaby}
            onClose={() => setDetailTarget(null)}
          />
        </div>
      )}
      {showArchive && (
        <div style={{ pointerEvents: 'auto' }}>
          <LineageArchiveModal archive={petArchive} onClose={() => setShowArchive(false)} />
        </div>
      )}
      {namingIndex !== null && activePets[namingIndex] && (
        <div style={{ pointerEvents: 'auto' }}>
          <PetNamingModal onConfirm={handleConfirmName} />
        </div>
      )}
      {birthData && (
        <div style={{ pointerEvents: 'auto' }}>
          <BirthModal
            babyId={birthData.babyId}
            babyName="新寵物"
            onResolve={(choice, id, name) => EventBus.emit(Events.Pet.REQUEST_RESOLVE_BIRTH, { choice, babyId: id, babyName: name })}
            onClose={() => setBirthData(null)}
          />
        </div>
      )}
    </div>
  );
}