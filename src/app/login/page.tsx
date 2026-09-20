"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Wallet,
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, signIn, signUp } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Jika sudah ada user login, redirect ke halaman utama
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Silakan masukkan email dan password");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setErrorMessage("Konfirmasi kata sandi tidak cocok");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Kata sandi minimal 6 karakter");
      return;
    }

    setSubmitting(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            setErrorMessage("Email atau kata sandi salah. Silakan periksa kembali.");
          } else {
            setErrorMessage(error.message);
          }
        } else {
          router.push("/");
        }
      } else {
        const { error, user: newUser } = await signUp(email.trim(), password);
        if (error) {
          setErrorMessage(error.message);
        } else {
          if (newUser && newUser.identities && newUser.identities.length === 0) {
            setErrorMessage("Email ini sudah terdaftar. Silakan masuk.");
          } else {
            setSuccessMessage("Akun berhasil dibuat! Silakan masuk atau cek email Anda jika verifikasi aktif.");
            setMode("login");
            setPassword("");
            setConfirmPassword("");
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      {/* Background glow effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-emerald-500/5 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 mb-2">
            <Wallet className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
            FinanceFlow
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> AI
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            {mode === "login"
              ? "Masuk ke dasbor keuangan pribadi Anda"
              : "Daftarkan akun personal FinanceFlow Anda"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 border border-slate-800/80 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === "login"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === "register"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Daftar Baru
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-300 leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-300 leading-relaxed">{successMessage}</p>
          </div>
        )}

        {/* Form Login / Register */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Alamat Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {mode === "register" && (
            <div className="animate-in fade-in">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Konfirmasi Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="Ulangi kata sandi"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <span>{mode === "login" ? "Masuk ke Aplikasi" : "Daftar Sekarang"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-500">
          Aplikasi personal privat. Data keuangan Anda diamankan dengan Row Level Security Supabase.
        </p>
      </div>
    </div>
  );
}
