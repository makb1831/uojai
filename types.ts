
export enum Sender {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system',
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: Sender;
  timestamp: number;
}

export interface DatasetInfo {
  fileName: string;
  content: string;
  topicName: string; // e.g., "Acme Corp", "University X", or user-defined
}

export interface User {
  id: string;
  name?: string;
  email?: string;
  picture?: string;
}
