/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ManualSessionLogger from './components/ManualSessionLogger';
import Visualizations from './components/Visualizations';
import StudyDataGrid from './components/StudyDataGrid';
import Insights from './components/Insights';
import SemesterManagement from './components/SemesterManagement';
import ErrorBoundary from './components/ErrorBoundary';
import { Semester, Subject, Location, StudySession } from './types';
import { auth, db, signInWithGoogle, logout, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  getDocFromServer
} from 'firebase/firestore';
import { LogIn, LogOut } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [lastBulkImportIds, setLastBulkImportIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('lastBulkImportIds');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('lastBulkImportIds', JSON.stringify(lastBulkImportIds));
  }, [lastBulkImportIds]);

  const lastSession = React.useMemo(() => {
    if (sessions.length === 0) return null;
    return [...sessions].sort((a, b) => b.startTime.localeCompare(a.startTime))[0];
  }, [sessions]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Test Firestore connection
  useEffect(() => {
    if (isAuthReady && user) {
      const testConnection = async () => {
        try {
          await getDocFromServer(doc(db, 'test', 'connection'));
        } catch (error) {
          if(error instanceof Error && error.message.includes('the client is offline')) {
            console.error("Please check your Firebase configuration. ");
          }
        }
      };
      testConnection();
    }
  }, [isAuthReady, user]);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const qSemesters = query(collection(db, 'semesters'), where('uid', '==', user.uid));
    const unsubSemesters = onSnapshot(qSemesters, (snapshot) => {
      setSemesters(snapshot.docs.map(doc => doc.data() as Semester));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'semesters'));

    const qSubjects = query(collection(db, 'subjects'), where('uid', '==', user.uid));
    const unsubSubjects = onSnapshot(qSubjects, (snapshot) => {
      setSubjects(snapshot.docs.map(doc => doc.data() as Subject));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'subjects'));

    const qLocations = query(collection(db, 'locations'), where('uid', '==', user.uid));
    const unsubLocations = onSnapshot(qLocations, (snapshot) => {
      setLocations(snapshot.docs.map(doc => doc.data() as Location));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'locations'));

    const qSessions = query(collection(db, 'sessions'), where('uid', '==', user.uid));
    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      setSessions(snapshot.docs.map(doc => doc.data() as StudySession));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'sessions'));

    return () => {
      unsubSemesters();
      unsubSubjects();
      unsubLocations();
      unsubSessions();
    };
  }, [isAuthReady, user]);

  const handleSessionComplete = async (session: StudySession) => {
    if (!user) return;
    const path = 'sessions';
    try {
      await setDoc(doc(db, path, session.id), { ...session, uid: user.uid });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleUndoSession = async (sessionId: string) => {
    if (!user) return;
    const path = 'sessions';
    try {
      await deleteDoc(doc(db, path, sessionId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleBulkAddSessions = async (newSessions: StudySession[]) => {
    if (!user) return;
    const path = 'sessions';
    try {
      // Create batches if needed, but for now we'll just do them in parallel
      // Firestore has a 500 write limit for batches, so let's just use Promise.all for simplicity
      // if it's not too many. The user's image shows ~60 rows, which is fine.
      await Promise.all(newSessions.map(session => 
        setDoc(doc(db, path, session.id), { ...session, uid: user.uid })
      ));
      setLastBulkImportIds(newSessions.map(s => s.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleUndoBulkImport = async () => {
    if (!user || lastBulkImportIds.length === 0) return;
    const path = 'sessions';
    try {
      await Promise.all(lastBulkImportIds.map(id => 
        deleteDoc(doc(db, path, id))
      ));
      setLastBulkImportIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handlePurgeInvalidSessions = async (semesterId: string) => {
    if (!user) return;
    const semester = semesters.find(s => s.id === semesterId);
    if (!semester) return;

    const semesterSubjects = subjects.filter(s => s.semesterId === semesterId);
    const subjectIds = new Set(semesterSubjects.map(s => s.id));
    
    const invalidSessions = sessions.filter(s => {
      if (!subjectIds.has(s.subjectId)) return false;
      const sessionDate = new Date(s.startTime);
      const start = new Date(semester.startDate);
      const end = new Date(semester.endDate);
      return sessionDate < start || sessionDate > end;
    });

    if (invalidSessions.length === 0) return;

    const path = 'sessions';
    try {
      await Promise.all(invalidSessions.map(s => deleteDoc(doc(db, path, s.id))));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleAddLocation = async (name: string) => {
    if (!user) return;
    const path = 'locations';
    const id = crypto.randomUUID();
    try {
      await setDoc(doc(db, path, id), { id, name, uid: user.uid });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleAddSemester = async (sem: Semester) => {
    if (!user) return;
    const path = 'semesters';
    try {
      // Deactivate other semesters first
      for (const s of semesters) {
        if (s.isActive) {
          await updateDoc(doc(db, path, s.id), { isActive: false });
        }
      }
      await setDoc(doc(db, path, sem.id), { ...sem, uid: user.uid });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleUpdateSemester = async (id: string, updates: Partial<Semester>) => {
    if (!user) return;
    const path = 'semesters';
    try {
      await updateDoc(doc(db, path, id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleSetActiveSemester = async (id: string) => {
    if (!user) return;
    const path = 'semesters';
    try {
      // Deactivate all first
      const updates = semesters.map(s => 
        updateDoc(doc(db, path, s.id), { isActive: s.id === id })
      );
      await Promise.all(updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleAddSubject = async (sub: Subject) => {
    if (!user) return;
    const path = 'subjects';
    try {
      // Set order as the last one
      const currentSubjects = subjects.filter(s => s.semesterId === sub.semesterId);
      const maxOrder = currentSubjects.length > 0 ? Math.max(...currentSubjects.map(s => s.order)) : -1;
      await setDoc(doc(db, path, sub.id), { ...sub, order: maxOrder + 1, uid: user.uid });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleArchiveSubject = async (id: string) => {
    if (!user) return;
    const path = 'subjects';
    const subject = subjects.find(s => s.id === id);
    if (!subject) return;
    try {
      await updateDoc(doc(db, path, id), { isArchived: !subject.isArchived });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!user) return;
    const path = 'subjects';
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleUpdateSubjectGoal = async (id: string, goalMinutes: number) => {
    if (!user) return;
    const path = 'subjects';
    try {
      await updateDoc(doc(db, path, id), { dailyGoalMinutes: goalMinutes });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleUpdateSubjectColor = async (id: string, color: string) => {
    if (!user) return;
    const path = 'subjects';
    try {
      await updateDoc(doc(db, path, id), { color });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleUpdateSubjectOrder = async (id: string, newOrder: number) => {
    if (!user) return;
    const path = 'subjects';
    try {
      await updateDoc(doc(db, path, id), { order: newOrder });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const activeSemesterId = semesters.find(sem => sem.isActive)?.id;
  const filteredSubjects = subjects.filter(s => s.semesterId === activeSemesterId);
  const filteredSessions = sessions.filter(s => filteredSubjects.some(sub => sub.id === s.subjectId));

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-white text-2xl font-bold animate-pulse">midnight</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8">
        <div className="midnight-panel max-w-md w-full text-center space-y-8 p-12">
          <h1 className="text-6xl font-bold tracking-tighter text-white">midnight</h1>
          <p className="text-gray-500 text-lg font-medium">A way to track your study time.</p>
          <button 
            onClick={signInWithGoogle}
            className="midnight-button-primary w-full flex items-center justify-center gap-3 py-6 text-xl"
          >
            <LogIn size={24} />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Layout>
        <div className="space-y-12 pb-24">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-12 h-12 rounded-full border-2 border-white/10" />
              <div>
                <h2 className="text-white font-bold">{user.displayName}</h2>
                <p className="text-gray-500 text-sm">Active Session</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="midnight-button flex items-center gap-2 px-6"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>

          <Dashboard 
            subjects={filteredSubjects} 
            sessions={filteredSessions} 
            semesters={semesters}
          />
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
            <div className="xl:col-span-2">
              <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-widest mb-6 ml-4">Log Study Session</h3>
              <ManualSessionLogger 
                subjects={filteredSubjects} 
                locations={locations} 
                onSessionComplete={handleSessionComplete}
                onAddLocation={handleAddLocation}
                onUndoSession={handleUndoSession}
                lastSession={lastSession}
                activeSemester={semesters.find(s => s.isActive)}
              />
              
              <Visualizations 
                subjects={filteredSubjects} 
                sessions={filteredSessions} 
                semesters={semesters}
              />

              <div className="mt-12">
                <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-widest mb-6 ml-4">Data Grid</h3>
                <StudyDataGrid 
                  subjects={filteredSubjects} 
                  sessions={filteredSessions} 
                />
              </div>
            </div>
            
            <div className="space-y-12">
              <div>
                <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-widest mb-6 ml-4">Insights</h3>
                <Insights 
                  subjects={filteredSubjects} 
                  locations={locations} 
                  sessions={filteredSessions} 
                />
              </div>
              
              <div>
                <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-widest mb-6 ml-4">Management</h3>
                <SemesterManagement 
                  semesters={semesters}
                  subjects={subjects}
                  onAddSemester={handleAddSemester}
                  onUpdateSemester={handleUpdateSemester}
                  onSetActiveSemester={handleSetActiveSemester}
                  onPurgeInvalidSessions={handlePurgeInvalidSessions}
                  onAddSubject={handleAddSubject}
                  onArchiveSubject={handleArchiveSubject}
                  onDeleteSubject={handleDeleteSubject}
                  onUpdateSubjectGoal={handleUpdateSubjectGoal}
                  onUpdateSubjectColor={handleUpdateSubjectColor}
                  onUpdateSubjectOrder={handleUpdateSubjectOrder}
                  onBulkAddSessions={handleBulkAddSessions}
                  onUndoBulkImport={handleUndoBulkImport}
                  canUndoBulkImport={lastBulkImportIds.length > 0}
                  locations={locations}
                />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ErrorBoundary>
  );
}

