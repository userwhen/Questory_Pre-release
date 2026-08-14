// src/stats/utils/skillIcon.js
// 依序查：目前存活的技能 → 榮譽殿堂（滿級）→ 已刪除的墓碑紀錄
// 三個地方都找不到，或名字本身就是屬性代號 (STR/INT/...)，就直接查 attrs
export function resolveSkillIcon(name, { attrs, skills, archivedSkills, deletedSkills }) {
  if (attrs?.[name]) return attrs[name].icon;

  const found = skills?.find(sk => sk.name === name)
    || archivedSkills?.find(sk => sk.name === name)
    || deletedSkills?.find(sk => sk.name === name);

  return found?.parent && attrs?.[found.parent] ? attrs[found.parent].icon : '❓';
}