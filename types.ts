
export interface Participant {
  id: string;
  name: string;
  role?: 'Frontend' | 'Backend' | 'AI' | 'Design' | 'Fullstack'; // Optional for future expansion
  avatar?: string;
}

export interface Team {
  id: string;
  name: string;
  nameZh?: string;
  members: Participant[];
  motto: string;
  mottoZh?: string;
  icebreaker: string;
  icebreakerZh?: string;
  mascotEmoji: string;
  topic?: string;
  topicZh?: string;
  posterUrl?: string; // Base64 image URL
}

export interface GeneratedTeamMetadata {
  id: string;
  name: string;
  nameZh: string;
  motto: string;
  mottoZh: string;
  icebreaker: string;
  icebreakerZh: string;
  mascotEmoji: string;
  topic: string;
  topicZh: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  isHost: boolean;
  timestamp: number;
  isAi?: boolean;
  channelId?: string; // 'lobby' (default) or team ID
  isSystem?: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  titleZh: string;
}

export interface SavedMatch {
  id: string;
  timestamp: number;
  eventName: string;
  eventTheme: string;
  teams: Team[];
  participantCount: number;
  chatMessages?: ChatMessage[];
  taskLibrary?: TaskItem[];
}

export type MatchingStatus = 'idle' | 'shuffling' | 'enriching' | 'complete' | 'error';
