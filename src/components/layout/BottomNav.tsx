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
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#eef2f6]/95 backdrop-blur-xl border-t border-white/80 shadow-[0_-6px_20px_rgba(205,213,224,0.7)] px-2 pt-2 pb-[calc(0.6rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-around">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-1 transition-all duration-200 py-1 px-2.5 rounded-2xl",
                                item.highlight
                                    ? "text-emerald-700 font-bold"
                                    : isActive
                                        ? "text-emerald-700 font-bold"
                                        : "text-slate-500 hover:text-slate-800"
                            )}
                        >
                            <div
                                className={cn(
                                    "p-2 rounded-xl transition-all",
                                    item.highlight
                                        ? "neu-btn-primary shadow-sm"
                                        : isActive
                                            ? "neu-pressed text-emerald-700"
                                            : "neu-btn border-transparent bg-transparent"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] tracking-tight font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}