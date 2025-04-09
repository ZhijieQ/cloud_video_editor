"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage } from '@/types/chat';
import { sendMessage, subscribeToMessages } from '@/services/chatService';
import { setUserOnlineStatus, subscribeToOnlineUsers } from '@/services/presenceService';
import { OnlineUsers } from './OnlineUsers';
import { formatDistanceToNow } from 'date-fns';

interface ChatPanelProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ projectId, isOpen, onClose }) => {
  const { currentUser, getProfilePhotoURL } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 订阅消息
  useEffect(() => {
    if (!projectId || !isOpen || !currentUser) return;

    setLoading(true);
    const unsubscribeMessages = subscribeToMessages(projectId, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);
    });

    // 设置用户在线状态
    const cleanupPresence = setUserOnlineStatus(projectId, currentUser.uid, {
      displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
      photoURL: getProfilePhotoURL(),
      lastActive: Date.now()
    });

    // 订阅在线用户
    const unsubscribeUsers = subscribeToOnlineUsers(
      projectId,
      currentUser.uid,
      (users) => setOnlineUsers(users)
    );

    return () => {
      unsubscribeMessages();
      unsubscribeUsers();
      cleanupPresence();
    };
  }, [projectId, isOpen, currentUser, getProfilePhotoURL]);

  // 滚动到最新消息
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // 发送消息
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !currentUser) return;

    try {
      await sendMessage(
        projectId,
        newMessage,
        currentUser.uid,
        currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        getProfilePhotoURL()
      );
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-0 w-80 h-96 bg-gray-800 border border-gray-700 rounded-tl-lg shadow-lg flex flex-col z-50">
      {/* 聊天头部 */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-700 bg-gray-900 rounded-tl-lg">
        <h3 className="text-white font-medium">Team Chat</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-4">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-xs ${message.senderId === currentUser?.uid ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* 用户头像 */}
                <div className="flex-shrink-0">
                  {message.senderPhotoURL ? (
                    <img
                      src={message.senderPhotoURL}
                      alt={message.senderName}
                      className="h-8 w-8 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) {
                          (fallback as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                      {message.senderName[0].toUpperCase()}
                    </div>
                  )}
                </div>

                {/* 消息内容 */}
                <div
                  className={`ml-2 mr-2 px-4 py-2 rounded-lg ${
                    message.senderId === currentUser?.uid
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  <div className="text-xs text-gray-300 mb-1">
                    {message.senderId !== currentUser?.uid && (
                      <span className="font-medium">{message.senderName}</span>
                    )}
                    {message.timestamp && (
                      <span className="ml-2 text-gray-400">
                        {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm break-words">{message.text}</p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 消息输入框 */}
      <form onSubmit={handleSendMessage} className="p-2 border-t border-gray-700 bg-gray-900">
        <div className="flex">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 text-white rounded-l-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-600 text-white rounded-r-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </form>

      {/* 在线用户列表 */}
      <OnlineUsers users={onlineUsers} />
    </div>
  );
};
