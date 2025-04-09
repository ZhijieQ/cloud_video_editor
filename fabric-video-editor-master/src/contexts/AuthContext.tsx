"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { auth } from "@/utils/firebaseConfig";
import { useRouter } from "next/navigation";

function fixGooglePhotoURL(url: string | null): string | null {
  if (!url) return null;

  if (url.includes('googleusercontent.com')) {
    return url.replace(/=s\d+-c/, '=s128-c');
  }

  return url;
}

// Create the type for the authentication context
type AuthContextType = {
  currentUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  getProfilePhotoURL: () => string | null | undefined;
};

// Create the default value for the context
const defaultAuthContext: AuthContextType = {
  currentUser: null,
  loading: true,
  logout: async () => {},
  getProfilePhotoURL: () => null
};

// Create the context
const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// Create a custom hook to access the context
export const useAuth = () => useContext(AuthContext);

// Create the provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Set Firebase authentication state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup
    return unsubscribe;
  }, []);

  // Logout function
  const logout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getProfilePhotoURL = () => {
    if (!currentUser) return null;
    return fixGooglePhotoURL(currentUser.photoURL);
  };

  const value = {
    currentUser,
    loading,
    logout,
    getProfilePhotoURL
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
