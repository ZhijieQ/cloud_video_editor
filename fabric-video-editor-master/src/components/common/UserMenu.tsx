"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface UserMenuProps {
  className?: string;
}

export const UserMenu: React.FC<UserMenuProps> = ({ className = '' }) => {
  const { currentUser, logout, getProfilePhotoURL } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const profilePhotoURL = getProfilePhotoURL();
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!currentUser) {
    return (
      <Link 
        href="/login" 
        className="text-white font-normal hover:text-purple-500 transition-colors"
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className={`relative user-menu-container ${className}`} ref={menuRef}>
      <div 
        className="flex items-center gap-2 cursor-pointer" 
        onClick={() => setShowUserMenu(!showUserMenu)}
      >
        {profilePhotoURL ? (
          <>
            <img
              src={profilePhotoURL}
              alt="User Avatar"
              className="h-10 w-10 rounded-full border border-gray-600 hover:border-blue-400 transition-colors"
              onError={(e) => {
                // 当图像加载失败时，将显示备用选项
                e.currentTarget.style.display = 'none';
                // 显示备用头像
                const fallbackAvatar = document.getElementById(`user-menu-fallback-avatar-${currentUser.uid}`);
                if (fallbackAvatar) {
                  fallbackAvatar.style.display = 'flex';
                }
              }}
            />
            <div 
              id={`user-menu-fallback-avatar-${currentUser.uid}`} 
              className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium hover:bg-blue-600 transition-colors"
              style={{ display: 'none' }}
            >
              {(currentUser.displayName || currentUser.email || '?')[0].toUpperCase()}
            </div>
          </>
        ) : (
          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium hover:bg-blue-600 transition-colors">
            {(currentUser.displayName || currentUser.email || '?')[0].toUpperCase()}
          </div>
        )}
        <span className="text-white text-sm">
          {currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'User')}
        </span>
      </div>
      
      {/* User dropdown menu */}
      {showUserMenu && (
        <div className="absolute right-0 top-12 w-48 py-2 mt-2 bg-white rounded-md shadow-xl z-20">
          <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
            <div className="font-medium">{currentUser.displayName || 'User'}</div>
            <div className="text-xs text-gray-500 truncate">{currentUser.email}</div>
          </div>
          
          <Link href="/workspace" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            My Projects
          </Link>
          
          <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            Profile Settings
          </Link>
          
          <button 
            onClick={() => {
              logout();
              setShowUserMenu(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};
