export type AIState = 'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'reconnecting' | 'error';

export type AIPersona =
  | 'telegram'
  | 'bopha'
  | 'lily'
  | 'dara'
  | 'developer'
  | 'madai'
  | 'terminator'
  | 'fifa2026'
  | 'financemaster'
  | 'genz';

export interface PersonaConfig {
  id: AIPersona;
  name: string;
  tagline: string;
  avatar: string;
  voice: 'Aoede' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';
  prompt: string;
  greeting: string;
  gradient: { from: string; to: string; initial: string };
  isKhmer?: boolean;
}

export interface TranscriptEntry {
  id: string;
  sender: 'user' | 'ai';
  personaName?: string;
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export type AiTranscriptEvent = TranscriptEntry | {
  text: string;
  isFinal: boolean;
  speaker?: 'user' | 'ai';
  sender?: 'user' | 'ai';
};
