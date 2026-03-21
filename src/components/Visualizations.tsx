import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Subject, StudySession } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval, isSameDay, startOfWeek, eachWeekOfInterval, isSameWeek } from 'date-fns';

interface VisualizationsProps {
  subjects: Subject[];
  sessions: StudySession[];
}

export default function Visualizations({ subjects, sessions }: VisualizationsProps) {
  const [granularity, setGranularity] = useState<'day' | 'week'>('day');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const data = useMemo(() => {
    const now = new Date();
    const interval = granularity === 'day' 
      ? eachDayOfInterval({ start: subDays(now, 13), end: now })
      : eachWeekOfInterval({ start: subDays(now, 60), end: now });

    return interval.map(date => {
      const label = granularity === 'day' ? format(date, 'MMM dd') : `Week of ${format(date, 'MMM dd')}`;
      const row: any = { name: label };
      
      subjects.forEach(subject => {
        if (selectedSubjectIds.length > 0 && !selectedSubjectIds.includes(subject.id)) return;
        
        const subjectSessions = sessions.filter(s => {
          const sessionDate = new Date(s.dateLogged);
          return granularity === 'day' 
            ? isSameDay(sessionDate, date)
            : isSameWeek(sessionDate, date);
        });

        const minutes = subjectSessions
          .filter(s => s.subjectId === subject.id)
          .reduce((acc, s) => acc + s.durationSeconds, 0) / 60;
        
        row[subject.name] = Math.round(minutes);
      });

      return row;
    });
  }, [granularity, subjects, sessions, selectedSubjectIds]);

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="midnight-panel mb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h3 className="text-2xl font-bold text-white">Study Trends</h3>
        
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
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {subjects.map(subject => (
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
          <AreaChart data={data}>
            <defs>
              {subjects.map(s => (
                <linearGradient key={s.id} id={`color${s.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={s.color} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
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
              tickFormatter={(val) => `${val}m`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#121212', 
                borderRadius: '24px', 
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#E0E0E0',
                padding: '16px'
              }}
              itemStyle={{ color: '#E0E0E0' }}
            />
            {subjects.map(subject => (
              (selectedSubjectIds.length === 0 || selectedSubjectIds.includes(subject.id)) && (
                <Area 
                  key={subject.id}
                  type="monotone" 
                  dataKey={subject.name} 
                  stackId="1"
                  stroke={subject.color} 
                  fillOpacity={1} 
                  fill={`url(#color${subject.id})`} 
                  strokeWidth={3}
                />
              )
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
