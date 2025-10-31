
export enum ConnectionState {
  IDLE = 'Idle',
  CONNECTING = 'Connecting',
  CONNECTED = 'Connected',
  DISCONNECTING = 'Disconnecting',
}

export interface ConversationTurn {
  speaker: 'user' | 'model';
  text: string;
}
