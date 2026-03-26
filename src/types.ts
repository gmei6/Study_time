export interface Semester {
  id: string;
  name: string; // e.g., "Fall 2025"
  startDate: string; // ISO string
  endDate: string; // ISO string
  isActive: boolean;
  uid: string;
}

export interface Subject {
  id: string;
  semesterId: string;
  name: string;
  dailyGoalMinutes: number;
  isArchived: boolean;
  color: string;
  order: number;
  uid: string;
}

export interface Location {
  id: string;
  name: string;
  uid: string;
}

export interface StudySession {
  id: string;
  subjectId: string;
  locationId: string;
  startTime: string; // ISO string
  endTime: string | null; // ISO string
  durationSeconds: number;
  interruptions: number;
  dateLogged: string; // The date the session started (Midnight Rule)
  uid: string;
}

export interface DailyStats {
  date: string;
  totalMinutes: number;
  bySubject: Record<string, number>;
}
