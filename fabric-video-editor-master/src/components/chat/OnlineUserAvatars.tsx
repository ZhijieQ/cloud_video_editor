"use client";

import React from 'react';
import { getUserBgColor, getUserBorderColor } from '@/utils/userColors';

interface OnlineUser {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  lastActive: number;
}

interface OnlineUserAvatarsProps {
  users: OnlineUser[];
}

export const OnlineUserAvatars: React.FC<OnlineUserAvatarsProps> = ({ users }) => {
  if (users.length === 0) {
    return (
      <div className="text-gray-400 text-sm">
        No other users online...
      </div>
    );
  }

  return (
    <div className="flex">
      {users.map((user, index) => (
        <div key={user.uid} className="relative -ml-2 first:ml-0">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className={`h-10 w-10 rounded-full border-2 hover:scale-110 transition-transform ${getUserBorderColor(user.uid)}`}
              title={user.displayName}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling;
                if (fallback) {
                  (fallback as HTMLElement).style.display = 'flex';
                }
              }}
            />
          ) : (
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold hover:scale-110 transition-transform ${getUserBgColor(user.uid)}`}
              title={user.displayName}
            >
              {user.displayName[0].toUpperCase()}
            </div>
          )}
          <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border border-black"></span>
        </div>
      ))}
    </div>
  );
};
