import { MockUser, UserPreferencesState } from '../types/userSession';

const ACTIVE_USER_KEY = 'delhitransit_active_user_v1';
const USER_PREFS_PREFIX = 'delhitransit_user_prefs_v1_';

export const DEFAULT_USER_PREFERENCES: UserPreferencesState = {
  originId: 'anand_vihar',
  destinationId: 'connaught_place',
  departureTime: '18:00',
  dayType: 'weekday',
  preference: 'balanced',
  passUpliftFactor: 1.22,
  searchHistory: [],
  savedCorridors: [],
  chatMessages: [
    {
      id: 'welcome-msg',
      role: 'model',
      text: 'Hello! I am your DelhiTransit Assistant. Ask me about bus crowding forecasts, less crowded departure times, 12m vs 9m fleet capacity, or nearby Delhi metro interchanges using Google Maps.',
      model: 'gemini-4-hydrogen',
      createdAt: new Date().toISOString(),
    },
  ],
};

export function loadActiveUser(): MockUser | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MockUser;
    if (parsed && typeof parsed.email === 'string' && typeof parsed.name === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveActiveUser(user: MockUser | null): void {
  try {
    if (!user) {
      window.localStorage.removeItem(ACTIVE_USER_KEY);
    } else {
      window.localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
    }
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function loadUserPreferences(email: string): UserPreferencesState {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { ...DEFAULT_USER_PREFERENCES };

  try {
    const raw = window.localStorage.getItem(`${USER_PREFS_PREFIX}${normalized}`);
    if (!raw) return { ...DEFAULT_USER_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<UserPreferencesState>;
    return {
      ...DEFAULT_USER_PREFERENCES,
      ...parsed,
      searchHistory: Array.isArray(parsed.searchHistory) ? parsed.searchHistory : [],
      savedCorridors: Array.isArray(parsed.savedCorridors) ? parsed.savedCorridors : [],
      chatMessages:
        Array.isArray(parsed.chatMessages) && parsed.chatMessages.length > 0
          ? parsed.chatMessages
          : DEFAULT_USER_PREFERENCES.chatMessages,
    };
  } catch {
    return { ...DEFAULT_USER_PREFERENCES };
  }
}

export function saveUserPreferences(email: string, prefs: UserPreferencesState): void {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  try {
    window.localStorage.setItem(`${USER_PREFS_PREFIX}${normalized}`, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors cleanly
  }
}