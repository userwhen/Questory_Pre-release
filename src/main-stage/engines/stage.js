// src/main-stage//stagejs
import { getState, setState } from '@/core/state.js';
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { getPetHeightCells, BABY_HEIGHT_CELLS } from '@/main-stage/stageUtils.js';

const DEFAULT_CHAR_HEIGHT_CELLS = 5.5;
const DEFAULT_COMPANION_HEIGHT_CELLS = 5.5;
const DEFAULT_CHARACTER_SLOT = { col: 4, row: 12 };

export const StageEngine = {
  init: makeIdempotentInit(function () {
    // 確保 stage 欄位存在
    setState(s => ({
      stage: s.stage ?? {
        backgrounds: { room: null, wall: null, floor: null },
        characterSlot: { ...DEFAULT_CHARACTER_SLOT },
        entities: [],
      },
    }));

    this.rebuildScene();

    const unsubAvatar = EventBus.on(Events.Avatar.UPDATED, () => this.rebuildScene());
    const unsubPet = EventBus.on(Events.Pet.UPDATED, () => this.rebuildScene());
    // Challenge 目前沒 UPDATED：進大廳時 MainPage mount 會再觸發一次 rebuild 即可
    // 或之後補 Events.Challenge.UPDATED

    const unsubVisible = EventBus.on(Events.Stage.REQUEST_SET_VISIBLE, ({ id, visible }) => {
      this.setEntityVisible(id, visible);
    });
    const unsubAnim = EventBus.on(Events.Stage.REQUEST_SET_ANIM, ({ id, anim }) => {
      this.setEntityAnim(id, anim);
    });
    const unsubSlot = EventBus.on(Events.Stage.REQUEST_SET_SLOT, ({ id, slot }) => {
      this.setEntitySlot(id, slot);
    });

    return [unsubAvatar, unsubPet, unsubVisible, unsubAnim, unsubSlot];
  }),

  rebuildScene() {
    const s = getState();
    const wearing = s.avatar?.wearing ?? {};
    const characterSlot = s.stage?.characterSlot ?? DEFAULT_CHARACTER_SLOT;

    const entities = [];

    // ── 主角 ──
    entities.push({
      id: 'main',
      type: 'character',
      slot: { ...characterSlot },
      heightCells: DEFAULT_CHAR_HEIGHT_CELLS,
      appearance: { wearing },
      visible: true,
      anim: null,
    });

    // ── 陪伴（有裝備才出現）──
    if (wearing.companion) {
      entities.push({
        id: 'companion',
        type: 'companion',
        // 第一版：位置仍由 CompanionWidget 自己巡邏；
        // Stage 先記「有這個實體」，slot 可先用佔位或之後由 Widget 回報
        slot: null, // 或保留上次位置
        heightCells: DEFAULT_COMPANION_HEIGHT_CELLS,
        appearance: { compId: wearing.companion },
        visible: true,
        anim: null,
      });
    }

    // ── 寵物（位置仍由 usePetPatrol 管；這裡只登記「有誰、多高」）──
    (s.activePets ?? []).forEach((pet, index) => {
      if (pet.status === 'exploring') return;
      entities.push({
        id: pet.id ?? `pet_${index}`,
        type: 'pet',
        slot: null, // 第一版不強制接管巡邏
        heightCells: getPetHeightCells(pet.level ?? 1),
        appearance: { pet, index },
        visible: true,
        anim: null,
      });
    });

    if (s.babyPet && s.babyPetData) {
      entities.push({
        id: `baby_${s.babyPet}`,
        type: 'baby',
        slot: null,
        heightCells: BABY_HEIGHT_CELLS,
        appearance: {
          babyId: s.babyPet,
          babyData: s.babyPetData,
          babyName: s.babyPetName,
        },
        visible: true,
        anim: null,
      });
    }

    // ── 背景 ──
    const backgrounds = {
      room: wearing.room_bg ?? wearing.bg ?? null,
      wall: wearing.wall_bg ?? null,
      floor: wearing.floor_bg ?? null,
    };

    setState(s => ({
      stage: {
        ...(s.stage ?? {}),
        backgrounds,
        characterSlot,
        entities,
      },
    }));

    EventBus.emit(Events.Stage.UPDATED);
  },

  setEntityVisible(id, visible) {
    setState(s => {
      const entities = (s.stage?.entities ?? []).map(e =>
        e.id === id ? { ...e, visible: !!visible } : e
      );
      return { stage: { ...s.stage, entities } };
    });
    EventBus.emit(Events.Stage.UPDATED);
  },

  setEntityAnim(id, anim) {
    setState(s => {
      const entities = (s.stage?.entities ?? []).map(e =>
        e.id === id ? { ...e, anim } : e
      );
      return { stage: { ...s.stage, entities } };
    });
    EventBus.emit(Events.Stage.UPDATED);
  },

  setEntitySlot(id, slot) {
    if (id === 'main') {
      setState(s => ({
        stage: {
          ...s.stage,
          characterSlot: { ...slot },
          entities: (s.stage?.entities ?? []).map(e =>
            e.id === 'main' ? { ...e, slot: { ...slot } } : e
          ),
        },
      }));
    } else {
      setState(s => ({
        stage: {
          ...s.stage,
          entities: (s.stage?.entities ?? []).map(e =>
            e.id === id ? { ...e, slot: { ...slot } } : e
          ),
        },
      }));
    }
    EventBus.emit(Events.Stage.UPDATED);
  },
};