/* src/components/pages/TaskPage.jsx */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import AchPage from '@/ach/pages/AchPage.jsx';
import {
  modalAnim, pageStyle, segmentWrapStyle, segBtnStyle,
  filterBarStyle, filterScrollStyle, filterBtnStyle,
  scrollAreaStyle, emptyStyle, iconBtnStyle, fabStyle,
  btnStyle, btnSmallStyle,
} from '@/task/components/TaskStyles.js';
import { btnDangerStyle } from '@/styles/modalStyles.js';
import ConfirmDialog from '@/ui/ConfirmDialog.jsx';
import HistoryView from '@/task/components/HistoryView.jsx';
import TaskCard from '@/task/components/TaskCard.jsx';
import TaskFormModal from '@/task/components/TaskFormModal.jsx';
import CalendarView from '@/task/components/CalendarView.jsx';
import { sortTasks } from '@/task/utils/taskSort.js';
import { TaskDict } from '@/task/data/taskdict.js';

/* ─── 主頁面 ────────────────────────────────────────── */
export default function TaskPage({ initialOpenForm = false, quickAddOnly = false, onDismiss, onRegisterBack }) {
  const { tasks, taskCats, skills, history, unlocks, taskViewMode, achievements } = useGameStore(useShallow(s => ({
    tasks: s.tasks || [],
    taskCats: s.taskCats || ['日常', '運動', '工作', '待辦', '願望'],
    skills: s.skills || [],
    history: s.history || [],
    unlocks: s.unlocks || {},
    taskViewMode: s.taskViewMode || 'list',
    achievements: s.achievements || [],
  })));

  const [view, setView] = useState(taskViewMode);
  const [filter, setFilter] = useState('全部');
  const [modalTask, setModalTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDeadline, setPendingDeadline] = useState(null);
  const [dragOrderIds, setDragOrderIds] = useState([]);
  const [draggedCardId, setDraggedCardId] = useState(null);
  const [skillIconMap, setSkillIconMap] = useState({});
  // 勾選模式拖曳所屬分區：'active' | 'done'，限制只在同區內排序
  const [dragSection, setDragSection] = useState(null);

  useEffect(() => {
    if (initialOpenForm) {
      setModalTask(null);
      setShowForm(true);
    }
  }, [initialOpenForm]);

  useEffect(() => {
    const unsub = EventBus.on(Events.Stats.SKILL_ICON_MAP_READY, setSkillIconMap);
    EventBus.emit(Events.Stats.REQUEST_SKILL_ICON_MAP);
    return unsub;
  }, []);

  const switchView = useCallback((mode) => {
    setView(mode);
    useGameStore.getState().setTaskViewMode(mode);
  }, []);

  // ── 返回攔截登記：view 不是 list 時，返回鍵/手勢先回 list，
  //    不會直接跳出 TaskPage 回到上一層
  useEffect(() => {
    if (!onRegisterBack) return;
    if (view !== 'list') {
      onRegisterBack('taskpage-subview', () => switchView('list'));
    } else {
      onRegisterBack('taskpage-subview', null);
    }
    return () => onRegisterBack('taskpage-subview', null);
  }, [view, onRegisterBack, switchView]);

  const sorted = useMemo(() => sortTasks(tasks, filter), [tasks, filter]);
  const allCats = ['全部', ...taskCats.filter(c => c !== '全部')];
  const activeTasks = useMemo(() => sorted.filter(t => !t.done), [sorted]);
  const doneTasks = useMemo(() => sorted.filter(t => t.done), [sorted]);
  const sectionLabels = TaskDict.Task.DefaultForm;

  // 勾選模式：依目前拖曳分區重排該區 id；非勾選模式用 sorted 切出的兩區
  const displayActive = (isSelectMode && dragSection === 'active' && dragOrderIds.length)
    ? dragOrderIds.map(id => activeTasks.find(t => t.id === id) || sorted.find(t => t.id === id)).filter(t => t && !t.done)
    : activeTasks;
  const displayDone = (isSelectMode && dragSection === 'done' && dragOrderIds.length)
    ? dragOrderIds.map(id => doneTasks.find(t => t.id === id) || sorted.find(t => t.id === id)).filter(t => t && t.done)
    : doneTasks;
  const displayList = [...displayActive, ...displayDone];
  const handleToggle = useCallback(id => EventBus.emit(Events.Task.REQUEST_RESOLVE, { id }), []);
  const handleIncrement = useCallback(id => EventBus.emit(Events.Task.REQUEST_INCREMENT, { id }), []);
  const handleToggleSub = useCallback((tid, idx) => EventBus.emit(Events.Task.REQUEST_TOGGLE_SUB, { taskId: tid, subIdx: idx }), []);

  const handleSave = useCallback(form => {
    if (form.id) EventBus.emit(Events.Task.REQUEST_UPDATE, form);
    else EventBus.emit(Events.Task.REQUEST_ADD, form);
  }, []);
  const handleDelete = useCallback(id => EventBus.emit(Events.Task.REQUEST_DELETE, { id }), []);

  const toggleSelect = id => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const startSelectMode = (initialId = null) => {
    setIsSelectMode(true);
    const seed = initialId ? sorted.find(t => t.id === initialId) : null;
    const section = seed?.done ? 'done' : 'active';
    setDragSection(section);
    const sectionIds = (section === 'done' ? doneTasks : activeTasks).map(t => t.id);
    // 若 seed 不在當前 filter 切出的區，仍用 sorted 同 done 狀態
    const ids = sectionIds.length
      ? sectionIds
      : sorted.filter(t => !!t.done === (section === 'done')).map(t => t.id);
    setDragOrderIds(ids);
    const s = new Set();
    if (initialId) s.add(initialId);
    setSelectedTasks(s);
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedTasks(new Set());
    setDragOrderIds([]);
    setDragSection(null);
  };

  const executeBatchDelete = () => {
    EventBus.emit(Events.Task.REQUEST_BATCH_DELETE, { ids: [...selectedTasks] });
    exitSelectMode();
    setShowConfirm(false);
  };

  const executeBatchCopy = () => {
    const targets = tasks.filter(t => selectedTasks.has(t.id));
    targets.forEach(t => {
      EventBus.emit(Events.Task.REQUEST_ADD, { ...t, id: null, title: t.title + ' (副本)' });
    });
    EventBus.emit(Events.System.TOAST, `已複製 ${targets.length} 個任務`);
    exitSelectMode();
  };

  const handleCardDragStart = (id) => setDraggedCardId(id);
  const handleCardDragMove = (e) => {
    if (!draggedCardId) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const rowEl = el && el.closest('[data-task-id]');
    if (!rowEl) return;
    const overId = rowEl.dataset.taskId;
    if (overId === draggedCardId) return;
    // 只允許同區內排序：over 必須仍在 dragOrderIds 裡
    setDragOrderIds(prev => {
      const ids = prev.length ? [...prev] : [];
      const from = ids.indexOf(draggedCardId);
      const to = ids.indexOf(overId);
      if (from === -1 || to === -1) return ids;
      ids.splice(from, 1);
      ids.splice(to, 0, draggedCardId);
      return ids;
    });
  };
  const handleCardDragEnd = () => setDraggedCardId(null);

  const openNewTask = () => {
    setModalTask(null);
    setPendingDeadline(null);
    setShowForm(true);
  };

  const openNewTaskOnDate = (dateStr) => {
    setModalTask(null);
    setPendingDeadline(dateStr);
    setShowForm(true);
  };

  const openEditForm = (task) => {
    const currentContainer = achievements.find(a =>
      a.targetType === 'manual_group' && (a.memberTaskIds || []).includes(task.id));
    setModalTask({
      ...task,
      achLink: currentContainer ? { mode: 'join', achievementId: currentContainer.id } : null,
    });
    setShowForm(true);
  };

  const renderTaskCard = (t) => (
    <TaskCard
      key={t.id}
      task={t}
      onToggle={handleToggle}
      onToggleSub={handleToggleSub}
      onIncrement={handleIncrement}
      isSelectMode={isSelectMode}
      isSelected={selectedTasks.has(t.id)}
      onToggleSelect={toggleSelect}
      onEnterSelectMode={startSelectMode}
      onEdit={openEditForm}
      onDragStart={handleCardDragStart}
      onDragMove={handleCardDragMove}
      onDragEnd={handleCardDragEnd}
      skillIconMap={skillIconMap}
    />
  );
if (quickAddOnly) {
    // 只浮出新增表單，不再經過類別選擇器
    return (
      <>
        {showForm && (
          <TaskFormModal
            initial={modalTask ? modalTask : {
              questClass: 'guild',
              deadline: pendingDeadline ? `${pendingDeadline}T09:00` : '',
            }}
            cats={taskCats}
            skills={skills}
            unlocks={unlocks}
            openAchievements={achievements.filter(a => a.targetType === 'manual_group' && !a.claimed)}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => { setShowForm(false); setPendingDeadline(null); onDismiss?.(); }}
          />
        )}
      </>
    );
  }
  return (
    <div style={pageStyle}>
      <style>{modalAnim}</style>

      {/* history / calendar / 殿堂 已由 onRegisterBack 攔截系統返回鍵，不再顯示頂部標題列 */}
      {(view === 'list' || view === 'ach') && (
        <div style={segmentWrapStyle}>
          {[['list', '📋 任務列表'], ['ach', '🏆 榮譽成就']].map(([val, label]) => (
            <button key={val}
              style={{ ...segBtnStyle, background: view === val ? 'var(--color-correct)' : 'transparent', color: view === val ? '#fff' : 'var(--text-muted)' }}
              onClick={() => switchView(val)}>{label}</button>
          ))}
        </div>
      )}

      {view === 'history' && (
        <div style={scrollAreaStyle}>
          <HistoryView taskHistory={history} onBackToList={() => switchView('list')} />
        </div>
      )}

      {view === 'calendar' && (
        <CalendarView
          tasks={tasks}
          history={history}
          onToggle={handleToggle}
          onToggleSub={handleToggleSub}
          onIncrement={handleIncrement}
          onRequestNewTask={openNewTaskOnDate}
          onEdit={openEditForm}
          skillIconMap={skillIconMap}
          onBackToList={() => switchView('list')}
        />
      )}

      {view === 'ach' && (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <AchPage onRegisterBack={onRegisterBack} />
        </div>
      )}

      {view === 'list' && (
        <>
          <div style={filterBarStyle}>
            <div style={filterScrollStyle}>
              {allCats.map(c => (
                <button key={c}
                  style={{ ...filterBtnStyle, background: filter === c ? 'var(--color-correct)' : 'transparent', color: filter === c ? '#fff' : 'var(--text-muted)', border: filter === c ? 'none' : '1px solid var(--border, rgba(0,0,0,0.09))' }}
                  onClick={() => setFilter(c)}>{c}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-xs)', paddingLeft: 'var(--space-xs)', marginLeft: 'var(--space-xs)', borderLeft: '1px solid var(--border, rgba(0,0,0,0.12))' }}>
              <button style={filterBtnStyle} onClick={() => switchView('calendar')} title="行事曆檢視">📅</button>
              <button style={filterBtnStyle} onClick={() => switchView('history')} title="歷史紀錄">📜</button>
            </div>
          </div>

          <div style={{ ...scrollAreaStyle, paddingBottom: isSelectMode ? 80 : 100 }}>
            {displayActive.length === 0 && displayDone.length === 0
              ? <div style={emptyStyle}>📭<br />暫無任務<br /><span style={{ fontSize: 'var(--font-body)' }}>點擊右下角 ＋ 新增</span></div>
              : (
                <>
                  {displayActive.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <div style={{
                        fontSize: 'var(--font-caption)',
                        fontWeight: 700,
                        color: 'var(--text-muted, #8c6e52)',
                        letterSpacing: '0.06em',
                        padding: 'var(--space-xs) var(--space-sm) var(--space-xs)',
                      }}>{sectionLabels.sectionActive}</div>
                      {displayActive.map(renderTaskCard)}
                    </div>
                  )}
                  {displayDone.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <div style={{
                        fontSize: 'var(--font-caption)',
                        fontWeight: 700,
                        color: 'var(--text-muted, #8c6e52)',
                        letterSpacing: '0.06em',
                        padding: 'var(--space-xs) var(--space-sm) var(--space-xs)',
                      }}>{sectionLabels.sectionDone}</div>
                      {displayDone.map(renderTaskCard)}
                    </div>
                  )}
                </>
              )
            }
          </div>

          {isSelectMode ? (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--bg-panel)', padding: 'var(--space-md)', boxShadow: '0 -4px 10px rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 20, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 'bold' }}>已選取: {selectedTasks.size}</div>
              <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                <button style={{ ...btnSmallStyle, background: 'var(--color-info)', color: '#fff', border: 'none' }} onClick={executeBatchCopy} disabled={selectedTasks.size === 0}>複製</button>
                <button style={{ ...btnDangerStyle, padding: 'var(--space-xs) var(--space-sm)', fontSize: 'var(--font-body)' }} onClick={() => setShowConfirm(true)} disabled={selectedTasks.size === 0}>刪除</button>
                <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)', margin: '0 2px' }} />
                <button style={btnSmallStyle} onClick={() => setSelectedTasks(selectedTasks.size === displayList.length ? new Set() : new Set(displayList.map(t => t.id)))}>
                  {selectedTasks.size === displayList.length ? '取消全選' : '全選'}
                </button>
                <button style={btnSmallStyle} onClick={exitSelectMode}>取消</button>
              </div>
            </div>
          ) : (
            <button style={fabStyle} onClick={openNewTask}>＋</button>
          )}
        </>
      )}

      {showConfirm && (
        <ConfirmDialog
          message={`確定要刪除選取的 ${selectedTasks.size} 項任務嗎？`}
          confirmText="確定刪除"
          onConfirm={executeBatchDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {showForm && (
        <TaskFormModal
          initial={modalTask ? modalTask : {
            questClass: 'guild',
            deadline: pendingDeadline ? `${pendingDeadline}T09:00` : '',
          }}
          cats={taskCats}
          skills={skills}
          unlocks={unlocks}
          openAchievements={achievements.filter(a => a.targetType === 'manual_group' && !a.claimed)}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => { setShowForm(false); setPendingDeadline(null); }}
        />
      )}
    </div>
  );
}