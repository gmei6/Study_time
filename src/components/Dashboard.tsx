import React from 'react';
import { motion } from 'motion/react';
import { Semester, Subject, StudySession } from '../types';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, subDays, subWeeks, startOfDay, endOfDay, differenceInDays, addDays } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  subjects: Subject[];
  sessions: StudySession[];
  semesters: Semester[];
}

export default function Dashboard({ subjects, sessions, semesters }: DashboardProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  
  const rollingWeekStart = startOfDay(subDays(new Date(), 6));
  const rollingWeekEnd = endOfDay(new Date());
  const lastRollingWeekStart = startOfDay(subDays(new Date(), 13));
  const lastRollingWeekEnd = endOfDay(subDays(new Date(), 7));

  const activeSemester = semesters.find(s => s.isActive);
  const previousSemester = activeSemester 
    ? semesters
        .filter(s => parseISO(s.endDate).getTime() < parseISO(activeSemester.startDate).getTime())
        .sort((a, b) => parseISO(b.endDate).getTime() - parseISO(a.endDate).getTime())[0]
    : null;

  const todayDate = startOfDay(new Date());
  
  let semesterTotal = 0;
  let lastSemesterTotal = 0;
  let daysIntoSemester = 0;

  if (activeSemester) {
    const semStart = parseISO(activeSemester.startDate);
    const semEnd = parseISO(activeSemester.endDate);
    
    // Calculate how many days into the semester we are
    const effectiveToday = todayDate < semStart ? semStart : (todayDate > semEnd ? semEnd : todayDate);
    daysIntoSemester = differenceInDays(effectiveToday, semStart);

    // Current semester total up to today (rolling)
    semesterTotal = sessions
      .filter(s => {
        const sessionDate = parseISO(s.dateLogged);
        return isWithinInterval(sessionDate, { start: semStart, end: effectiveToday });
      })
      .reduce((acc, s) => acc + s.durationSeconds, 0) / 60;

    if (previousSemester) {
      const prevStart = parseISO(previousSemester.startDate);
      const prevEnd = parseISO(previousSemester.endDate);
      
      // Calculate previous semester total for the same number of days (rolling)
      const prevComparisonEnd = addDays(prevStart, daysIntoSemester);
      const effectivePrevEnd = prevComparisonEnd > prevEnd ? prevEnd : prevComparisonEnd;

      lastSemesterTotal = sessions
        .filter(s => {
          const sessionDate = parseISO(s.dateLogged);
          return isWithinInterval(sessionDate, { start: prevStart, end: effectivePrevEnd });
        })
        .reduce((acc, s) => acc + s.durationSeconds, 0) / 60;
    }
  }

  const todayTotal = sessions
    .filter(s => s.dateLogged === today)
    .reduce((acc, s) => acc + s.durationSeconds, 0) / 60;

  const yesterdayTotal = sessions
    .filter(s => s.dateLogged === yesterday)
    .reduce((acc, s) => acc + s.durationSeconds, 0) / 60;

  const weeklyTotal = sessions
    .filter(s => {
      const sessionDate = parseISO(s.dateLogged);
      return isWithinInterval(sessionDate, { start: rollingWeekStart, end: rollingWeekEnd });
    })
    .reduce((acc, s) => acc + s.durationSeconds, 0) / 60;

  const lastWeeklyTotal = sessions
    .filter(s => {
      const sessionDate = parseISO(s.dateLogged);
      return isWithinInterval(sessionDate, { start: lastRollingWeekStart, end: lastRollingWeekEnd });
    })
    .reduce((acc, s) => acc + s.durationSeconds, 0) / 60;

  const activeSubjects = subjects.filter(s => !s.isArchived);
  const maxGoal = activeSubjects.length > 0 
    ? Math.max(...activeSubjects.map(s => s.dailyGoalMinutes)) 
    : 1;

  const formatComparison = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const diff = ((current - previous) / previous) * 100;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${Math.round(diff)}%`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return '0m';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      <motion.div 
        whileHover={{ scale: 1.02 }}
        className="midnight-panel flex flex-col items-center justify-center text-center relative overflow-hidden"
      >
        <span className="text-gray-500 text-sm font-semibold uppercase tracking-widest mb-2">Today</span>
        <h2 className="text-5xl font-bold text-white">{formatDuration(todayTotal)}</h2>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${todayTotal >= yesterdayTotal ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {formatComparison(todayTotal, yesterdayTotal)}
          </span>
          <span className="text-gray-600 text-xs">vs yesterday</span>
        </div>
      </motion.div>

      <motion.div 
        whileHover={{ scale: 1.02 }}
        className="midnight-panel flex flex-col items-center justify-center text-center relative overflow-hidden"
      >
        <span className="text-gray-500 text-sm font-semibold uppercase tracking-widest mb-2">Weekly</span>
        <h2 className="text-5xl font-bold text-white">{Math.round(weeklyTotal / 60)}h</h2>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${weeklyTotal >= lastWeeklyTotal ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {formatComparison(weeklyTotal, lastWeeklyTotal)}
          </span>
          <span className="text-gray-600 text-xs">vs last week</span>
        </div>
      </motion.div>

      <motion.div 
        whileHover={{ scale: 1.02 }}
        className="midnight-panel flex flex-col items-center justify-center text-center relative overflow-hidden"
      >
        <span className="text-gray-500 text-sm font-semibold uppercase tracking-widest mb-2">Semester</span>
        <h2 className="text-5xl font-bold text-white">{Math.round(semesterTotal / 60)}h</h2>
        {previousSemester && (
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${semesterTotal >= lastSemesterTotal ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              {formatComparison(semesterTotal, lastSemesterTotal)}
            </span>
            <span className="text-gray-600 text-xs">vs same period last semester</span>
          </div>
        )}
        {!previousSemester && <p className="text-gray-600 mt-2">Active Semester</p>}
      </motion.div>

      <div className="md:col-span-3 midnight-panel">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Daily Goals</h3>
          {subjects.filter(s => !s.isArchived).length > 0 && (
            <div className="text-right">
              <span className="text-gray-500 text-xs uppercase tracking-widest block mb-1">Total Remaining</span>
              <span className="text-xl font-bold text-white">
                {formatDuration(Math.max(0, Math.round(
                  subjects.filter(s => !s.isArchived).reduce((acc, s) => acc + s.dailyGoalMinutes, 0) - 
                  sessions.filter(s => s.dateLogged === today).reduce((acc, s) => acc + s.durationSeconds, 0) / 60
                )))}
              </span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6">
          {activeSubjects
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(subject => {
            const goal = subject.dailyGoalMinutes || 1;
            const subjectToday = sessions
              .filter(s => s.dateLogged === today && s.subjectId === subject.id)
              .reduce((acc, s) => acc + s.durationSeconds, 0) / 60;
            const isGoalReached = subjectToday >= goal;
            const progress = Math.min(100, (subjectToday / goal) * 100);
            const span = Math.max(3, Math.round((goal / maxGoal) * 12));

            return (
              <div 
                key={subject.id} 
                className={`flex flex-col p-4 rounded-3xl transition-all duration-500 ${isGoalReached ? 'bg-white/[0.03] ring-1 ring-white/10 shadow-[0_0_20px_rgba(255,255,255,0.02)]' : ''}`}
                style={{ gridColumn: `span ${span} / span ${span}` }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`font-bold text-sm tracking-tight whitespace-normal ${isGoalReached ? 'text-white' : 'text-gray-400'}`}>
                      {subject.name}
                    </span>
                    {isGoalReached && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-emerald-500 shrink-0"
                      >
                        <CheckCircle2 size={14} />
                      </motion.div>
                    )}
                  </div>
                  <span className={`text-[10px] font-mono whitespace-nowrap ml-2 ${isGoalReached ? 'text-emerald-500 font-bold' : 'text-gray-600'}`}>
                    {Math.round(subjectToday)} / {goal}m
                  </span>
                </div>
                <div className={`h-2.5 bg-[#1A1A1A] rounded-full overflow-hidden relative ${isGoalReached ? 'shadow-[0_0_10px_rgba(0,0,0,0.5)]' : ''}`}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className={`h-full rounded-full relative z-10 ${isGoalReached ? 'brightness-125' : ''}`}
                    style={{ 
                      backgroundColor: subject.color,
                      boxShadow: isGoalReached ? `0 0 15px ${subject.color}44` : 'none'
                    }}
                  />
                  {isGoalReached && (
                    <motion.div 
                      animate={{ 
                        opacity: [0.2, 0.5, 0.2],
                        x: ['-100%', '100%']
                      }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      className="absolute inset-0 z-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
