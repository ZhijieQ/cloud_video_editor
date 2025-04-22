export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string | null;
  timestamp: number;
  projectId: string;
}

export interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
}
