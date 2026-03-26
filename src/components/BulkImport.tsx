import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Subject, StudySession, Location, Semester } from '../types';
import { format, parse, isWithinInterval, parseISO } from 'date-fns';
import { Upload, X, Check, AlertCircle, FileText } from 'lucide-react';

interface BulkImportProps {
  subjects: Subject[];
  locations: Location[];
  onImport: (sessions: StudySession[]) => void;
  onClose: () => void;
  activeSemester?: Semester;
}

export default function BulkImport({ subjects, locations, onImport, onClose, activeSemester }: BulkImportProps) {
  const [csvData, setCsvData] = useState('');
  const [preview, setPreview] = useState<StudySession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // Header -> SubjectId

  const handleParse = () => {
    setError(null);
    if (!csvData.trim()) return;

    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      setError('Data must include a header row and at least one data row.');
      return;
    }

    // Detect separator (tab or comma)
    const headerLine = lines[0];
    const separator = headerLine.includes('\t') ? '\t' : ',';
    const headers = headerLine.split(separator).map(h => h.trim());

    if (!headers.some(h => h.toLowerCase().includes('date'))) {
      setError('Could not find a "Date" column in the header.');
      return;
    }

    const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date'));
    const subjectColumns = headers.map((h, i) => i !== dateIndex ? h : null).filter(h => h !== null) as string[];

    // Auto-map subjects by name
    const newMapping: Record<string, string> = {};
    subjectColumns.forEach(col => {
      const match = subjects.find(s => s.name.trim().toLowerCase() === col.trim().toLowerCase());
      if (match) {
        newMapping[col] = match.id;
      }
    });
    setMapping(newMapping);

    const newSessions: StudySession[] = [];
    const defaultLocationId = locations[0]?.id || 'default-location';

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(separator).map(c => c.trim());
      if (row.length < headers.length) continue;

      const rawDate = row[dateIndex];
      let parsedDate: Date;
      try {
        // Try common formats: M/D/YYYY, MM/DD/YYYY, YYYY-MM-DD
        if (rawDate.includes('/')) {
          const parts = rawDate.split('/');
          if (parts[2].length === 2) {
            parsedDate = parse(rawDate, 'M/d/yy', new Date());
          } else {
            parsedDate = parse(rawDate, 'M/d/yyyy', new Date());
          }
        } else {
          parsedDate = new Date(rawDate);
        }

        if (isNaN(parsedDate.getTime())) throw new Error();
      } catch (e) {
        setError(`Invalid date format on row ${i + 1}: ${rawDate}`);
        return;
      }

      const dateLogged = format(parsedDate, 'yyyy-MM-dd');

      if (activeSemester) {
        const start = parseISO(activeSemester.startDate);
        const end = parseISO(activeSemester.endDate);
        if (!isWithinInterval(parsedDate, { start, end })) {
          continue; // Skip out-of-bounds sessions
        }
      }

      headers.forEach((header, colIndex) => {
        if (colIndex === dateIndex) return;
        const subjectId = newMapping[header];
        if (!subjectId) return;

        const minutes = parseInt(row[colIndex]);
        if (!isNaN(minutes) && minutes > 0) {
          newSessions.push({
            id: crypto.randomUUID(),
            subjectId,
            locationId: defaultLocationId,
            startTime: parsedDate.toISOString(),
            endTime: parsedDate.toISOString(),
            durationSeconds: minutes * 60,
            interruptions: 0,
            dateLogged,
            uid: '', // Set by App
          });
        }
      });
    }

    if (newSessions.length === 0) {
      setError('No valid study time found in the data.');
      return;
    }

    setPreview(newSessions);
  };

  const handleImport = () => {
    onImport(preview);
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="midnight-panel w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-xl text-white">
              <Upload size={24} />
            </div>
            <h3 className="text-2xl font-bold text-white">Bulk Import Data</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {preview.length === 0 ? (
            <>
              <div className="bg-white/5 p-6 rounded-[32px] border border-white/10">
                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                  <FileText size={18} className="text-gray-500" />
                  Instructions
                </h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Paste your spreadsheet data below. Ensure the first row contains headers like 
                  <code className="bg-black/40 px-2 py-0.5 rounded mx-1 text-emerald-400">Date</code>, 
                  <code className="bg-black/40 px-2 py-0.5 rounded mx-1 text-emerald-400">Subject Name</code>, etc. 
                  The subjects must already exist in your active semester.
                  {activeSemester && (
                    <span className="text-rose-400/80 block mt-2">
                      Note: Only sessions between {format(parseISO(activeSemester.startDate), 'MMM d, yyyy')} and {format(parseISO(activeSemester.endDate), 'MMM d, yyyy')} will be imported.
                    </span>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase tracking-widest ml-4 font-semibold">Paste Data (CSV or Tab-Separated)</label>
                <textarea 
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder="Date, Chinese, MATH 3235...&#10;1/12/2026, 45, 0..."
                  className="midnight-input w-full h-64 font-mono text-sm resize-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <button 
                onClick={handleParse}
                disabled={!csvData.trim()}
                className="midnight-button-primary w-full py-4 disabled:opacity-50"
              >
                Preview Import
              </button>
            </>
          ) : (
            <div className="space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[32px]">
                <h4 className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
                  <Check size={18} />
                  Ready to Import
                </h4>
                <p className="text-gray-400 text-sm">
                  Found <span className="text-white font-bold">{preview.length}</span> study sessions across 
                  <span className="text-white font-bold"> {new Set(preview.map(s => s.dateLogged)).size}</span> days.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-gray-500 text-xs uppercase tracking-widest ml-4 font-semibold">Preview (First 10 items)</h4>
                <div className="space-y-2">
                  {preview.slice(0, 10).map((session, i) => {
                    const subject = subjects.find(s => s.id === session.subjectId);
                    return (
                      <div key={i} className="midnight-card flex items-center justify-between py-3">
                        <div className="flex items-center gap-4">
                          <div className="w-2 h-8 rounded-full" style={{ backgroundColor: subject?.color }} />
                          <div>
                            <p className="text-white font-bold text-sm">{subject?.name}</p>
                            <p className="text-gray-500 text-xs">{session.dateLogged}</p>
                          </div>
                        </div>
                        <p className="text-white font-mono font-bold">{session.durationSeconds / 60}m</p>
                      </div>
                    );
                  })}
                  {preview.length > 10 && (
                    <p className="text-center text-gray-600 text-xs py-2">...and {preview.length - 10} more sessions</p>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setPreview([])}
                  className="midnight-button flex-1 py-4"
                >
                  Back
                </button>
                <button 
                  onClick={handleImport}
                  className="midnight-button-primary flex-1 py-4"
                >
                  Confirm Import
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
