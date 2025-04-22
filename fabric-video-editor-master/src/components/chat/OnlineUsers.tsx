"use client";

import React from 'react';
import { getUserBgColor } from '@/utils/userColors';

interface OnlineUser {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  lastActive: number;
}

interface OnlineUsersProps {
  users: OnlineUser[];
}

export const OnlineUsers: React.FC<OnlineUsersProps> = ({ users }) => {
  if (users.length === 0) {
    return (
      <div className="text-center text-gray-500 py-2">
        No other users online
      </div>
    );
  }

  return (
    <div className="p-2 border-t border-gray-700">
      <h4 className="text-xs text-gray-400 uppercase mb-2 px-2">Online Users</h4>
      <div className="space-y-2">
        {users.map(user => (
          <div key={user.uid} className="flex items-center px-2 py-1 rounded hover:bg-gray-700">
            <div className="relative">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="h-6 w-6 rounded-full"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling;
                    if (fallback) {
                      (fallback as HTMLElement).style.display = 'flex';
                    }
                  }}
                />
              ) : (
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-xs ${getUserBgColor(user.uid)}`}>
                  {user.displayName[0].toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-0 right-0 h-2 w-2 bg-green-500 rounded-full"></span>
            </div>
            <span className="ml-2 text-sm text-white truncate">{user.displayName}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
