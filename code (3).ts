import { DayType, OptimizationPreference } from './transit';

export type UserRole = 'commuter' | 'operator';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  signedInAt: string;
}

export interface SearchHistoryItem {
  id: string;
  originId: string;
  destinationId: string;
  originName: string;
  destinationName: string;
  departureTime: string;
  dayType: DayType;
  timestamp: string;
}

export interface SavedCorridorItem {
  id: string;
  originId: string;
  destinationId: string;
  label: string;
  defaultTime: string;
  dayType: DayType;
}

export interface GroundingLink {
  title: string;
  uri: string;
  snippets: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  model?: string;
  groundingLinks?: GroundingLink[];
  createdAt: string;
}

export interface UserPreferencesState {
  originId: string;
  destinationId: string;
  departureTime: string;
  dayType: DayType;
  preference: OptimizationPreference;
  passUpliftFactor: number;
  searchHistory: SearchHistoryItem[];
  savedCorridors: SavedCorridorItem[];
  chatMessages: ChatMessage[];
}