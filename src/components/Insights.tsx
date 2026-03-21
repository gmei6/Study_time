import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Subject, Location, StudySession } from '../types';
import { AlertCircle, TrendingUp, MapPin, Clock } from 'lucide-react';

interface InsightsProps {
  subjects: Subject[];
  locations: Location[];
  sessions: StudySession[];
}

export default function Insights({ subjects, locations, sessions }: InsightsProps) {
  const insights = useMemo(() => {
    if (sessions.length < 5) return [];

    const results: { icon: any; title: string; description: string }[] = [];

    // Interruption by location
    const locationStats = locations.map(loc => {
      const locSessions = sessions.filter(s => s.locationId === loc.id);
      if (locSessions.length === 0) return null;
      const totalInterruptions = locSessions.reduce((acc, s) => acc + s.interruptions, 0);
      const avgInterruptions = totalInterruptions / locSessions.length;
      return { name: loc.name, avg: avgInterruptions };
    }).filter(x => x !== null) as { name: string; avg: number }[];

    if (locationStats.length >= 2) {
      locationStats.sort((a, b) => b.avg - a.avg);
      const mostInterrupted = locationStats[0];
      const leastInterrupted = locationStats[locationStats.length - 1];
      
      if (mostInterrupted.avg > leastInterrupted.avg * 1.5) {
        results.push({
          icon: AlertCircle,
          title: "Interruption Alert",
          description: `You get interrupted ${Math.round(mostInterrupted.avg / leastInterrupted.avg)}x more often at ${mostInterrupted.name} than ${leastInterrupted.name}.`
        });
      }
    }

    // Most productive subject
    const subjectStats = subjects.map(sub => {
      const subSessions = sessions.filter(s => s.subjectId === sub.id);
      const totalMinutes = subSessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60;
      return { name: sub.name, total: totalMinutes };
    });

    if (subjectStats.length > 0) {
      subjectStats.sort((a, b) => b.total - a.total);
      results.push({
        icon: TrendingUp,
        title: "Top Subject",
        description: `You've spent the most time on ${subjectStats[0].name} (${Math.round(subjectStats[0].total)}m total).`
      });
    }

    // Favorite location
    const locationFrequency = locations.map(loc => {
      const count = sessions.filter(s => s.locationId === loc.id).length;
      return { name: loc.name, count };
    });

    if (locationFrequency.length > 0) {
      locationFrequency.sort((a, b) => b.count - a.count);
      results.push({
        icon: MapPin,
        title: "Favorite Spot",
        description: `Your most frequent study location is ${locationFrequency[0].name}.`
      });
    }

    return results;
  }, [subjects, locations, sessions]);

  if (insights.length === 0) {
    return (
      <div className="midnight-panel mb-12 flex flex-col items-center justify-center text-center p-12">
        <Clock size={48} className="text-gray-600 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Gathering Insights</h3>
        <p className="text-gray-500">Log more sessions to see personalized study analytics and correlations.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
      {insights.map((insight, idx) => (
        <motion.div 
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="midnight-panel flex items-start gap-4"
        >
          <div className="p-3 bg-white/5 rounded-2xl text-white">
            <insight.icon size={24} />
          </div>
          <div>
            <h4 className="font-bold text-white mb-1">{insight.title}</h4>
            <p className="text-gray-500 text-sm leading-relaxed">{insight.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
