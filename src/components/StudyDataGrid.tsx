import React, { useMemo } from 'react';
import { Subject, StudySession } from '../types';
import { format, parseISO, eachDayOfInterval, min, max } from 'date-fns';

interface StudyDataGridProps {
  subjects: Subject[];
  sessions: StudySession[];
}

export default function StudyDataGrid({ subjects, sessions }: StudyDataGridProps) {
  const sortedSubjects = useMemo(() => 
    [...subjects].sort((a, b) => (a.order || 0) - (b.order || 0)), 
    [subjects]
  );

  const gridData = useMemo(() => {
    if (sessions.length === 0) return [];

    const dates = sessions.map(s => parseISO(s.dateLogged));
    const startDate = min(dates);
    const endDate = max(dates);

    const interval = eachDayOfInterval({ start: startDate, end: endDate }).reverse();

    return interval.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const daySessions = sessions.filter(s => s.dateLogged === dateStr);
      
      const row: Record<string, number> = {};
      sortedSubjects.forEach(subject => {
        const minutes = daySessions
          .filter(s => s.subjectId === subject.id)
          .reduce((acc, s) => acc + s.durationSeconds, 0) / 60;
        row[subject.id] = Math.round(minutes);
      });

      return {
        date: dateStr,
        displayDate: format(date, 'M/d/yyyy'),
        values: row,
        total: Object.values(row).reduce((a, b) => a + b, 0)
      };
    }).filter(row => row.total > 0); // Only show days with data
  }, [sessions, sortedSubjects]);

  if (sessions.length === 0) {
    return (
      <div className="midnight-panel text-center py-12">
        <p className="text-gray-500">No study data available to display.</p>
      </div>
    );
  }

  return (
    <div className="midnight-panel overflow-hidden flex flex-col h-[600px]">
      <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-20 bg-[#0a0a0a]">
            <tr>
              <th className="p-4 bg-[#0a0a0a] border-b border-white/10 text-gray-500 text-[10px] font-bold uppercase tracking-widest sticky left-0 z-30">
                Date
              </th>
              {sortedSubjects.map(subject => (
                <th 
                  key={subject.id} 
                  className="p-4 border-b border-white/10 text-[10px] font-bold uppercase tracking-widest min-w-[100px]"
                  style={{ color: subject.color }}
                >
                  {subject.name}
                </th>
              ))}
              <th className="p-4 border-b border-white/10 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {gridData.map((row, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-4 text-gray-400 font-mono text-xs sticky left-0 bg-[#0a0a0a] group-hover:bg-[#111] z-10 border-r border-white/5">
                  {row.displayDate}
                </td>
                {sortedSubjects.map(subject => (
                  <td 
                    key={subject.id} 
                    className={`p-4 font-mono text-xs ${row.values[subject.id] > 0 ? 'text-white font-bold' : 'text-gray-800'}`}
                  >
                    {row.values[subject.id] || 0}
                  </td>
                ))}
                <td className="p-4 text-emerald-500 font-mono text-xs font-bold">
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
