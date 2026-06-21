import { Session } from '@supabase/supabase-js';

export interface UserProfile {
  email: string;
  display_name: string;
  id: string;
}

export interface MockSession {
  user: UserProfile;
  access_token: string;
  expires_at?: number;
}

// Support both official Supabase Sessions and custom Mock Sessions
type ActiveSession = Session | MockSession | null;

let currentSession: ActiveSession = null;
const listeners = new Set<(s: ActiveSession) => void>();

export const AuthStore = {
  getSession: () => currentSession,
  setSession: (session: ActiveSession) => {
    currentSession = session;
    listeners.forEach((listener) => listener(currentSession));
  },
  subscribe: (listener: (s: ActiveSession) => void) => {
    listeners.add(listener);
    // Return unsubscribe function
    return () => {
      listeners.delete(listener);
    };
  },
};
