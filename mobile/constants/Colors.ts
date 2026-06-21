const tintColorLight = '#4F46E5'; // Indigo 600
const tintColorDark = '#818CF8';  // Indigo 400

export default {
  light: {
    text: '#0F172A',               // Slate 900
    textMuted: '#475569',          // Slate 600
    background: '#F8FAFC',         // Slate 50
    cardBackground: '#FFFFFF',
    border: '#E2E8F0',             // Slate 200
    tint: tintColorLight,
    tabIconDefault: '#94A3B8',     // Slate 400
    tabIconSelected: tintColorLight,
    primary: '#4F46E5',            // Indigo 600
    accent: '#D97706',             // Amber 600
  },
  dark: {
    text: '#F8FAFC',               // Slate 50
    textMuted: '#94A3B8',          // Slate 400
    background: '#0F172A',         // Slate 900
    cardBackground: '#1E293B',     // Slate 800
    border: '#334155',             // Slate 700
    tint: tintColorDark,
    tabIconDefault: '#475569',     // Slate 600
    tabIconSelected: tintColorDark,
    primary: '#6366F1',            // Indigo 500
    accent: '#F59E0B',             // Amber 500
  },
};
