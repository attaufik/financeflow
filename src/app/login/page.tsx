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
      <div className="relative w-full max-w-md neu-flat rounded-3xl p-6 sm:p-9 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl neu-pressed text-emerald-600 font-black mb-2">
            <Wallet className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
            FinanceFlow
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full neu-pressed text-emerald-700 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> AI
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {mode === "login"
              ? "Masuk ke dasbor keuangan pribadi Anda"
              : "Daftarkan akun personal FinanceFlow Anda"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 neu-pressed rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === "login"
                ? "neu-flat text-emerald-700 font-black shadow-sm"
                : "text-slate-500 hover:text-slate-900"
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
                ? "neu-flat text-emerald-700 font-black shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Daftar Baru
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl neu-flat border-l-4 border-l-rose-500 flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700 font-semibold leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3.5 rounded-2xl neu-flat border-l-4 border-l-emerald-500 flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-700 font-semibold leading-relaxed">{successMessage}</p>
          </div>
        )}

        {/* Form Login / Register */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Alamat Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full neu-input rounded-2xl pl-11 pr-4 py-3 text-xs md:text-sm text-slate-900 placeholder:text-slate-400 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full neu-input rounded-2xl pl-11 pr-4 py-3 text-xs md:text-sm text-slate-900 placeholder:text-slate-400 transition-all font-medium"
              />
            </div>
          </div>

          {mode === "register" && (
            <div className="animate-in fade-in">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Konfirmasi Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Ulangi kata sandi"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full neu-input rounded-2xl pl-11 pr-4 py-3 text-xs md:text-sm text-slate-900 placeholder:text-slate-400 transition-all font-medium"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3.5 rounded-2xl neu-btn-primary font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
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

        <p className="text-[11px] text-center text-slate-400 font-medium">
          Aplikasi personal privat. Dilindungi enkripsi dan autentikasi aman.
        </p>
      </div>
    </div>
  );
}
