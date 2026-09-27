"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Wallet,
  ReceiptText,
  Sparkles,
  TrendingUp,
  CreditCard,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Dompet & Rekening", href: "/wallets", icon: Wallet },
  { label: "Transaksi", href: "/transactions", icon: ReceiptText },
  { label: "AI Copilot & Struk", href: "/ai-chat", icon: Sparkles, badge: "AI" },
  { label: "Analisis Arus Kas", href: "/analytics", icon: TrendingUp },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const userInitial = user?.email ? user.email.slice(0, 2).toUpperCase() : "FF";
  const userDisplayName = user?.email?.split("@")[0] || "User";

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#eef2f6] border-r border-slate-300/60 p-5 h-screen sticky top-0 shadow-[4px_0_16px_rgba(205,213,224,0.4)]">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-10 h-10 rounded-2xl neu-flat flex items-center justify-center text-emerald-600 font-extrabold shadow-sm">
          <CreditCard className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="font-extrabold text-base text-slate-800 tracking-tight">FinanceFlow</h1>
          <p className="text-[11px] font-medium text-slate-500">Neumorphic Cashflow</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="space-y-2 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-2xl text-xs md:text-sm font-semibold transition-all",
                isActive
                  ? "neu-pressed text-emerald-700 font-bold shadow-inner"
                  : "neu-btn text-slate-600 hover:text-slate-900 border-transparent bg-transparent hover:neu-flat"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive ? "text-emerald-600" : "text-slate-500"
                  )}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] uppercase font-extrabold neu-pressed-sm text-emerald-600 px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Status Bar with Logout Button */}
      <div className="p-3.5 rounded-2xl neu-flat flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-full neu-pressed flex items-center justify-center text-xs font-black text-emerald-600 shrink-0">
            {userInitial}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold text-slate-800 truncate capitalize">{userDisplayName}</p>
            <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Online (Supabase)
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut()}
          title="Keluar dari Aplikasi"
          className="p-2 neu-btn rounded-xl text-slate-500 hover:text-rose-600 transition-all shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}