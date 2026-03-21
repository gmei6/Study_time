import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Semester, Subject } from '../types';
import { Plus, Archive, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface SemesterManagementProps {
  semesters: Semester[];
  subjects: Subject[];
  onAddSemester: (semester: Semester) => void;
  onAddSubject: (subject: Subject) => void;
  onArchiveSubject: (id: string) => void;
  onDeleteSubject: (id: string) => void;
}

export default function SemesterManagement({ semesters, subjects, onAddSemester, onAddSubject, onArchiveSubject, onDeleteSubject }: SemesterManagementProps) {
  const [showAddSemester, setShowAddSemester] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSemester, setNewSemester] = useState({ name: '', startDate: '', endDate: '' });
  const [newSubject, setNewSubject] = useState({ name: '', dailyGoalMinutes: 60, color: '#ffffff' });

  const activeSemester = semesters.find(s => s.isActive);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
      <div className="midnight-panel">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold text-white">Semesters</h3>
          <button 
            onClick={() => setShowAddSemester(!showAddSemester)}
            className="midnight-button p-2"
          >
            <Plus size={24} />
          </button>
        </div>

        <AnimatePresence>
          {showAddSemester && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 mb-8 bg-[#050505] p-6 rounded-[32px] overflow-hidden"
            >
              <input 
                type="text"
                placeholder="Semester Name (e.g., Fall 2025)"
                value={newSemester.name}
                onChange={(e) => setNewSemester({ ...newSemester, name: e.target.value })}
                className="midnight-input w-full"
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase ml-4">Start Date</label>
                  <input 
                    type="date"
                    value={newSemester.startDate}
                    onChange={(e) => setNewSemester({ ...newSemester, startDate: e.target.value })}
                    className="midnight-input w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase ml-4">End Date</label>
                  <input 
                    type="date"
                    value={newSemester.endDate}
                    onChange={(e) => setNewSemester({ ...newSemester, endDate: e.target.value })}
                    className="midnight-input w-full"
                  />
                </div>
              </div>
              <button 
                onClick={() => {
                  if (newSemester.name && newSemester.startDate && newSemester.endDate) {
                    onAddSemester({
                      id: crypto.randomUUID(),
                      ...newSemester,
                      isActive: true,
                      uid: '' // Will be set by App component
                    });
                    setNewSemester({ name: '', startDate: '', endDate: '' });
                    setShowAddSemester(false);
                  }
                }}
                className="midnight-button-primary w-full"
              >
                Create Semester
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {semesters.map(semester => (
            <div key={semester.id} className="midnight-card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-2xl text-white">
                  <Calendar size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white">{semester.name}</h4>
                  <p className="text-gray-500 text-xs">
                    {format(new Date(semester.startDate), 'MMM d')} - {format(new Date(semester.endDate), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              {semester.isActive && (
                <span className="px-3 py-1 bg-white text-black text-[10px] font-bold rounded-full uppercase tracking-widest">Active</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="midnight-panel">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold text-white">Subjects</h3>
          <button 
            onClick={() => setShowAddSubject(!showAddSubject)}
            className="midnight-button p-2"
            disabled={!activeSemester}
          >
            <Plus size={24} />
          </button>
        </div>

        <AnimatePresence>
          {showAddSubject && activeSemester && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 mb-8 bg-[#050505] p-6 rounded-[32px] overflow-hidden"
            >
              <input 
                type="text"
                placeholder="Subject Name (e.g., CS 101)"
                value={newSubject.name}
                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                className="midnight-input w-full"
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase ml-4">Daily Goal (min)</label>
                  <input 
                    type="number"
                    value={newSubject.dailyGoalMinutes}
                    onChange={(e) => setNewSubject({ ...newSubject, dailyGoalMinutes: parseInt(e.target.value) })}
                    className="midnight-input w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase ml-4">Color</label>
                  <input 
                    type="color"
                    value={newSubject.color}
                    onChange={(e) => setNewSubject({ ...newSubject, color: e.target.value })}
                    className="midnight-input w-full h-[56px] p-1 cursor-pointer"
                  />
                </div>
              </div>
              <button 
                onClick={() => {
                  if (newSubject.name) {
                    onAddSubject({
                      id: crypto.randomUUID(),
                      semesterId: activeSemester.id,
                      ...newSubject,
                      isArchived: false,
                      uid: '' // Will be set by App component
                    });
                    setNewSubject({ name: '', dailyGoalMinutes: 60, color: '#ffffff' });
                    setShowAddSubject(false);
                  }
                }}
                className="midnight-button-primary w-full"
              >
                Add Subject
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {subjects.filter(s => s.semesterId === activeSemester?.id).map(subject => (
            <div key={subject.id} className="midnight-card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-10 h-10 rounded-2xl" 
                  style={{ backgroundColor: subject.color }}
                />
                <div>
                  <h4 className="font-bold text-white">{subject.name}</h4>
                  <p className="text-gray-500 text-xs">{subject.dailyGoalMinutes}m daily goal</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => onArchiveSubject(subject.id)}
                  className={`p-2 rounded-xl transition-all ${subject.isArchived ? 'text-white bg-white/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                  title={subject.isArchived ? "Unarchive" : "Archive"}
                >
                  <Archive size={18} />
                </button>
                <button 
                  onClick={() => onDeleteSubject(subject.id)}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {!activeSemester && (
            <p className="text-center text-gray-600 py-8">Create an active semester first to add subjects.</p>
          )}
        </div>
      </div>
    </div>
  );
}
