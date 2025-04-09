"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser === null) {
      router.push("/login");
    }
  }, [currentUser, router]);

  // if the user is not logged in, don't render anything
  if (currentUser === null) {
    return null;
  }

  // if the user is logged in, render the children
  return <>{children}</>;
}
