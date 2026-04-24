/**
 * Root page — immediate redirect to /login or /dashboard based on auth state.
 */

import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    try {
      const auth = localStorage.getItem("studymate_auth");
      router.replace(auth ? "/dashboard" : "/login");
    } catch {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <span className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
    </div>
  );
}
