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
import QuestSelectorModal from '@/task/components/QuestSelectorModal.jsx';
import HistoryView from '@/task/components/HistoryView.jsx';
import TaskCard from '@/task/components/TaskCard.jsx';
import TaskFormModal from '@/task/components/TaskFormModal.jsx';
import TaskDetailModal from '@/task/components/TaskDetailModal.jsx';
import CalendarView from '@/task/components/CalendarView.jsx';
import { sortTasks } from '@/task/utils/taskSort.js';

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
if (quickAddOnly) {
    // 只浮出「新增任務」流程本身（選類別→填表單），不渲染 TaskPage
    // 自己的頁面外殼（分頁/列表/篩選列），背景會是呼叫端目前所在的
    // 那一頁，不會變成一片空白或疊出第二層任務列表。
    return (
      <>
        {showSelector && (
          <QuestSelectorModal
            onSelect={handleSelectQC}
            onClose={() => { setShowSelector(false); onDismiss?.(); }}
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
            onClose={() => { setShowForm(false); setPendingQC(null); setPendingDeadline(null); onDismiss?.(); }}
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
          onOpenDetail={setDetailTask}
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
            {displayList.length === 0
              ? <div style={emptyStyle}>📭<br />暫無任務<br /><span style={{ fontSize: 'var(--font-body)' }}>點擊右下角 ＋ 新增</span></div>
              : displayList.map(t => (
                <TaskCard key={t.id} task={t}
                  onToggle={handleToggle}
                  onOpenDetail={setDetailTask}
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
              ))
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