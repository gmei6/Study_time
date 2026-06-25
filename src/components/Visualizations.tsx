import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Subject, StudySession, Semester, ShortTermGoal } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, isSameDay, startOfWeek, eachWeekOfInterval, isSameWeek, parseISO, min, max, isWithinInterval, eachMonthOfInterval, isSameMonth } from 'date-fns';

interface VisualizationsProps {
  subjects: Subject[];
  sessions: StudySession[];
  semesters: Semester[];
  shortTermGoals: ShortTermGoal[];
}

const CustomTooltip = ({ active, payload, label, formatDuration, subjects }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((acc: number, entry: any) => acc + (entry.value || 0), 0);
    
    return (
      <div className="bg-[#121212] rounded-[24px] border border-white/10 p-4 shadow-2xl backdrop-blur-md">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">{label}</p>
        <div className="space-y-2 mb-3">
          {[...payload].reverse().map((entry: any, index: number) => {
            const subject = subjects.find((s: any) => s.name === entry.name);
            return (
              <div key={index} className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || subject?.color }} />
                  <span className="text-sm text-gray-300">{entry.name}</span>
                </div>
                <span className="text-sm font-bold text-white">{formatDuration(entry.value)}</span>
              </div>
            );
          })}
        </div>
        <div className="pt-3 border-t border-white/5 flex justify-between items-center">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total</span>
          <span className="text-sm font-bold text-emerald-500">{formatDuration(total)}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function Visualizations({ subjects, sessions, semesters, shortTermGoals }: VisualizationsProps) {
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [range, setRange] = useState<string>('7d');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [showAverageLine, setShowAverageLine] = useState<boolean>(true);
  const [showRecentLine, setShowRecentLine] = useState<boolean>(true);

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return '0m';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const data = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    if (range === 'all' && sessions.length > 0) {
      const dates = sessions.map(s => parseISO(s.dateLogged));
      start = min(dates);
      end = max(dates);
    } else if (range === 'semester') {
      const activeSem = semesters.find(s => s.isActive);
      if (activeSem) {
        start = parseISO(activeSem.startDate);
        end = parseISO(activeSem.endDate);
      } else {
        start = subDays(now, 6);
      }
    } else if (range.startsWith('goal-')) {
      const goalId = range.replace('goal-', '');
      const goal = shortTermGoals.find(g => g.id === goalId);
      if (goal) {
        start = parseISO(goal.startDate);
        end = parseISO(goal.endDate);
      } else {
        start = subDays(now, 6);
      }
    } else {
      const days = range === '7d' ? 6 : 29;
      start = subDays(now, days);
    }

    const interval = granularity === 'day' 
      ? eachDayOfInterval({ start, end })
      : granularity === 'week'
        ? eachWeekOfInterval({ start, end })
        : eachMonthOfInterval({ start, end });

    return interval.map(date => {
      const label = granularity === 'day' 
        ? format(date, 'MMM dd') 
        : granularity === 'week'
          ? `Week of ${format(date, 'MMM dd')}`
          : format(date, 'MMM yyyy');
      const row: any = { name: label };
      
      [...subjects]
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .forEach(subject => {
        if (selectedSubjectIds.length > 0 && !selectedSubjectIds.includes(subject.id)) return;
        
        const subjectSessions = sessions.filter(s => {
          const sessionDate = parseISO(s.dateLogged);
          return granularity === 'day' 
            ? isSameDay(sessionDate, date)
            : granularity === 'week'
              ? isSameWeek(sessionDate, date)
              : isSameMonth(sessionDate, date);
        });

        const minutes = subjectSessions
          .filter(s => s.subjectId === subject.id)
          .reduce((acc, s) => acc + (s.durationSeconds || 0), 0) / 60;
        
        row[subject.name] = Math.round(minutes) || 0;
      });

      return row;
    });
  }, [granularity, range, subjects, sessions, selectedSubjectIds]);

  const allTotals = useMemo(() => {
    return data.map(row => {
      let sum = 0;
      subjects.forEach(subject => {
        if (selectedSubjectIds.length === 0 || selectedSubjectIds.includes(subject.id)) {
          sum += row[subject.name] || 0;
        }
      });
      return sum;
    });
  }, [data, subjects, selectedSubjectIds]);

  const averageTotal = useMemo(() => {
    if (allTotals.length === 0) return 0;
    const totalSum = allTotals.reduce((acc, val) => acc + val, 0);
    return totalSum / allTotals.length;
  }, [allTotals]);

  const mostRecentTotal = useMemo(() => {
    if (allTotals.length === 0) return 0;
    return allTotals[allTotals.length - 1];
  }, [allTotals]);

  const periodsStudiedMore = useMemo(() => {
    if (allTotals.length <= 1) return 0;
    const recent = allTotals[allTotals.length - 1];
    const previousTotals = allTotals.slice(0, -1);
    return previousTotals.filter(total => total > recent).length;
  }, [allTotals]);

  const rankPercentile = useMemo(() => {
    if (allTotals.length === 0) return 0;
    if (allTotals.length === 1) return 100;
    
    const recent = allTotals[allTotals.length - 1];
    const otherTotals = allTotals.slice(0, -1);
    if (otherTotals.length === 0) return 100;

    const strictlyLess = otherTotals.filter(val => val < recent).length;
    const equals = otherTotals.filter(val => val === recent).length;
    
    const percentile = ((strictlyLess + equals * 0.5) / otherTotals.length) * 100;
    return Math.round(percentile);
  }, [allTotals]);

  const totalMinutes = useMemo(() => {
    const now = new Date();
    let start: Date;
    const end: Date = now;

    if (range === 'all' && sessions.length > 0) {
      const dates = sessions.map(s => parseISO(s.dateLogged));
      start = min(dates);
    } else if (range === 'semester') {
      const activeSem = semesters.find(s => s.isActive);
      if (activeSem) {
        start = parseISO(activeSem.startDate);
      } else {
        start = subDays(now, 6);
      }
    } else if (range.startsWith('goal-')) {
      const goalId = range.replace('goal-', '');
      const goal = shortTermGoals.find(g => g.id === goalId);
      if (goal) {
        start = parseISO(goal.startDate);
      } else {
        start = subDays(now, 6);
      }
    } else {
      const days = range === '7d' ? 6 : 29;
      start = subDays(now, days);
    }

    return sessions
      .filter(s => {
        const sessionDate = parseISO(s.dateLogged);
        const isInRange = isWithinInterval(sessionDate, { start: startOfDay(start), end: endOfDay(end) });
        const isSelectedSubject = selectedSubjectIds.length === 0 || selectedSubjectIds.includes(s.subjectId);
        return isInRange && isSelectedSubject;
      })
      .reduce((acc, s) => acc + s.durationSeconds, 0) / 60;
  }, [range, sessions, selectedSubjectIds]);

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="midnight-panel mb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex flex-col">
          <h3 className="text-2xl font-bold text-white">Study Trends</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Total:</span>
            <span className="text-emerald-500 font-mono font-bold">{formatDuration(totalMinutes)}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2 bg-[#050505] p-1 rounded-[24px] overflow-x-auto no-scrollbar max-w-[400px]">
            {(['7d', '30d', 'semester', 'all'] as const).map((r) => (
              <button 
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-2 rounded-[20px] text-xs font-semibold transition-all whitespace-nowrap ${range === r ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
              >
                {r === 'all' ? 'All Time' : r === 'semester' ? 'Semester' : r}
              </button>
            ))}
            {shortTermGoals.filter(g => g.isActive).map(goal => (
              <button 
                key={goal.id}
                onClick={() => setRange(`goal-${goal.id}`)}
                className={`px-4 py-2 rounded-[20px] text-xs font-semibold transition-all whitespace-nowrap ${range === `goal-${goal.id}` ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
              >
                {goal.name}
              </button>
            ))}
          </div>

          <div className="flex gap-2 bg-[#050505] p-1 rounded-[24px]">
            <button 
              onClick={() => setGranularity('day')}
              className={`px-6 py-2 rounded-[20px] text-sm font-semibold transition-all ${granularity === 'day' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
            >
              Daily
            </button>
            <button 
              onClick={() => setGranularity('week')}
              className={`px-6 py-2 rounded-[20px] text-sm font-semibold transition-all ${granularity === 'week' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
            >
              Weekly
            </button>
            <button 
              onClick={() => setGranularity('month')}
              className={`px-6 py-2 rounded-[20px] text-sm font-semibold transition-all ${granularity === 'month' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {subjects
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map(subject => (
          <button 
            key={subject.id}
            onClick={() => toggleSubject(subject.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
              selectedSubjectIds.includes(subject.id) 
                ? 'border-white text-white' 
                : 'border-transparent text-gray-500 bg-[#1A1A1A]'
            }`}
            style={{ 
              backgroundColor: selectedSubjectIds.includes(subject.id) ? subject.color : undefined,
              color: selectedSubjectIds.includes(subject.id) ? '#000' : undefined
            }}
          >
            {subject.name}
          </button>
        ))}
        {selectedSubjectIds.length > 0 && (
          <button 
            onClick={() => setSelectedSubjectIds([])}
            className="px-4 py-2 rounded-full text-xs font-bold text-gray-400 hover:text-white transition-all"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#555" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#555" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(val) => val >= 60 ? `${Math.floor(val/60)}h` : `${val}m`}
            />
            <Tooltip 
              content={
                <CustomTooltip 
                  formatDuration={formatDuration} 
                  subjects={subjects} 
                />
              }
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            {[...subjects]
              .sort((a, b) => (b.order || 0) - (a.order || 0))
              .map(subject => (
              (selectedSubjectIds.length === 0 || selectedSubjectIds.includes(subject.id)) && (
                <Bar 
                  key={subject.id}
                  dataKey={subject.name} 
                  stackId="1"
                  fill={subject.color} 
                  radius={[0, 0, 0, 0]}
                />
              )
            ))}
            {showAverageLine && averageTotal > 0 && (
              <ReferenceLine 
                y={averageTotal} 
                stroke="#10b981" 
                strokeDasharray="4 4" 
                strokeWidth={2}
                label={{ 
                  value: `Avg: ${formatDuration(averageTotal)}`, 
                  fill: '#10b981', 
                  position: 'top',
                  fontSize: 12,
                  fontWeight: 'bold',
                  fontFamily: 'JetBrains Mono, monospace'
                }} 
              />
            )}
            {showRecentLine && mostRecentTotal > 0 && (
              <ReferenceLine 
                y={mostRecentTotal} 
                stroke="#3b82f6" 
                strokeDasharray="4 4" 
                strokeWidth={2}
                label={{ 
                  value: `${granularity === 'day' ? 'Today' : granularity === 'week' ? 'This Week' : 'This Month'}: ${formatDuration(mostRecentTotal)}`, 
                  fill: '#3b82f6', 
                  position: 'top',
                  fontSize: 12,
                  fontWeight: 'bold',
                  fontFamily: 'JetBrains Mono, monospace'
                }} 
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Performance & Ranking Analysis Panel */}
      <div className="mt-6 bg-[#050505]/60 border border-white/5 rounded-2xl p-5">
        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 font-mono">
          {granularity === 'day' ? "Today's" : granularity === 'week' ? "This Week's" : "This Month's"} Performance Insights
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0c0c0c] border border-white/5 p-4 rounded-xl flex flex-col justify-between">
            <span className="text-xs font-medium text-gray-400">
              {granularity === 'day' ? 'Daily' : granularity === 'week' ? 'Weekly' : 'Monthly'} Average
            </span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-2 block">
              {formatDuration(averageTotal)}
            </span>
            <span className="text-[10px] text-gray-500 mt-1 block">
              Across selected range
            </span>
          </div>

          <div className="bg-[#0c0c0c] border border-white/5 p-4 rounded-xl flex flex-col justify-between">
            <span className="text-xs font-medium text-gray-400">
              {granularity === 'day' ? "Today's Total" : granularity === 'week' ? "This Week's Total" : "This Month's Total"}
            </span>
            <span className="text-xl font-bold font-mono text-blue-400 mt-2 block">
              {formatDuration(mostRecentTotal)}
            </span>
            <span className="text-[10px] text-gray-500 mt-1 block">
              Current active period
            </span>
          </div>

          <div className="bg-[#0c0c0c] border border-white/5 p-4 rounded-xl flex flex-col justify-between">
            <span className="text-xs font-medium text-gray-400">
              Higher Study Periods
            </span>
            <span className="text-xl font-bold font-mono text-indigo-400 mt-2 block">
              {periodsStudiedMore} {periodsStudiedMore === 1 ? (granularity === 'day' ? 'day' : granularity === 'week' ? 'week' : 'month') : (granularity === 'day' ? 'days' : granularity === 'week' ? 'weeks' : 'months')}
            </span>
            <span className="text-[10px] text-gray-500 mt-1 block">
              Studied more than {granularity === 'day' ? 'today' : granularity === 'week' ? 'this week' : 'this month'}
            </span>
          </div>

          <div className="bg-[#0c0c0c] border border-white/5 p-4 rounded-xl flex flex-col justify-between">
            <span className="text-xs font-medium text-gray-400">
              Percentile Rank
            </span>
            <span className="text-xl font-bold font-mono text-amber-400 mt-2 block">
              {rankPercentile}%
            </span>
            <span className="text-[10px] text-gray-500 mt-1 block">
              Better than {rankPercentile}% of other {granularity === 'day' ? 'days' : granularity === 'week' ? 'weeks' : 'months'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between mt-6 pt-6 border-t border-white/5 gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-400 hover:text-white transition-all">
            <input 
              type="checkbox" 
              checked={showAverageLine} 
              onChange={(e) => setShowAverageLine(e.target.checked)}
              className="rounded border-white/10 bg-[#050505] text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 w-4 h-4 cursor-pointer"
            />
            <span>Show Average Line</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-400 hover:text-white transition-all">
            <input 
              type="checkbox" 
              checked={showRecentLine} 
              onChange={(e) => setShowRecentLine(e.target.checked)}
              className="rounded border-white/10 bg-[#050505] text-blue-500 focus:ring-blue-500 focus:ring-offset-0 w-4 h-4 cursor-pointer"
            />
            <span>Show Today / Recent Line</span>
          </label>
        </div>
      </div>
    </div>
  );
}
