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
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-950 p-5 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <CreditCard className="w-5 h-5 text-slate-950" />
        </div>
        <div>
          <h1 className="font-bold text-base text-white tracking-tight">FinanceFlow</h1>
          <p className="text-xs text-slate-400">Personal Cashflow</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="space-y-1.5 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-slate-800/80 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("w-4 h-4", isActive ? "text-emerald-400" : "text-slate-400")} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Status Bar with Logout Button */}
      <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
            {userInitial}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-medium text-slate-200 truncate capitalize">{userDisplayName}</p>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {user?.email || "Terhubung"}
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut()}
          title="Keluar dari Aplikasi"
          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}