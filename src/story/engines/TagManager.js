// TagManager.js
// Tag 二層管理：World / State，外加獨立 tension 數值
// plot 層已廢除 — 結局判定收歸各 Plugin 自行管理私有狀態，
// TagManager 現在只服務一件事：跟 StoryPoolSelector 對接的「配對用標籤」

export class TagManager {
  constructor() {
    this._world = new Set();
    this._state = new Set();
    this._tension = 10; // 0-100，獨立數值，不進 tag 陣列
  }

  // ─────────────────────────────────────────────
  // 重置（每次探索開始時呼叫）
  // ─────────────────────────────────────────────
  reset() {
    this._world.clear();
    this._state.clear();
    this._tension = 10;
  }

  // ─────────────────────────────────────────────
  // 張力操作
  // ─────────────────────────────────────────────
  getTension() {
    return this._tension;
  }

  applyTensionDelta(delta) {
    this._tension = Math.max(0, Math.min(100, this._tension + delta));
  }

  setTension(value) {
    this._tension = Math.max(0, Math.min(100, value));
  }

  /**
   * 數值轉等級，供 StoryPoolSelector 第四維度篩選用
   * 門檻沿用舊系統 TENSION_LEVELS 的分界
   */
  getTensionLevel() {
    if (this._tension >= 80) return '極限';
    if (this._tension >= 55) return '高';
    if (this._tension >= 25) return '中';
    return '低';
  }

  // ─────────────────────────────────────────────
  // Tag 新增／移除／查詢
  // 支援含前綴格式："world:醫院" / "state:恐懼"
  // ─────────────────────────────────────────────
  addTag(tag) {
    const prefix = this._getPrefix(tag);
    if (prefix === 'world') this._world.add(tag);
    else if (prefix === 'state') this._state.add(tag);
  }

  addTags(tags) {
    if (!Array.isArray(tags)) return;
    tags.forEach(t => this.addTag(t));
  }

  removeTag(tag) {
    const prefix = this._getPrefix(tag);
    if (prefix === 'world') this._world.delete(tag);
    else if (prefix === 'state') this._state.delete(tag);
  }

  removeTags(tags) {
    if (!Array.isArray(tags)) return;
    tags.forEach(t => this.removeTag(t));
  }

  hasTag(tag) {
    const prefix = this._getPrefix(tag);
    if (prefix === 'world') return this._world.has(tag);
    if (prefix === 'state') return this._state.has(tag);
    return false;
  }

  hasTags(tags) {
    if (!Array.isArray(tags)) return true;
    return tags.every(t => this.hasTag(t));
  }

  hasAnyTag(tags) {
    if (!Array.isArray(tags) || tags.length === 0) return false;
    return tags.some(t => this.hasTag(t));
  }

  getAllTags() {
    return [...this._world, ...this._state];
  }

  getWorldTags() { return [...this._world]; }
  getStateTags() { return [...this._state]; }

  // ─────────────────────────────────────────────
  // 供 StoryPoolSelector 直接取用的配對上下文
  // ─────────────────────────────────────────────
  getContextTags() {
    return {
      worldTags: this.getWorldTags(),
      stateTags: this.getStateTags(),
      tensionLevel: this.getTensionLevel(),
    };
  }

  // ─────────────────────────────────────────────
  // 執行 auto_tags 或 option_tags 的 add/remove/tension_delta
  // ─────────────────────────────────────────────
  applyTagEffect(effect) {
    if (!effect) return;
    if (effect.add) this.addTags(effect.add);
    if (effect.remove) this.removeTags(effect.remove);
    if (typeof effect.tension_delta === 'number') {
      this.applyTensionDelta(effect.tension_delta);
    }
  }

  // ─────────────────────────────────────────────
  // 快照／還原（debug、存檔、Zustand 同步用）
  // ─────────────────────────────────────────────
  snapshot() {
    return {
      world: [...this._world],
      state: [...this._state],
      tension: this._tension,
    };
  }

  restore(snapshot) {
    this._world = new Set(snapshot.world || []);
    this._state = new Set(snapshot.state || []);
    this._tension = snapshot.tension ?? 10;
  }

  // ─────────────────────────────────────────────
  // 內部工具
  // ─────────────────────────────────────────────
  _getPrefix(tag) {
    if (typeof tag !== 'string') return null;
    const colon = tag.indexOf(':');
    if (colon === -1) return null;
    return tag.substring(0, colon);
  }
}
