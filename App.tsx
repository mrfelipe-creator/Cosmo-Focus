import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, BarChart2, Flame, RotateCcw, Globe, X, Target, Clock, Maximize, Minimize } from 'lucide-react';
import { Task, TimerMode, DailyStats, AppSettings } from './types';
import { NeonButton } from './components/NeonButton';
import { TaskList } from './components/TaskList';
import { StatsChart } from './components/StatsChart';

// Sound URLs
const SOUNDS = {
  alarm: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
  success: 'https://actions.google.com/sounds/v1/science_fiction/scifi_input_machine.ogg',
  fail: 'https://actions.google.com/sounds/v1/science_fiction/scifi_drone_power_down.ogg'
};

const playSound = (type: keyof typeof SOUNDS) => {
  const audio = new Audio(SOUNDS[type]);
  audio.volume = 0.5;
  const playPromise = audio.play();

  if (playPromise !== undefined) {
      playPromise.catch(e => console.log("Audio play failed", e));
  }

  // Requirement 1: Limit alarm sound to 5 seconds
  if (type === 'alarm') {
    setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
    }, 5000);
  }
};

// Helper function to get local date in YYYY-MM-DD format
// This avoids UTC issues where late night in Brazil counts as next day
const getToday = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Default Settings
const DEFAULT_SETTINGS: AppSettings = {
  pomodoroTime: 25,
  breakTime: 5,
  dailyGoalPomos: 8,
  streak: 0,
  lastActiveDate: getToday(),
};

// --- Helper for LocalStorage ---
function useStickyState<T>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

