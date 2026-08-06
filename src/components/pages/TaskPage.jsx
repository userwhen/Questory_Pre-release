/* src/components/pages/TaskPage.jsx */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import AchPage from './AchPage.jsx';
import {
  modalAnim, pageStyle, segmentWrapStyle, segBtnStyle,
  filterBarStyle, filterScrollStyle, filterBtnStyle,
  scrollAreaStyle, emptyStyle, iconBtnStyle, fabStyle,
  btnStyle, btnSmallStyle,
} from '@/components/task/TaskStyles.js';
import ConfirmDialog from '@/components/ui/ConfirmDialog.jsx';
import QuestSelectorModal from '@/components/task/QuestSelectorModal.jsx';
import HistoryView from '@/components/task/HistoryView.jsx';
import TaskCard from '@/components/task/TaskCard.jsx';
import TaskFormModal from '@/components/task/TaskFormModal.jsx';
import TaskDetailModal from '@/components/task/TaskDetailModal.jsx';
import CalendarView from '@/components/task/CalendarView.jsx';
import { sortTasks } from '@/utils/taskSort.js';

/* ─── 主頁面 ────────────────────────────────────────── */
export default function TaskPage({ initialOpenForm = false, onRegisterBack }) {
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
  const [showSelector, setShowSelector] = useState(false);
  const [pendingQC, setPendingQC] = useState(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [pendingDeadline, setPendingDeadline] = useState(null);
  const [dragOrderIds, setDragOrderIds] = useState([]);
  const [draggedCardId, setDraggedCardId] = useState(null);
  const [skillIconMap, setSkillIconMap] = useState({});

  useEffect(() => {
    if (initialOpenForm) setShowSelector(true);
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
  const displayList = (isSelectMode && dragOrderIds.length)
    ? dragOrderIds.map(id => sorted.find(t => t.id === id)).filter(Boolean)
    : sorted;
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
    setDragOrderIds(sorted.map(t => t.id));
    const s = new Set();
    if (initialId) s.add(initialId);
    setSelectedTasks(s);
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedTasks(new Set());
    setDragOrderIds([]);
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
    setDragOrderIds(prev => {
      const ids = prev.length ? [...prev] : sorted.map(t => t.id);
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
    setShowSelector(true);
  };

  const openNewTaskOnDate = (dateStr) => {
    setModalTask(null);
    setPendingDeadline(dateStr);
    setShowSelector(true);
  };

  const handleSelectQC = (qc) => {
    setPendingQC(qc);
    setShowSelector(false);
    setShowForm(true);
  };

  const openEditForm = (task) => {
  const currentContainer = achievements.find(a =>
    a.targetType === 'manual_group' && (a.memberTaskIds || []).includes(task.id));
  setModalTask({
    ...task,
    achLink: currentContainer ? { mode: 'join', achievementId: currentContainer.id } : null,
  });
  setPendingQC(task.questClass || 'guild');
  setShowForm(true);
};

  return (
    <div style={pageStyle}>
      <style>{modalAnim}</style>

      {view === 'history' ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>📜 歷史紀錄</span>
          <button style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => switchView('list')}>←</button>
        </div>
      ) : view === 'calendar' ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>📅 行事曆</span>
          <button style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => switchView('list')}>←</button>
        </div>
      ) : (
        <div style={segmentWrapStyle}>
          {[['list', '📋 任務列表'], ['ach', '🏆 榮譽成就']].map(([val, label]) => (
            <button key={val}
              style={{ ...segBtnStyle, background: view === val ? 'var(--color-correct)' : 'transparent', color: view === val ? '#fff' : 'var(--text-muted)' }}
              onClick={() => switchView(val)}>{label}</button>
          ))}
        </div>
      )}

      {view === 'history' && <div style={scrollAreaStyle}><HistoryView taskHistory={history} /></div>}

      {view === 'calendar' && (
        <CalendarView
          tasks={tasks}
          onOpenDetail={setDetailTask}
          onToggle={handleToggle}
          onToggleSub={handleToggleSub}
          onIncrement={handleIncrement}
          onRequestNewTask={openNewTaskOnDate}
          onEdit={openEditForm}
          skillIconMap={skillIconMap}
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
            <div style={{ display: 'flex', gap: 6, paddingLeft: 10, marginLeft: 4, borderLeft: '1px solid var(--border, rgba(0,0,0,0.12))' }}>
              <button style={filterBtnStyle} onClick={() => switchView('calendar')} title="行事曆檢視">📅</button>
              <button style={filterBtnStyle} onClick={() => switchView('history')} title="歷史紀錄">📜</button>
            </div>
          </div>

          <div style={{ ...scrollAreaStyle, paddingBottom: isSelectMode ? 80 : 100 }}>
            {displayList.length === 0
              ? <div style={emptyStyle}>📭<br />暫無任務<br /><span style={{ fontSize: '0.85rem' }}>點擊右下角 ＋ 新增</span></div>
              : displayList.map(t => (
                <TaskCard key={t.id} task={t}
                  onToggle={handleToggle}
                  onOpenDetail={setDetailTask}
                  onToggleSub={handleToggleSub}
                  onIncrement={handleIncrement}
                  isSelectMode={isSelectMode}
                  isSelected={selectedTasks.has(t.id)}
                  onToggleSelect={toggleSelect}
                  onLongPress={startSelectMode}
                  onEdit={openEditForm}
                  onDragStart={handleCardDragStart}
                  onDragMove={handleCardDragMove}
                  onDragEnd={handleCardDragEnd}
                  skillIconMap={skillIconMap}
                />
              ))
            }
          </div>

          {isSelectMode ? (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--bg-panel)', padding: 15, boxShadow: '0 -4px 10px rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 20, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 'bold' }}>已選取: {selectedTasks.size}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button style={btnSmallStyle} onClick={() => setSelectedTasks(selectedTasks.size === displayList.length ? new Set() : new Set(displayList.map(t => t.id)))}>
                  {selectedTasks.size === displayList.length ? '取消全選' : '全選'}
                </button>
                <button style={btnSmallStyle} onClick={exitSelectMode}>取消</button>
                <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)', margin: '0 2px' }} />
                <button style={{ ...btnSmallStyle, background: 'var(--color-info)', color: '#fff', border: 'none' }} onClick={executeBatchCopy} disabled={selectedTasks.size === 0}>📋 複製</button>
                <button style={{ ...btnSmallStyle, background: 'var(--color-danger)', color: '#fff', border: 'none' }} onClick={() => setShowConfirm(true)} disabled={selectedTasks.size === 0}>🗑️ 刪除</button>
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

      {showSelector && (
        <QuestSelectorModal
          onSelect={handleSelectQC}
          onClose={() => setShowSelector(false)}
        />
      )}

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onToggle={handleToggle}
          onToggleSub={handleToggleSub}
          onEdit={openEditForm}
        />
      )}

      {showForm && (
        <TaskFormModal
          initial={modalTask ? modalTask : {
            questClass: pendingQC || 'guild',
            deadline: pendingDeadline ? `${pendingDeadline}T09:00` : '',
          }}
          cats={taskCats}
          skills={skills}
          unlocks={unlocks}
          openAchievements={achievements.filter(a => a.targetType === 'manual_group' && !a.claimed)}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => { setShowForm(false); setPendingQC(null); setPendingDeadline(null); }}
        />
      )}
    </div>
  );
}