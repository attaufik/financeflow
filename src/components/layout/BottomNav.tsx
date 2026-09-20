"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ReceiptText, Sparkles, Wallet, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { label: "Home", href: "/", icon: LayoutDashboard },
    { label: "Dompet", href: "/wallets", icon: Wallet },
    { label: "AI Copilot", href: "/ai-chat", icon: Sparkles, highlight: true },
    { label: "Riwayat", href: "/transactions", icon: ReceiptText },
    { label: "Analisis", href: "/analytics", icon: TrendingUp },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-around">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-1 transition-all duration-200 py-1 px-3 rounded-xl",
                                item.highlight
                                    ? "text-emerald-400 font-semibold"
                                    : isActive
                                        ? "text-white font-medium"
                                        : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            <div
                                className={cn(
                                    "p-1.5 rounded-xl transition-all",
                                    item.highlight
                                        ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                                        : isActive
                                            ? "bg-slate-800 text-white"
                                            : ""
                                )}
                            >
                                <Icon className="w-5 h-5" />
                            </div>
                            <span className="text-[11px] tracking-tight">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}