const App: React.FC = () => {
  // --- State ---
  const [mode, setMode] = useState<TimerMode>(TimerMode.POMODORO);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.pomodoroTime * 60);
  const [isActive, setIsActive] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Updated keys to 'cosmofocus-v1' to zero out the system
  const [settings, setSettings] = useStickyState<AppSettings>(DEFAULT_SETTINGS, 'cosmofocus-settings-v1');
  const [tasks, setTasks] = useStickyState<Task[]>([], 'cosmofocus-tasks-v1');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [dailyStats, setDailyStats] = useStickyState<DailyStats[]>([], 'cosmofocus-stats-v1');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Effects ---

  // Timer Logic
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleTimerComplete();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, timeLeft]);

  // Update timeLeft when mode or settings change (only if not active)
  useEffect(() => {
    if (!isActive) {
       resetTimerToMode(mode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.pomodoroTime, settings.breakTime]);

  // Check Streak on Load
  useEffect(() => {
    const today = getToday();
    if (today !== settings.lastActiveDate) {
       setSettings(prev => ({ ...prev, lastActiveDate: today }));
    }
    
    // Ensure today's stats entry exists
    setDailyStats(prev => {
      const exists = prev.find(s => s.date === today);
      if (!exists) {
        return [...prev, { date: today, pomodorosCompleted: 0, minutesFocused: 0, breaksTaken: 0, tasksCompleted: 0 }];
      }
      return prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Handlers ---

  const resetTimerToMode = (targetMode: TimerMode) => {
    const activeTask = tasks.find(t => t.id === activeTaskId);
    
    if (targetMode === TimerMode.POMODORO) {
      if (activeTask) {
        setTimeLeft(activeTask.durationPerPomo * 60);
      } else {
        setTimeLeft(settings.pomodoroTime * 60);
      }
    } else {
      setTimeLeft(settings.breakTime * 60);
    }
  };

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setIsActive(false);
    resetTimerToMode(newMode);
  };

  const handleTimerComplete = () => {
    setIsActive(false);
    const today = getToday();

    // Play Alarm Sound
    playSound('alarm');

    if (mode === TimerMode.POMODORO) {
      // Update Task
      if (activeTaskId) {
        setTasks(prev => prev.map(t => 
          t.id === activeTaskId 
            ? { ...t, completedPomos: t.completedPomos + 1 } 
            : t
        ));
      }

      // Update Stats
      setDailyStats(prev => prev.map(day => {
        if (day.date === today) {
          return {
            ...day,
            pomodorosCompleted: day.pomodorosCompleted + 1,
            minutesFocused: day.minutesFocused + (activeTaskId ? tasks.find(t => t.id === activeTaskId)?.durationPerPomo || settings.pomodoroTime : settings.pomodoroTime)
          };
        }
        return day;
      }));

      // Update Streak (simple increment for now, logic could be more complex for streaks)
      setSettings(prev => ({ ...prev, streak: prev.streak + 1 }));

      switchMode(TimerMode.BREAK);
    } else {
       // Break is over
       setDailyStats(prev => prev.map(day => {
        if (day.date === today) {
          return { ...day, breaksTaken: day.breaksTaken + 1 };
        }
        return day;
      }));
       switchMode(TimerMode.POMODORO);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    // Only play fail sound if timer was actually running or progressed
    const currentTotal = mode === TimerMode.POMODORO 
        ? (activeTaskId ? tasks.find(t => t.id === activeTaskId)?.durationPerPomo || settings.pomodoroTime : settings.pomodoroTime) * 60
        : settings.breakTime * 60;
    
    if (isActive || timeLeft !== currentTotal) {
        playSound('fail');
    }
    
    setIsActive(false);
    resetTimerToMode(mode);
  };

  const handleBreakChange = (newMinutes: number) => {
    setSettings(prev => ({ ...prev, breakTime: newMinutes }));
    // If currently in break mode and not active, update the timer immediately
    if (mode === TimerMode.BREAK && !isActive) {
      setTimeLeft(newMinutes * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercentage = () => {
    let total = 0;
    if (mode === TimerMode.POMODORO) {
       const activeTask = tasks.find(t => t.id === activeTaskId);
       total = (activeTask ? activeTask.durationPerPomo : settings.pomodoroTime) * 60;
    } else {
       total = settings.breakTime * 60;
    }

    if (total === 0) return 0;
    return ((total - timeLeft) / total) * 100;
  };

  // --- Task Handlers ---

  const addTask = (task: Omit<Task, 'id' | 'isCompleted' | 'completedPomos'>) => {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      isCompleted: false,
      completedPomos: 0
    };
    setTasks([...tasks, newTask]);
    if (!activeTaskId) setActiveTaskId(newTask.id);
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    if (activeTaskId === id) {
      setActiveTaskId(null);
      if (mode === TimerMode.POMODORO && !isActive) {
        setTimeLeft(settings.pomodoroTime * 60);
      }
    }
  };

  const updateTaskDate = (id: string, date: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, date } : t));
  };

  const updateTaskDuration = (id: string, duration: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, durationPerPomo: duration } : t));
    // If this task is active and timer is not running, update current timer
    if (activeTaskId === id && !isActive && mode === TimerMode.POMODORO) {
        setTimeLeft(duration * 60);
    }
  };

  const toggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newCompletionState = !task.isCompleted;
    setTasks(tasks.map(t => t.id === id ? { ...t, isCompleted: newCompletionState } : t));
    
    if (newCompletionState) {
        playSound('success');
    }

    // Update Daily Stats for Completed Tasks
    // Note: We count the task as completed "today" when the checkbox is clicked.
    const today = getToday();
    setDailyStats(prev => prev.map(day => {
      if (day.date === today) {
        return { 
          ...day, 
          tasksCompleted: Math.max(0, day.tasksCompleted + (newCompletionState ? 1 : -1))
        };
      }
      return day;
    }));
  };

  const selectTask = (id: string) => {
    setActiveTaskId(id);
    if (mode === TimerMode.POMODORO) {
      setIsActive(false); 
      const task = tasks.find(t => t.id === id);
      if (task) {
        setTimeLeft(task.durationPerPomo * 60);
      }
    }
  };

  const updatePomos = (id: string, newEstimate: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, estimatedPomos: newEstimate } : t));
  };

  // --- Data for Dashboard ---
  const todayDateStr = getToday();
  const todayStats = dailyStats.find(s => s.date === todayDateStr) || { pomodorosCompleted: 0, minutesFocused: 0, breaksTaken: 0, tasksCompleted: 0 };
  
  // Calculate Task Counts for Today
  const tasksForToday = tasks.filter(t => t.date === todayDateStr);
  const tasksCountTotal = tasksForToday.length;
  const tasksCountCompleted = tasksForToday.filter(t => t.isCompleted).length;

  // Calculate COMPLETED Minutes for Today
  // Logic: Sum of (estimated pomos * duration) for tasks that are completed and set for today.
  const completedMinutesToday = tasks
    .filter(t => t.date === todayDateStr && t.isCompleted)
    .reduce((acc, t) => acc + (t.estimatedPomos * t.durationPerPomo), 0);

  return (
    <div className="min-h-screen font-sans star-bg flex flex-col items-center py-8 px-4">
      {/* Header / Logo */}
      <header className={`w-full max-w-4xl flex justify-between items-center mb-10 transition-opacity duration-300 ${isFullscreen ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'}`}>
        <div className="flex items-center gap-4">
           <div>
              <h1 className="text-2xl font-space font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-purple">
                 COSMOFOCUS
              </h1>
              <p className="text-[10px] font-tech tracking-[0.3em] uppercase text-gray-500">FOCO ESTELAR</p>
           </div>
        </div>

        <div className="flex gap-4">
           <button 
             onClick={() => setShowReport(true)}
             className="flex items-center gap-2 bg-space-card border border-neon-purple/30 px-3 py-1 rounded text-neon-purple text-sm font-bold shadow-[0_0_10px_rgba(188,19,254,0.2)] hover:bg-neon-purple/10 transition-colors"
           >
              <BarChart2 size={16} /> Relatório
           </button>
        </div>
      </header>

      {/* Main Timer Card */}
      <div 
        className={`
          transition-all duration-700 ease-in-out
          ${isFullscreen 
            ? 'fixed inset-0 z-50 w-full h-full bg-space-900/95 backdrop-blur-3xl flex flex-col justify-center items-center p-8' 
            : 'w-full max-w-lg bg-space-card/80 backdrop-blur-md rounded-3xl border border-white/10 p-8 shadow-2xl relative overflow-hidden'
          }
        `}
      >
        {/* Fullscreen Toggle */}
        <button 
          onClick={() => setIsFullscreen(!isFullscreen)}
          className={`absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-20 ${isFullscreen ? 'bg-white/10 p-2 rounded-full' : ''}`}
          title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
        >
          {isFullscreen ? <Minimize size={24} /> : <Maximize size={20} />}
        </button>

        {/* Glow Effects */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent ${mode === TimerMode.POMODORO ? 'via-neon-cyan' : 'via-neon-purple'} to-transparent shadow-[0_0_20px_rgba(0,240,255,0.5)]`} />
        
        {/* Mode Switcher */}
        <div className={`flex justify-center gap-4 mb-6 relative z-10 ${isFullscreen ? 'scale-125 mb-10' : ''}`}>
          {[
            { id: TimerMode.POMODORO, label: 'Pomodoro' },
            { id: TimerMode.BREAK, label: 'Pausa' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => switchMode(m.id as TimerMode)}
              className={`px-6 py-2 rounded-full text-sm font-bold tracking-wider transition-all duration-300 ${
                mode === m.id 
                  ? 'bg-space-900 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/20' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Timer Display */}
        <div className={`text-center mb-8 relative ${isFullscreen ? 'scale-125 mb-16' : ''}`}>
           <div className={`text-[7rem] leading-none font-space font-bold tabular-nums tracking-tighter drop-shadow-lg ${mode === TimerMode.POMODORO ? 'text-white' : 'text-neon-purple'} ${isFullscreen ? 'text-[10rem]' : ''}`}>
             {formatTime(timeLeft)}
           </div>
           
           {/* Progress Bar under numbers */}
           <div className={`h-1.5 bg-gray-800 rounded-full mx-auto mt-4 overflow-hidden shadow-[0_0_10px_rgba(0,0,0,0.5)] border border-gray-700/50 ${isFullscreen ? 'w-96' : 'w-48'}`}>
             <div 
                className={`h-full transition-all duration-1000 ease-linear ${mode === TimerMode.POMODORO ? 'bg-neon-cyan shadow-[0_0_10px_#00F0FF]' : 'bg-neon-purple shadow-[0_0_10px_#BC13FE]'}`} 
                style={{ width: `${progressPercentage()}%` }}
             />
           </div>

           <p className="text-gray-400 font-tech uppercase tracking-widest mt-4 text-sm">
             {isActive ? 'Sistema Ativo' : 'Sistema em Espera'}
           </p>

           {/* Break Duration Customizer */}
           {mode === TimerMode.BREAK && !isActive && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                 <label className="text-xs text-gray-500 mr-2 uppercase">Tempo de Pausa (min):</label>
                 <input 
                    type="number" 
                    min="1" 
                    max="60"
                    value={settings.breakTime}
                    onChange={(e) => handleBreakChange(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-16 bg-space-900 border border-neon-purple/50 rounded text-center text-neon-purple font-bold outline-none focus:ring-1 focus:ring-neon-purple"
                 />
              </div>
           )}
        </div>

        {/* Controls */}
        <div className={`flex justify-center items-center gap-4 relative z-10 ${isFullscreen ? 'scale-125' : ''}`}>
           <NeonButton 
              variant={mode === TimerMode.POMODORO ? 'cyan' : 'purple'} 
              glow 
              onClick={toggleTimer}
              className="w-40 text-xl py-4 flex items-center justify-center gap-2 rounded-xl"
           >
              {isActive ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
              {isActive ? 'PAUSAR' : 'INICIAR'}
           </NeonButton>
           
           <div className="flex gap-2">
             <button 
                onClick={resetTimer} 
                className="w-12 h-12 rounded-lg border border-gray-600 bg-space-900/50 text-gray-400 hover:text-white hover:border-white hover:bg-white/10 transition-all flex items-center justify-center"
                title="Reiniciar Timer"
             >
                <RotateCcw size={20} />
             </button>
             
             {isActive && (
               <button 
                  onClick={handleTimerComplete} 
                  className="w-12 h-12 rounded-lg border border-gray-600 bg-space-900/50 text-gray-400 hover:text-white hover:border-white hover:bg-white/10 transition-all flex items-center justify-center"
                  title="Pular"
               >
                  <SkipForward size={20} />
               </button>
             )}
           </div>
        </div>
      </div>

      {/* Goal & Streak Dashboard */}
      <div className={`w-full max-w-2xl grid grid-cols-2 md:grid-cols-3 gap-4 mt-8 transition-opacity duration-300 ${isFullscreen ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'}`}>
         {/* Ofensiva -> Pomodoros Today */}
         <div className="bg-space-card/50 border border-gray-800 p-4 rounded-xl flex flex-col items-center">
            <div className="flex items-center gap-2 text-neon-purple mb-1">
               <Flame size={18} fill="currentColor" />
               <span className="font-tech font-bold uppercase">Ofensiva</span>
            </div>
            <span className="text-2xl font-space text-white">{todayStats.pomodorosCompleted} <span className="text-xs text-gray-500">Pomos</span></span>
         </div>

         {/* Hoje -> Tasks for Today (Foco Atual - Tarefas) */}
         <div className="bg-space-card/50 border border-gray-800 p-4 rounded-xl flex flex-col items-center">
            <div className="flex items-center gap-2 text-neon-cyan mb-1">
               <Target size={18} />
               <span className="font-tech font-bold uppercase">Tarefas</span>
            </div>
            {/* Requirement 2: Show Completed/Total */}
            <span className="text-2xl font-space text-white">{tasksCountCompleted}/{tasksCountTotal}</span>
         </div>

         {/* Focus Time (Completed for Today) (Foco Atual - Minutos) */}
         <div className="bg-space-card/50 border border-gray-800 p-4 rounded-xl flex flex-col items-center col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
               <Clock size={18} />
               <span className="font-tech font-bold uppercase">Minutos Concluídos</span>
            </div>
            <span className="text-2xl font-space text-white">
               {Math.floor(completedMinutesToday / 60)}<span className="text-sm text-gray-500">h</span> {completedMinutesToday % 60}<span className="text-sm text-gray-500">m</span>
            </span>
         </div>
      </div>

      {/* Task List */}
      <div className={`w-full transition-opacity duration-300 ${isFullscreen ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'}`}>
        <TaskList 
          tasks={tasks}
          activeTaskId={activeTaskId}
          onAddTask={addTask}
          onDeleteTask={deleteTask}
          onToggleTask={toggleTask}
          onSelectTask={selectTask}
          onUpdatePomos={updatePomos}
          onUpdateDate={updateTaskDate}
          onUpdateDuration={updateTaskDuration}
        />
      </div>

      {/* Modal Report */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowReport(false)}>
            <div 
               className="bg-space-card border border-neon-purple/50 p-6 rounded-2xl w-full max-w-2xl shadow-[0_0_50px_rgba(188,19,254,0.2)] relative" 
               onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="font-space text-2xl text-white flex items-center gap-2">
                        <BarChart2 className="text-neon-purple" />
                        REGISTRO DE ATIVIDADE
                    </h2>
                    <button onClick={() => setShowReport(false)} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="h-80 w-full bg-space-900/50 rounded-lg p-4 border border-gray-800">
                    <StatsChart data={dailyStats} />
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-space-900 rounded border border-gray-800">
                        <span className="text-gray-400 text-xs uppercase block">Total de Pausas</span>
                        <span className="text-xl font-space text-amber-500">{dailyStats.reduce((acc, curr) => acc + curr.breaksTaken, 0)}</span>
                    </div>
                     <div className="p-4 bg-space-900 rounded border border-gray-800">
                        <span className="text-gray-400 text-xs uppercase block">Tarefas Concluídas</span>
                        <span className="text-xl font-space text-blue-500">{dailyStats.reduce((acc, curr) => acc + (curr.tasksCompleted || 0), 0)}</span>
                    </div>
                    <div className="p-4 bg-space-900 rounded border border-gray-800">
                        <span className="text-gray-400 text-xs uppercase block">Foco Total (Min)</span>
                        <span className="text-xl font-space text-neon-purple">{dailyStats.reduce((acc, curr) => acc + curr.minutesFocused, 0)}</span>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default App;