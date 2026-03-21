import React from 'react';
import { motion } from 'motion/react';
import { Subject, StudySession } from '../types';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

interface DashboardProps {
  subjects: Subject[];
  sessions: StudySession[];
}

export default function Dashboard({ subjects, sessions }: DashboardProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());

  const todayTotal = sessions
    .filter(s => s.dateLogged === today)
    .reduce((acc, s) => acc + s.durationSeconds, 0) / 60;

  const weeklyTotal = sessions
    .filter(s => {
      const sessionDate = new Date(s.dateLogged);
      return isWithinInterval(sessionDate, { start: weekStart, end: weekEnd });
    })
    .reduce((acc, s) => acc + s.durationSeconds, 0) / 60;

  const allTimeTotal = sessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      <motion.div 
        whileHover={{ scale: 1.02 }}
        className="midnight-panel flex flex-col items-center justify-center text-center"
      >
        <span className="text-gray-500 text-sm font-semibold uppercase tracking-widest mb-2">Today</span>
        <h2 className="text-5xl font-bold text-white">{Math.round(todayTotal)}m</h2>
        <p className="text-gray-600 mt-2">Daily Total</p>
      </motion.div>

      <motion.div 
        whileHover={{ scale: 1.02 }}
        className="midnight-panel flex flex-col items-center justify-center text-center"
      >
        <span className="text-gray-500 text-sm font-semibold uppercase tracking-widest mb-2">Weekly</span>
        <h2 className="text-5xl font-bold text-white">{Math.round(weeklyTotal / 60)}h</h2>
        <p className="text-gray-600 mt-2">Rolling Total</p>
      </motion.div>

      <motion.div 
        whileHover={{ scale: 1.02 }}
        className="midnight-panel flex flex-col items-center justify-center text-center"
      >
        <span className="text-gray-500 text-sm font-semibold uppercase tracking-widest mb-2">Semester</span>
        <h2 className="text-5xl font-bold text-white">{Math.round(allTimeTotal / 60)}h</h2>
        <p className="text-gray-600 mt-2">Active Semester</p>
      </motion.div>

      <div className="md:col-span-3 midnight-panel">
        <h3 className="text-xl font-bold text-white mb-6">Daily Goals</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {subjects.filter(s => !s.isArchived).map(subject => {
            const subjectToday = sessions
              .filter(s => s.dateLogged === today && s.subjectId === subject.id)
              .reduce((acc, s) => acc + s.durationSeconds, 0) / 60;
            const progress = Math.min(100, (subjectToday / subject.dailyGoalMinutes) * 100);

            return (
              <div key={subject.id} className="flex flex-col">
                <div className="flex justify-between items-end mb-2">
                  <span className="font-semibold text-gray-300">{subject.name}</span>
                  <span className="text-sm text-gray-500">{Math.round(subjectToday)} / {subject.dailyGoalMinutes}m</span>
                </div>
                <div className="h-4 bg-[#1A1A1A] rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: subject.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
