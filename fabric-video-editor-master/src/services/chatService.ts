import {
  ref,
  push,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
  set,
  serverTimestamp,
  DatabaseReference
} from 'firebase/database';
import { database } from '@/utils/firebaseConfig';
import { ChatMessage } from '@/types/chat';

// 获取项目聊天消息引用
export const getProjectChatRef = (projectId: string): DatabaseReference => {
  return ref(database, `chats/${projectId}/messages`);
};

// 发送消息
export const sendMessage = async (
  projectId: string,
  text: string,
  senderId: string,
  senderName: string,
  senderPhotoURL?: string | null
): Promise<void> => {
  try {
    const chatRef = getProjectChatRef(projectId);
    const newMessageRef = push(chatRef);

    await set(newMessageRef, {
      id: newMessageRef.key,
      text,
      senderId,
      senderName,
      senderPhotoURL,
      timestamp: serverTimestamp(),
      projectId
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// 监听消息
export const subscribeToMessages = (
  projectId: string,
  callback: (messages: ChatMessage[]) => void,
  limit: number = 50
): () => void => {
  const chatRef = getProjectChatRef(projectId);
  const messagesQuery = query(
    chatRef,
    orderByChild('timestamp'),
    limitToLast(limit)
  );

  const handleMessages = (snapshot: any) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }

    const messages = Object.values(data) as ChatMessage[];
    // 按时间戳排序
    messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    callback(messages);
  };

  onValue(messagesQuery, handleMessages);

  // 返回取消订阅函数
  return () => off(messagesQuery, 'value', handleMessages);
};
