import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Semester, Subject, StudySession, Location } from '../types';
import { Plus, Archive, Trash2, Calendar, Edit2, Check, X, ChevronUp, ChevronDown, Upload, Undo2 } from 'lucide-react';
import { format } from 'date-fns';
import BulkImport from './BulkImport';

interface SemesterManagementProps {
  semesters: Semester[];
  subjects: Subject[];
  locations: Location[];
  onAddSemester: (semester: Semester) => void;
  onUpdateSemester: (id: string, updates: Partial<Semester>) => void;
  onSetActiveSemester: (id: string) => void;
  onPurgeInvalidSessions: (semesterId: string) => void;
  onAddSubject: (subject: Subject) => void;
  onArchiveSubject: (id: string) => void;
  onDeleteSubject: (id: string) => void;
  onUpdateSubjectGoal: (id: string, goalMinutes: number) => void;
  onUpdateSubjectColor: (id: string, color: string) => void;
  onUpdateSubjectOrder: (id: string, newOrder: number) => void;
  onBulkAddSessions: (sessions: StudySession[]) => void;
  onUndoBulkImport: () => void;
  canUndoBulkImport: boolean;
}

export default function SemesterManagement({ 
  semesters, 
  subjects, 
  locations,
  onAddSemester, 
  onUpdateSemester,
  onSetActiveSemester,
  onPurgeInvalidSessions,
  onAddSubject, 
  onArchiveSubject, 
  onDeleteSubject,
  onUpdateSubjectGoal,
  onUpdateSubjectColor,
  onUpdateSubjectOrder,
  onBulkAddSessions,
  onUndoBulkImport,
  canUndoBulkImport
}: SemesterManagementProps) {
  const [showAddSemester, setShowAddSemester] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [newSemester, setNewSemester] = useState({ name: '', startDate: '', endDate: '' });
  const [newSubject, setNewSubject] = useState({ name: '', dailyGoalMinutes: 60, color: '#ffffff' });
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingSemesterId, setEditingSemesterId] = useState<string | null>(null);
  const [editSemesterData, setEditSemesterData] = useState({ name: '', startDate: '', endDate: '' });
  const [editGoalValue, setEditGoalValue] = useState<number>(60);
  const [editColorValue, setEditColorValue] = useState<string>('#ffffff');
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState<string | null>(null);

  const activeSemester = semesters.find(s => s.isActive);

  const startEditingSubject = (subject: Subject) => {
    setEditingSubjectId(subject.id);
    setEditGoalValue(subject.dailyGoalMinutes);
    setEditColorValue(subject.color);
  };

  const startEditingSemester = (semester: Semester) => {
    setEditingSemesterId(semester.id);
    setEditSemesterData({
      name: semester.name,
      startDate: semester.startDate,
      endDate: semester.endDate
    });
  };

  const cancelEditingSubject = () => {
    setEditingSubjectId(null);
  };

  const cancelEditingSemester = () => {
    setEditingSemesterId(null);
  };

  const saveSubject = (id: string) => {
    onUpdateSubjectGoal(id, editGoalValue);
    onUpdateSubjectColor(id, editColorValue);
    setEditingSubjectId(null);
  };

  const saveSemester = (id: string) => {
    onUpdateSemester(id, editSemesterData);
    setEditingSemesterId(null);
  };

  const moveSubject = (id: string, direction: 'up' | 'down') => {
    const currentSubjects = [...subjects]
      .filter(s => s.semesterId === activeSemester?.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const index = currentSubjects.findIndex(s => s.id === id);
    if (index === -1) return;

    const newOrder = [...currentSubjects];
    if (direction === 'up' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'down' && index < currentSubjects.length - 1) {
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    } else {
      return;
    }

    newOrder.forEach((s, i) => {
      onUpdateSubjectOrder(s.id, i);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
      <AnimatePresence>
        {showBulkImport && (
          <BulkImport 
            subjects={subjects}
            locations={locations}
            onImport={onBulkAddSessions}
            onClose={() => setShowBulkImport(false)}
            activeSemester={activeSemester}
          />
        )}
      </AnimatePresence>

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
            <div key={semester.id} className="midnight-card flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-2xl text-white">
                    <Calendar size={20} />
                  </div>
                  {editingSemesterId === semester.id ? (
                    <div className="space-y-2">
                      <input 
                        type="text"
                        value={editSemesterData.name}
                        onChange={(e) => setEditSemesterData({ ...editSemesterData, name: e.target.value })}
                        className="midnight-input py-1 px-2 w-full text-sm"
                      />
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-bold text-white">{semester.name}</h4>
                      <p className="text-gray-500 text-xs">
                        {format(new Date(semester.startDate), 'MMM d')} - {format(new Date(semester.endDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {semester.isActive ? (
                    <span className="px-3 py-1 bg-white text-black text-[10px] font-bold rounded-full uppercase tracking-widest">Active</span>
                  ) : (
                    <button 
                      onClick={() => onSetActiveSemester(semester.id)}
                      className="px-3 py-1 bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 text-[10px] font-bold rounded-full uppercase tracking-widest transition-all"
                    >
                      Set Active
                    </button>
                  )}
                  <button 
                    onClick={() => setShowPurgeConfirm(semester.id)}
                    className="text-gray-500 hover:text-rose-500 transition-colors p-1"
                    title="Purge sessions outside semester dates"
                  >
                    <Trash2 size={14} />
                  </button>
                  {editingSemesterId === semester.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => saveSemester(semester.id)} className="text-emerald-500 hover:text-emerald-400 p-1">
                        <Check size={16} />
                      </button>
                      <button onClick={cancelEditingSemester} className="text-red-500 hover:text-red-400 p-1">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => startEditingSemester(semester)}
                      className="text-gray-500 hover:text-white transition-colors p-1"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              {editingSemesterId === semester.id && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase ml-2">Start Date</label>
                    <input 
                      type="date"
                      value={editSemesterData.startDate}
                      onChange={(e) => setEditSemesterData({ ...editSemesterData, startDate: e.target.value })}
                      className="midnight-input py-1 px-2 w-full text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase ml-2">End Date</label>
                    <input 
                      type="date"
                      value={editSemesterData.endDate}
                      onChange={(e) => setEditSemesterData({ ...editSemesterData, endDate: e.target.value })}
                      className="midnight-input py-1 px-2 w-full text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="midnight-panel">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold text-white">Subjects</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUndoConfirm(true)}
              disabled={!canUndoBulkImport}
              className={`midnight-button p-2 transition-all duration-300 ${
                canUndoBulkImport 
                  ? 'text-rose-500 border-rose-500/20 hover:border-rose-500/50' 
                  : 'text-gray-700 border-white/5 cursor-not-allowed opacity-50'
              }`}
              title={canUndoBulkImport ? "Undo Last Bulk Import" : "No import to undo"}
            >
              <Undo2 size={24} />
            </button>
            <button 
              onClick={() => setShowBulkImport(true)}
              className="midnight-button p-2"
              title="Bulk Import"
              disabled={!activeSemester}
            >
              <Upload size={24} />
            </button>
            <button 
              onClick={() => setShowAddSubject(!showAddSubject)}
              className="midnight-button p-2"
              disabled={!activeSemester}
            >
              <Plus size={24} />
            </button>
          </div>
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
                    value={isNaN(newSubject.dailyGoalMinutes) || newSubject.dailyGoalMinutes === 0 ? '' : newSubject.dailyGoalMinutes}
                    onChange={(e) => setNewSubject({ ...newSubject, dailyGoalMinutes: parseInt(e.target.value) || 0 })}
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
                      order: 0, // App will set the correct order
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
          {subjects
            .filter(s => s.semesterId === activeSemester?.id)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((subject, index, filteredArray) => (
            <div key={subject.id} className="midnight-card flex items-center justify-between">
              <div className="flex items-center gap-4">
                {editingSubjectId === subject.id ? (
                  <input 
                    type="color"
                    value={editColorValue}
                    onChange={(e) => setEditColorValue(e.target.value)}
                    className="w-10 h-10 rounded-2xl p-1 cursor-pointer bg-transparent"
                  />
                ) : (
                  <div 
                    className="w-10 h-10 rounded-2xl" 
                    style={{ backgroundColor: subject.color }}
                  />
                )}
                <div>
                  <h4 className="font-bold text-white">{subject.name}</h4>
                  {editingSubjectId === subject.id ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="number"
                        value={isNaN(editGoalValue) || editGoalValue === 0 ? '' : editGoalValue}
                        onChange={(e) => setEditGoalValue(parseInt(e.target.value) || 0)}
                        className="midnight-input py-1 px-2 w-20 text-xs"
                        autoFocus
                      />
                      <span className="text-gray-500 text-xs">min</span>
                      <button onClick={() => saveSubject(subject.id)} className="text-emerald-500 hover:text-emerald-400">
                        <Check size={14} />
                      </button>
                      <button onClick={cancelEditingSubject} className="text-red-500 hover:text-red-400">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-gray-500 text-xs">{subject.dailyGoalMinutes}m daily goal</p>
                      <button onClick={() => startEditingSubject(subject)} className="text-gray-500 hover:text-white transition-colors">
                        <Edit2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex flex-col gap-1 mr-2">
                  <button 
                    onClick={() => moveSubject(subject.id, 'up')}
                    disabled={index === 0}
                    className={`p-1 rounded-md transition-all ${index === 0 ? 'text-gray-800 cursor-not-allowed' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button 
                    onClick={() => moveSubject(subject.id, 'down')}
                    disabled={index === filteredArray.length - 1}
                    className={`p-1 rounded-md transition-all ${index === filteredArray.length - 1 ? 'text-gray-800 cursor-not-allowed' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
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

      <AnimatePresence>
        {showUndoConfirm && (
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

              <h3 className="text-2xl font-bold text-white mb-6">Undo Bulk Import?</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                This will delete all sessions added in the most recent bulk import. This action cannot be undone.
              </p>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowUndoConfirm(false)}
                  className="midnight-button flex-1 py-4"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    onUndoBulkImport();
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

      <AnimatePresence>
        {showPurgeConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="midnight-panel max-w-md w-full p-8 relative"
            >
              <button 
                onClick={() => setShowPurgeConfirm(null)}
                className="absolute top-6 right-6 text-gray-500 hover:text-white"
              >
                <X size={24} />
              </button>

              <h3 className="text-2xl font-bold text-white mb-6">Purge Invalid Sessions?</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                This will delete all sessions for this semester that fall outside its defined start and end dates. This action cannot be undone.
              </p>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowPurgeConfirm(null)}
                  className="midnight-button flex-1 py-4"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    onPurgeInvalidSessions(showPurgeConfirm);
                    setShowPurgeConfirm(null);
                  }}
                  className="midnight-button-primary flex-1 py-4 bg-rose-600 hover:bg-rose-500"
                >
                  Confirm Purge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
