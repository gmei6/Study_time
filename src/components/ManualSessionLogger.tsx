import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Subject, Location, StudySession, Semester } from '../types';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { Plus, Save, Clock, AlertCircle, Undo2, X } from 'lucide-react';

interface ManualSessionLoggerProps {
  subjects: Subject[];
  locations: Location[];
  onSessionComplete: (session: StudySession) => void;
  onAddLocation: (name: string) => void;
  onUndoSession?: (sessionId: string) => void;
  lastSession?: StudySession | null;
  activeSemester?: Semester;
}

export default function ManualSessionLogger({ 
  subjects, 
  locations, 
  onSessionComplete, 
  onAddLocation,
  onUndoSession,
  lastSession,
  activeSemester
}: ManualSessionLoggerProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [minutes, setMinutes] = useState<number>(0);
  const [interruptions, setInterruptions] = useState<number>(0);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newLocationName, setNewLocationName] = useState('');
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !selectedLocationId || minutes <= 0) {
      return;
    }

    if (activeSemester) {
      const sessionDate = parseISO(date);
      const start = parseISO(activeSemester.startDate);
      const end = parseISO(activeSemester.endDate);
      
      if (!isWithinInterval(sessionDate, { start, end })) {
        setError(`The date ${date} is outside the current semester bounds (${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}).`);
        return;
      }
    }

    setError(null);
    setIsSubmitting(true);

    const now = new Date();
    const session: StudySession = {
      id: crypto.randomUUID(),
      subjectId: selectedSubjectId,
      locationId: selectedLocationId,
      startTime: now.toISOString(), // Placeholder since it's manual
      endTime: now.toISOString(),   // Placeholder since it's manual
      durationSeconds: minutes * 60,
      interruptions: interruptions,
      dateLogged: date,
      uid: '', // Will be set by App component
    };

    onSessionComplete(session);
    
    // Reset form
    setMinutes(0);
    setInterruptions(0);
    setIsSubmitting(false);
  };

  const lastSubject = lastSession ? subjects.find(s => s.id === lastSession.subjectId) : null;
  const lastLocation = lastSession ? locations.find(l => l.id === lastSession.locationId) : null;

  return (
    <div className="midnight-panel mb-12">
      <form onSubmit={handleSubmit} className="space-y-8">
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 text-rose-500 text-sm"
            >
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-gray-500 text-sm font-semibold uppercase tracking-widest ml-4">Subject</label>
              <select 
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="midnight-input w-full appearance-none cursor-pointer"
                required
              >
                <option value="">Select a subject</option>
                {subjects.filter(s => !s.isArchived).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-gray-500 text-sm font-semibold uppercase tracking-widest ml-4">Location</label>
              <div className="flex gap-2">
                <select 
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="midnight-input flex-1 appearance-none cursor-pointer"
                  required
                >
                  <option value="">Select a location</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <button 
                  type="button"
                  onClick={() => setShowAddLocation(!showAddLocation)}
                  className="midnight-button p-4"
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showAddLocation && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-2 overflow-hidden"
                >
                  <input 
                    type="text"
                    placeholder="New location name..."
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    className="midnight-input flex-1"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newLocationName.trim()) {
                        onAddLocation(newLocationName.trim());
                        setNewLocationName('');
                        setShowAddLocation(false);
                      }
                    }}
                    className="midnight-button-primary px-6"
                  >
                    Save
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-gray-500 text-sm font-semibold uppercase tracking-widest ml-4">Minutes Studied</label>
                <div className="relative">
                  <input 
                    type="number"
                    min="1"
                    value={isNaN(minutes) || minutes === 0 ? '' : minutes}
                    onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                    className="midnight-input w-full pl-12"
                    placeholder="0"
                    required
                  />
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-gray-500 text-sm font-semibold uppercase tracking-widest ml-4">Interruptions</label>
                <div className="relative">
                  <input 
                    type="number"
                    min="0"
                    value={isNaN(interruptions) || interruptions === 0 ? '' : interruptions}
                    onChange={(e) => setInterruptions(parseInt(e.target.value) || 0)}
                    className="midnight-input w-full pl-12"
                    placeholder="0"
                  />
                  <AlertCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-gray-500 text-sm font-semibold uppercase tracking-widest ml-4">Date</label>
              <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="midnight-input w-full"
                required
              />
            </div>

            <div className="flex gap-4">
              <button 
                type="submit"
                disabled={isSubmitting || !selectedSubjectId || !selectedLocationId || minutes <= 0}
                className="midnight-button-primary flex-1 flex items-center justify-center gap-2 py-4 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} />
                {isSubmitting ? 'Logging...' : 'Log Study Session'}
              </button>

              {lastSession && onUndoSession && (
                <button
                  type="button"
                  onClick={() => setShowUndoConfirm(true)}
                  className="midnight-button flex items-center gap-2 px-6 py-4 mt-2 border-rose-500/20 hover:border-rose-500/50 text-rose-500"
                >
                  <Undo2 size={20} />
                  Undo Last
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      <AnimatePresence>
        {showUndoConfirm && lastSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="midnight-panel max-w-md w-full p-8 relative"
            >
              <button 
                onClick={() => setShowUndoConfirm(false)}
                className="absolute top-6 right-6 text-gray-500 hover:text-white"
              >
                <X size={24} />
              </button>

              <h3 className="text-2xl font-bold text-white mb-6">Undo Last Session?</h3>
              
              <div className="bg-white/5 rounded-3xl p-6 mb-8 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs uppercase tracking-widest">Subject</span>
                  <span className="text-white font-bold" style={{ color: lastSubject?.color }}>{lastSubject?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs uppercase tracking-widest">Duration</span>
                  <span className="text-white font-bold">{Math.round(lastSession.durationSeconds / 60)} minutes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs uppercase tracking-widest">Location</span>
                  <span className="text-white font-bold">{lastLocation?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs uppercase tracking-widest">Date</span>
                  <span className="text-white font-bold">{lastSession.dateLogged}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowUndoConfirm(false)}
                  className="midnight-button flex-1 py-4"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    onUndoSession(lastSession.id);
                    setShowUndoConfirm(false);
                  }}
                  className="midnight-button-primary flex-1 py-4 bg-rose-600 hover:bg-rose-500"
                >
                  Confirm Undo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
