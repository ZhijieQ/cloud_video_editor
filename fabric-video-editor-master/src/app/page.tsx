"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function Home() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col text-white">
      <header className="w-full py-6 px-8 flex justify-between items-center bg-black">
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Cloud Video Editor
        </div>
        <div className="flex gap-4 items-center">
          {currentUser ? (
            <>
              <div className="flex items-center gap-2">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="User Avatar"
                    className="w-8 h-8 rounded-full border border-gray-600"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                    {(currentUser.displayName || currentUser.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-gray-300">
                  {currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'User')}
                </span>
              </div>
              <Link
                href="/editor"
                className="px-4 py-2 text-sm font-medium text-white hover:text-blue-400 transition-colors"
              >
                Editor
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
                href="/editor"
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium text-center hover:opacity-90 transition-opacity"
              >
                Go to Editor
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
