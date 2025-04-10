"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function Home() {
  const { currentUser, logout, getProfilePhotoURL } = useAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const profilePhotoURL = getProfilePhotoURL();

  // process click outside to close user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showUserMenu && !target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  return (
    <main className="flex min-h-screen flex-col text-white">
      <header className="w-full py-6 px-8 flex justify-between items-center bg-black">
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Cloud Video Editor
        </div>
        <div className="flex gap-4 items-center">
          {currentUser ? (
            <>
              <div className="relative user-menu-container">
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  {profilePhotoURL ? (
                    <>
                      <img
                        src={profilePhotoURL}
                        alt="User Avatar"
                        className="w-8 h-8 rounded-full border border-gray-600 hover:border-blue-400 transition-colors"
                        onError={(e) => {
                          // when image load failed, show fallback option
                          e.currentTarget.style.display = 'none';
                          // Show fallback avatar
                          const fallbackAvatar = document.getElementById(`fallback-avatar-${currentUser.uid}`);
                          if (fallbackAvatar) {
                            fallbackAvatar.style.display = 'flex';
                          }
                        }}
                      />
                      <div
                        id={`fallback-avatar-${currentUser.uid}`}
                        className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium hover:bg-blue-600 transition-colors"
                        style={{ display: 'none' }}
                      >
                        {(currentUser.displayName || currentUser.email || '?')[0].toUpperCase()}
                      </div>
                    </>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium hover:bg-blue-600 transition-colors">
                      {(currentUser.displayName || currentUser.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-gray-300">
                    {currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'User')}
                  </span>
                </div>

                {/* User dropdown menu */}
                {showUserMenu && (
                  <div className="absolute right-0 top-10 w-48 py-2 mt-2 bg-white rounded-md shadow-xl z-20">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                      <div className="font-medium">{currentUser.displayName || 'User'}</div>
                      <div className="text-xs text-gray-500 truncate">{currentUser.email}</div>
                    </div>

                    <Link href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
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
              <Link
                  href="/workspace"
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium text-center hover:opacity-90 transition-opacity"
              >
                My WorkSpace
              </Link>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-white hover:text-blue-400 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:opacity-90 transition-opacity"
              >
                Signup
              </Link>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row items-center justify-center px-8 md:px-16 py-10 gap-12 bg-gradient-to-b from-black to-gray-900">
        <div className="flex-1 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            The live share video editor
          </h1>
          <p className="text-gray-300 mb-8 text-lg">
            A colaborative web-based video editor.
            Edit your videos anywhere, anytime wtih others.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            {currentUser ? (
              <Link
                href="/workspace"
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium text-center hover:opacity-90 transition-opacity"
              >
                Go to WorkSpace
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium text-center hover:opacity-90 transition-opacity"
                >
                  Start to Use
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3 bg-slate-700 text-white rounded-lg font-medium text-center hover:bg-slate-600 transition-colors"
                >
                  Login
                </Link>
                <Link
                    href="/editor"
                    className="px-6 py-3 bg-slate-700 text-white rounded-lg font-medium text-center hover:bg-slate-600 transition-colors"
                >
                  Demo Editor
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="relative w-full max-w-md h-[300px] md:h-[400px] rounded-xl overflow-hidden shadow-2xl">
          <Image
            src="https://images.unsplash.com/photo-1528109966604-5a6a4a964e8d?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Video Editing"
            fill
            className="object-cover rounded-3xl"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-6">
            <div className="text-white">
              <div className="text-lg font-semibold">Powerful Features</div>
              <p className="text-sm opacity-80">Animations, Effects, Timeline & More</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
