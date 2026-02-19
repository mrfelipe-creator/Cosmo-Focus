import React, { useState } from 'react';
import { Task } from '../types';
import { Plus, Trash2, Check, Clock, MoreVertical, Calendar, Archive, List } from 'lucide-react';
import { NeonButton } from './NeonButton';

interface TaskListProps {
  tasks: Task[];
  activeTaskId: string | null;
  onAddTask: (task: Omit<Task, 'id' | 'isCompleted' | 'completedPomos'>) => void;
  onDeleteTask: (id: string) => void;
  onToggleTask: (id: string) => void;
  onSelectTask: (id: string) => void;
  onUpdatePomos: (id: string, newEstimate: number) => void;
  onUpdateDate: (id: string, newDate: string) => void;
  onUpdateDuration: (id: string, newDuration: number) => void;
}

// Local date helper to match App.tsx
const getToday = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  activeTaskId,
  onAddTask,
  onDeleteTask,
  onToggleTask,
  onSelectTask,
  onUpdatePomos,
  onUpdateDate,
  onUpdateDuration
}) => {
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [estPomos, setEstPomos] = useState(1);
  const [customDuration, setCustomDuration] = useState(25);
  const [taskDate, setTaskDate] = useState(getToday());
  const [editingId, setEditingId] = useState<string | null>(null);

  // Derive the active task object
  const activeTask = activeTaskId ? tasks.find(t => t.id === activeTaskId) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    onAddTask({
      title: newTaskTitle,
      estimatedPomos: estPomos,
      durationPerPomo: customDuration,
      date: taskDate
    });

    setNewTaskTitle('');
    setEstPomos(1);
    setTaskDate(getToday());
    setIsAdding(false);
  };

  const calculateFinishTime = () => {
    const today = getToday();
    // Filter for incomplete tasks scheduled for TODAY
    const todaysTasks = tasks.filter(t => !t.isCompleted && t.date === today);

    if (todaysTasks.length === 0) return null;

    let totalMinutesRemaining = 0;
    
    todaysTasks.forEach(task => {
        const remaining = Math.max(0, task.estimatedPomos - task.completedPomos);
        totalMinutesRemaining += remaining * task.durationPerPomo;
        // Simple heuristic: add 5 min break for every pomo
        totalMinutesRemaining += remaining * 5; 
    });

    if (totalMinutesRemaining === 0) return null;

    const finishDate = new Date(Date.now() + totalMinutesRemaining * 60000);
    // Requirement 3: Ensure time is calculated for Brazilian Timezone
    return finishDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  };

  const finishTime = calculateFinishTime();

  // Helper to format date nicely in PT-BR
  const formatDateDisplay = (dateStr: string) => {
    const today = getToday();
    if (dateStr === today) return 'Hoje';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  };

  // Calculate remaining pomos for today only
  const today = getToday();
  const remainingPomosToday = tasks
    .filter(t => !t.isCompleted && t.date === today)
    .reduce((acc, t) => acc + Math.max(0, t.estimatedPomos - t.completedPomos), 0);

  // Group completed tasks by date
  const completedTasksByDate = tasks
    .filter(t => t.isCompleted)
    .reduce((acc, task) => {
      if (!acc[task.date]) acc[task.date] = [];
      acc[task.date].push(task);
      return acc;
    }, {} as Record<string, Task[]>);

  // Sort dates descending
  const sortedDates = Object.keys(completedTasksByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 font-tech">
      
      {/* Tabs */}
      <div className="flex mb-6 border-b border-gray-800">
        <button 
           onClick={() => setViewMode('active')}
           className={`flex-1 pb-3 text-lg font-space uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${viewMode === 'active' ? 'text-neon-cyan border-b-2 border-neon-cyan' : 'text-gray-500 hover:text-white'}`}
        >
          <List size={18} /> A Fazer
        </button>
        <button 
           onClick={() => setViewMode('history')}
           className={`flex-1 pb-3 text-lg font-space uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${viewMode === 'history' ? 'text-neon-purple border-b-2 border-neon-purple' : 'text-gray-500 hover:text-white'}`}
        >
          <Archive size={18} /> Histórico
        </button>
      </div>

      {viewMode === 'active' && (
        <>
          {/* Foco Atual Block - Only renders if activeTask exists */}
          {activeTask && (
             <div className="mb-8 p-4 bg-neon-cyan/5 border border-neon-cyan/50 rounded-lg text-center animate-pulse-slow">
                <span className="text-gray-400 uppercase text-xs tracking-widest block mb-1">Foco Atual</span>
                <span className="text-xl font-bold text-white">{activeTask.title}</span>
             </div>
          )}

          <div className="space-y-4">
            {tasks
              .filter(t => !t.isCompleted) 
              .sort((a,b) => a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1)
              .map((task) => (
              <div 
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                className={`
                  relative group p-4 rounded-xl border transition-all duration-300 cursor-pointer
                  ${activeTaskId === task.id ? 'bg-space-card border-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'bg-space-800 border-gray-800 hover:border-gray-600'}
                  ${task.isCompleted ? 'opacity-60 grayscale' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleTask(task.id); }}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                        ${task.isCompleted ? 'bg-neon-cyan border-neon-cyan' : 'border-gray-500 hover:border-neon-cyan'}
                      `}
                    >
                      {task.isCompleted && <Check size={14} className="text-black font-bold" />}
                    </button>
                    
                    <div>
                      <h3 className={`font-semibold text-lg ${task.isCompleted ? 'line-through text-gray-500' : 'text-white'}`}>
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{task.durationPerPomo}m</span>
                        </div>
                        <div className={`flex items-center gap-1 ${task.date === getToday() ? 'text-neon-cyan' : 'text-gray-500'}`}>
                          <Calendar size={12} />
                          <span>{formatDateDisplay(task.date)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="font-space text-lg font-bold text-gray-400">
                      <span className="text-neon-purple">{task.completedPomos}</span> 
                      <span className="mx-1 text-gray-600">/</span> 
                      <span>{task.estimatedPomos}</span>
                    </div>
                    
                    <button 
                      onClick={(e) => {
                         e.stopPropagation();
                         setEditingId(editingId === task.id ? null : task.id);
                      }}
                      className="p-2 hover:bg-white/5 rounded"
                    >
                      <MoreVertical size={16} className="text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Quick Edit Overlay */}
                {editingId === task.id && (
                   <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-between items-center w-full flex-wrap gap-2">
                          {/* Est Pomos */}
                          <div className="flex items-center gap-2">
                             <span className="text-sm text-gray-400">Pomos:</span>
                             <input 
                                type="number" 
                                min="1" 
                                max="10" 
                                className="bg-space-900 border border-gray-700 rounded w-14 px-2 py-1 text-white text-sm"
                                value={task.estimatedPomos}
                                onChange={(e) => onUpdatePomos(task.id, parseInt(e.target.value))}
                             />
                          </div>

                          {/* Duration Edit */}
                          <div className="flex items-center gap-2">
                             <span className="text-sm text-gray-400">Min:</span>
                             <input 
                                type="number" 
                                min="1" 
                                max="120" 
                                className="bg-space-900 border border-gray-700 rounded w-14 px-2 py-1 text-white text-sm"
                                value={task.durationPerPomo}
                                onChange={(e) => onUpdateDuration(task.id, parseInt(e.target.value) || 25)}
                             />
                          </div>

                          {/* Date Edit */}
                          <div className="flex items-center gap-2">
                             <span className="text-sm text-gray-400">Data:</span>
                             <input 
                                type="date" 
                                className="bg-space-900 border border-gray-700 rounded px-2 py-1 text-white text-sm [color-scheme:dark]"
                                value={task.date}
                                onChange={(e) => onUpdateDate(task.id, e.target.value)}
                             />
                          </div>
                      </div>

                      <button 
                         onClick={(e) => { onDeleteTask(task.id); }}
                         className="w-full py-2 bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 rounded flex items-center justify-center gap-2 text-sm font-bold uppercase"
                      >
                         <Trash2 size={14} /> EXCLUIR TAREFA
                      </button>
                   </div>
                )}
              </div>
            ))}
          </div>

          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full mt-6 py-4 rounded-xl border-2 border-dashed border-gray-700 text-gray-400 hover:border-neon-cyan hover:text-neon-cyan transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-wide group"
            >
              <div className="p-1 bg-gray-800 rounded-full group-hover:bg-neon-cyan group-hover:text-black transition-colors">
                <Plus size={20} />
              </div>
              Adicionar Tarefa
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 bg-space-card p-6 rounded-xl border border-neon-cyan/30 shadow-[0_0_20px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95">
              <div className="mb-4">
                <input
                  autoFocus
                  type="text"
                  placeholder="No que você está trabalhando?"
                  className="w-full bg-transparent text-xl font-bold text-white placeholder-gray-600 outline-none border-b border-gray-700 focus:border-neon-cyan pb-2"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Est. Pomodoros</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={estPomos}
                      onChange={(e) => setEstPomos(parseInt(e.target.value))}
                      className="bg-space-900 border border-gray-700 rounded px-3 py-2 w-full text-white focus:border-neon-cyan outline-none"
                    />
                  </div>
                </div>

                <div className="flex-1 min-w-[120px]">
                   <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Minutos / Pomo</label>
                   <input
                      type="number"
                      min="1"
                      max="90"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(parseInt(e.target.value))}
                      className="bg-space-900 border border-gray-700 rounded px-3 py-2 w-full text-white focus:border-neon-cyan outline-none"
                    />
                </div>

                <div className="flex-1 min-w-[140px]">
                   <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Data</label>
                   <input
                      type="date"
                      value={taskDate}
                      onChange={(e) => setTaskDate(e.target.value)}
                      className="bg-space-900 border border-gray-700 rounded px-3 py-2 w-full text-white focus:border-neon-cyan outline-none [color-scheme:dark]"
                    />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white font-bold"
                >
                  Cancelar
                </button>
                <NeonButton type="submit" variant="purple" glow>
                  Salvar Tarefa
                </NeonButton>
              </div>
            </form>
          )}

          {finishTime && (
            <div className="mt-8 py-4 px-6 bg-gradient-to-r from-space-900 to-space-800 border-t border-gray-800 flex justify-between items-center rounded-lg">
               <div className="text-gray-400">
                  Pomos: <span className="text-neon-cyan font-bold">{remainingPomosToday}</span>
               </div>
               <div className="text-gray-400">
                  Termina às: <span className="text-neon-purple font-bold text-xl ml-2">{finishTime}</span>
               </div>
            </div>
          )}
        </>
      )}

      {viewMode === 'history' && (
         <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {sortedDates.length === 0 ? (
               <div className="text-center py-10 text-gray-500">
                  <Archive size={40} className="mx-auto mb-2 opacity-50" />
                  <p>Nenhuma tarefa concluída ainda.</p>
               </div>
            ) : (
               sortedDates.map(date => {
                  const tasksForDate = completedTasksByDate[date];
                  const totalMinutes = tasksForDate.reduce((acc, t) => acc + (t.completedPomos * t.durationPerPomo), 0);
                  const hours = Math.floor(totalMinutes / 60);
                  const mins = totalMinutes % 60;
                  const timeDisplay = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

                  return (
                  <div key={date}>
                     <h3 className="text-neon-purple font-space text-lg mb-3 flex items-center justify-between border-b border-gray-800 pb-1">
                        <div className="flex items-center gap-2">
                            <Calendar size={16} />
                            {formatDateDisplay(date)}
                        </div>
                        <span className="text-sm font-tech text-gray-400 font-bold bg-space-900 px-2 py-0.5 rounded border border-gray-800">
                            {timeDisplay}
                        </span>
                     </h3>
                     <div className="space-y-2">
                        {tasksForDate.map(task => (
                           <div key={task.id} className="bg-space-card/50 border border-gray-800 rounded-lg p-3 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity group">
                              <div className="flex items-center gap-3">
                                 <div className="bg-neon-cyan/20 p-1 rounded-full">
                                    <Check size={14} className="text-neon-cyan" />
                                 </div>
                                 <span className="text-gray-300 line-through decoration-gray-600">{task.title}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-xs text-gray-500 font-bold">
                                   {task.completedPomos} Pomos
                                </div>
                                <button 
                                    onClick={() => onDeleteTask(task.id)}
                                    className="text-gray-600 hover:text-red-500 transition-colors p-1"
                                    title="Excluir do histórico"
                                >
                                    <Trash2 size={14} />
                                </button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )})
            )}
         </div>
      )}
    </div>
  );
};