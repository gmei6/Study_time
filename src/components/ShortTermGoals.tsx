import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Subject, ShortTermGoal } from '../types';
import { Target, Calendar, Trash2, Plus, X, Check, Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ShortTermGoalsProps {
  subjects: Subject[];
  goals: ShortTermGoal[];
  onAddGoal: (goal: ShortTermGoal) => void;
  onUpdateGoal: (id: string, updates: Partial<ShortTermGoal>) => void;
  onDeleteGoal: (id: string) => void;
}

export default function ShortTermGoals({ subjects, goals, onAddGoal, onUpdateGoal, onDeleteGoal }: ShortTermGoalsProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ShortTermGoal | null>(null);
  const [newName, setNewName] = useState('');
  const [newStartDate, setNewStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newEndDate, setNewEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setNewName('');
    setNewStartDate(format(new Date(), 'yyyy-MM-dd'));
    setNewEndDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedSubjectIds([]);
    setShowModal(true);
  };

  const handleOpenEdit = (goal: ShortTermGoal) => {
    setEditingGoal(goal);
    setNewName(goal.name);
    setNewStartDate(goal.startDate);
    setNewEndDate(goal.endDate);
    setSelectedSubjectIds(goal.subjectIds);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!newName || selectedSubjectIds.length === 0) return;
    
    if (editingGoal) {
      onUpdateGoal(editingGoal.id, {
        name: newName,
        subjectIds: selectedSubjectIds,
        startDate: newStartDate,
        endDate: newEndDate,
      });
    } else {
      const goal: ShortTermGoal = {
        id: crypto.randomUUID(),
        name: newName,
        subjectIds: selectedSubjectIds,
        startDate: newStartDate,
        endDate: newEndDate,
        isActive: true,
        uid: '', // Set by App.tsx
      };
      onAddGoal(goal);
    }
    
    setShowModal(false);
    setNewName('');
    setSelectedSubjectIds([]);
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {goals.map((goal) => (
          <motion.div 
            key={goal.id}
            layout
            className={`midnight-panel flex items-center justify-between gap-4 ${!goal.isActive ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${goal.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-gray-500'}`}>
                <Target size={24} />
              </div>
              <div>
                <h4 className="font-bold text-white mb-1">{goal.name}</h4>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {format(parseISO(goal.startDate), 'MMM d')} - {format(parseISO(goal.endDate), 'MMM d')}
                  </span>
                  <span>•</span>
                  <span>{goal.subjectIds.length} Subjects</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleOpenEdit(goal)}
                className="p-2 bg-white/5 text-gray-500 hover:text-white rounded-xl transition-all"
                title="Edit Goal"
              >
                <Pencil size={18} />
              </button>
              <button 
                onClick={() => onUpdateGoal(goal.id, { isActive: !goal.isActive })}
                className={`p-2 rounded-xl transition-all ${goal.isActive ? 'bg-emerald-500 text-black' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                title={goal.isActive ? "Deactivate" : "Activate"}
              >
                <Check size={18} />
              </button>
              <button 
                onClick={() => onDeleteGoal(goal.id)}
                className="p-2 bg-white/5 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                title="Delete Goal"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </motion.div>
        ))}

        <button 
          onClick={handleOpenAdd}
          className="midnight-panel border-2 border-dashed border-white/5 hover:border-white/20 flex items-center justify-center gap-2 text-gray-500 hover:text-white transition-all py-8"
        >
          <Plus size={20} />
          Add Short-term Goal
        </button>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="midnight-panel max-w-lg w-full p-8 space-y-8"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-white">{editingGoal ? 'Edit Goal' : 'New Goal'}</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase tracking-widest ml-4 font-semibold">Goal Name</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Midterm Prep"
                    className="midnight-input w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 uppercase tracking-widest ml-4 font-semibold">Start Date</label>
                    <input 
                      type="date" 
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="midnight-input w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 uppercase tracking-widest ml-4 font-semibold">End Date</label>
                    <input 
                      type="date" 
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      className="midnight-input w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase tracking-widest ml-4 font-semibold">Select Subjects</label>
                  <div className="flex flex-wrap gap-2">
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
                  </div>
                </div>

                <button 
                  onClick={handleSave}
                  disabled={!newName || selectedSubjectIds.length === 0}
                  className="midnight-button-primary w-full py-4 text-lg disabled:opacity-50"
                >
                  {editingGoal ? 'Update Goal' : 'Create Goal'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
