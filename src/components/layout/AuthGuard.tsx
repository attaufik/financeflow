"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import { Loader2 } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.replace("/login");
    }
  }, [user, loading, isLoginPage, router]);

  // 1. JIKA DI HALAMAN LOGIN: Langsung render tanpa guard atau loading!
  if (isLoginPage) {
    return <main className="min-h-screen bg-slate-950">{children}</main>;
  }

  // 2. Loading screen HANYA saat memeriksa sesi untuk halaman privat
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3 p-4 text-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-xs text-slate-400">Memeriksa sesi keamanan...</p>
        <a
          href="/login"
          className="text-xs text-emerald-400 hover:text-emerald-300 underline pt-2 font-medium"
        >
          Masuk ke Halaman Login &rarr;
        </a>
      </div>
    );
  }

  // 3. Jika belum login dan bukan di halaman login
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3 p-4 text-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-xs text-slate-400">Mengarahkan ke halaman login...</p>
        <a
          href="/login"
          className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl mt-2 transition-all"
        >
          Buka Halaman Login
        </a>
      </div>
    );
  }

  // Jika sudah login, tampilkan layout lengkap
  return (
    <div className="flex min-h-screen">
      {/* Sidebar Desktop */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 pb-20 md:pb-8 max-w-7xl mx-auto w-full p-4 md:p-8">
        {children}
      </main>

      {/* Bottom Nav Mobile */}
      <BottomNav />
    </div>
  );
}
