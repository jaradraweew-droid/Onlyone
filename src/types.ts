export type Mood = string;

export interface CustomMood {
  id: string;
  value: string;
  label: string;
  color: string;
}

export type PetType = 'cat' | 'dog';

export type PetActionType = 'feed' | 'love' | 'play';

export interface User {
  id: string;
  name: string;
  seedCode: string;
  mood: Mood | CustomMood;
  customMoods?: CustomMood[];
  partnerId?: string | null;
  archivedAt?: number | null;
  anniversaryDate?: number | null;
  roomName?: string;
  avatarUrl?: string;
  petId?: string;
}

export interface Pet {
  id: string;
  type: PetType;
  name: string;
  birthday: number;
  createdAt: number;
  createdBy: string;
  confirmedBy: string | null;
}

export interface PetStatus {
  hunger: number;
  love: number;
  health: number;
  energy: number;
  lastFedBy: string | null;
  lastFedAt: number | null;
  lastLovedBy: string | null;
  lastLovedAt: number | null;
  feedingsToday: PetAction[];
}

export interface PetAction {
  id: string;
  userId: string;
  userName: string;
  type: PetActionType;
  timestamp: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  type: 'text' | 'leaf' | 'video_link' | 'image';
  imageUrl?: string;
  status?: 'sent' | 'delivered' | 'read';
  replyTo?: string;
  reactions?: Record<string, string[]>;
  isTimelineOnly?: boolean;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export interface Memory {
  id: string;
  uploaderId: string;
  url: string;
  caption: string;
  timestamp: number;
  type: 'image' | 'video';
}

// ─── Leaf Animation ─────────────────────────────────────────────────

export interface LeafConfig {
  id: number;
  x: number;
  finalX: number;
  delay: number;
  duration: number;
  scale: number;
  rotation: number;
  direction: 1 | -1;
}
