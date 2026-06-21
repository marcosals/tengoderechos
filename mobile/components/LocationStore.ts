let activeState = 'CDMX';
const listeners = new Set<(s: string) => void>();

export const LocationStore = {
  getState: () => activeState,
  setState: (newState: string) => {
    activeState = newState;
    listeners.forEach((listener) => listener(activeState));
  },
  subscribe: (listener: (s: string) => void) => {
    listeners.add(listener);
    // Return unsubscribe function
    return () => {
      listeners.delete(listener);
    };
  },
};
