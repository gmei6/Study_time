/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Stopwatch from './components/Stopwatch';
import Visualizations from './components/Visualizations';
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

  const handleAddSubject = async (sub: Subject) => {
    if (!user) return;
    const path = 'subjects';
    try {
      await setDoc(doc(db, path, sub.id), { ...sub, uid: user.uid });
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
            subjects={subjects} 
            sessions={sessions} 
          />
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
            <div className="xl:col-span-2">
              <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-widest mb-6 ml-4">Active Session</h3>
              <Stopwatch 
                subjects={subjects} 
                locations={locations} 
                onSessionComplete={handleSessionComplete}
                onAddLocation={handleAddLocation}
              />
              
              <Visualizations 
                subjects={subjects} 
                sessions={sessions} 
              />
            </div>
            
            <div className="space-y-12">
              <div>
                <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-widest mb-6 ml-4">Insights</h3>
                <Insights 
                  subjects={subjects} 
                  locations={locations} 
                  sessions={sessions} 
                />
              </div>
              
              <div>
                <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-widest mb-6 ml-4">Management</h3>
                <SemesterManagement 
                  semesters={semesters}
                  subjects={subjects}
                  onAddSemester={handleAddSemester}
                  onAddSubject={handleAddSubject}
                  onArchiveSubject={handleArchiveSubject}
                  onDeleteSubject={handleDeleteSubject}
                />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ErrorBoundary>
  );
}

