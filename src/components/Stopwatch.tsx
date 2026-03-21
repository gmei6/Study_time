import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Subject, Location, StudySession } from '../types';
import { format, differenceInSeconds } from 'date-fns';
import { Play, Pause, Square, Plus } from 'lucide-react';

interface StopwatchProps {
  subjects: Subject[];
  locations: Location[];
  onSessionComplete: (session: StudySession) => void;
  onAddLocation: (name: string) => void;
}

export default function Stopwatch({ subjects, locations, onSessionComplete, onAddLocation }: StopwatchProps) {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [interruptions, setInterruptions] = useState(0);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [showAddLocation, setShowAddLocation] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused]);

  const handleStart = () => {
    if (!selectedSubjectId || !selectedLocationId) {
      alert('Please select a subject and location first.');
      return;
    }
    setStartTime(new Date());
    setIsActive(true);
    setIsPaused(false);
    setElapsedSeconds(0);
    setInterruptions(0);
  };

  const handlePause = () => {
    if (isActive && !isPaused) {
      setIsPaused(true);
      setInterruptions(prev => prev + 1);
    } else if (isActive && isPaused) {
      setIsPaused(false);
    }
  };

  const handleStop = () => {
    if (!startTime) return;

    const endTime = new Date();
    // Midnight Rule: Log to the date the session started
    const dateLogged = format(startTime, 'yyyy-MM-dd');

    const session: StudySession = {
      id: crypto.randomUUID(),
      subjectId: selectedSubjectId,
      locationId: selectedLocationId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationSeconds: elapsedSeconds,
      interruptions: interruptions,
      dateLogged: dateLogged,
      uid: '', // Will be set by App component
    };

    onSessionComplete(session);
    setIsActive(false);
    setIsPaused(false);
    setStartTime(null);
    setElapsedSeconds(0);
    setInterruptions(0);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="midnight-panel mb-12">
      <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
        <div className="flex-1 w-full space-y-6">
          <div className="space-y-2">
            <label className="text-gray-500 text-sm font-semibold uppercase tracking-widest ml-4">Subject</label>
            <select 
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="midnight-input w-full appearance-none cursor-pointer"
              disabled={isActive}
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
                disabled={isActive}
              >
                <option value="">Select a location</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <button 
                onClick={() => setShowAddLocation(!showAddLocation)}
                className="midnight-button p-4"
                disabled={isActive}
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

        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
          <div className="text-8xl font-mono font-bold text-white tracking-tighter">
            {formatTime(elapsedSeconds)}
          </div>
          
          <div className="flex items-center gap-4">
            {!isActive ? (
              <button onClick={handleStart} className="midnight-button-primary flex items-center gap-2">
                <Play size={20} fill="currentColor" />
                Start Session
              </button>
            ) : (
              <>
                <button onClick={handlePause} className="midnight-button flex items-center gap-2">
                  {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button onClick={handleStop} className="midnight-button-primary bg-red-500 hover:bg-red-600 text-white flex items-center gap-2">
                  <Square size={20} fill="currentColor" />
                  Stop
                </button>
              </>
            )}
          </div>

          {isActive && (
            <div className="text-gray-500 font-medium">
              Interruptions: <span className="text-white">{interruptions}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
