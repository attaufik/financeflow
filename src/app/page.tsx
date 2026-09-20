"use client";

import React, { useEffect, useState, useCallback } from "react";
import { formatRupiah } from "@/lib/utils";
import { DbAccount, DbPaylaterBill } from "@/types/database";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import PayBillModal from "@/components/paylater/PayBillModal";
import EditBillModal from "@/components/paylater/EditBillModal";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  Calendar,
  Sparkles,
  RefreshCw,
  Landmark,
  Smartphone,
  CreditCard,
  Wallet2,
  PlusCircle,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  Settings2,
} from "lucide-react";

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<DbAccount[]>([]);
  const [paylater, setPaylater] = useState<DbPaylaterBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Pelunasan & Atur Tagihan State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isEditBillModalOpen, setIsEditBillModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accRes, payRes] = await Promise.all([
        supabase.from("accounts").select("*").order("created_at", { ascending: true }),
        supabase.from("paylater_bills").select("*").order("due_date", { ascending: true }).limit(1),
      ]);

      if (accRes.error) throw accRes.error;
      if (payRes.error) throw payRes.error;

      setAccounts(accRes.data || []);
      setPaylater(payRes.data && payRes.data.length > 0 ? payRes.data[0] : null);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Gagal memuat data dari Supabase";
      console.error("Fetch error:", err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Langganan pembaruan Supabase Realtime otomatis
  useRealtimeSync({
    tables: ["accounts", "transactions", "paylater_bills"],
    onSync: fetchData,
  });

  // Hitung Total Aset Cair (Bank + E-Wallet + Cash)
  const totalLiquidAssets = accounts
    .reduce((acc, curr) => acc + Number(curr.balance || 0), 0);

  // Tagihan SPayLater aktif
  const spaylaterBill = paylater && !paylater.is_paid ? Number(paylater.active_bill || 0) : 0;

  // Kekayaan Bersih (Net Worth) = Total Aset Cair - Tagihan SPayLater
  const netWorth = totalLiquidAssets - spaylaterBill;

  // Perhitungan Jatuh Tempo SPayLater Cerdas
  const todayDay = new Date().getDate();
  const dueDay = paylater?.due_date || 25;
  const daysRemaining = dueDay - todayDay;
  const isOverdue = daysRemaining < 0 && spaylaterBill > 0;

  const getAccountIcon = (type: string, name: string) => {
    if (type === "bank") return <Landmark className="w-4 h-4 text-blue-400" />;
    if (type === "ewallet") {
      if (name.toLowerCase().includes("gopay")) return <Wallet2 className="w-4 h-4 text-emerald-400" />;
      return <Smartphone className="w-4 h-4 text-sky-400" />;
    }
    return <Wallet className="w-4 h-4 text-slate-300" />;
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Ringkasan Finansial
          </h2>
          <p className="text-xs md:text-sm text-slate-400">
            Kondisi kas dan kewajiban Anda hari ini (Realtime Supabase)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            title="Refresh Data"
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
          <Link
            href="/ai-chat"
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs md:text-sm transition-all shadow-lg shadow-emerald-500/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Chat AI / Scan Struk</span>
          </Link>
        </div>
      </div>

      {/* Error Alert State */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs md:text-sm font-semibold text-rose-300">
                Gagal Menghubungkan ke Supabase
              </h4>
              <p className="text-xs text-rose-200/80 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchData()}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-medium border border-rose-500/30 transition-all shrink-0"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Bento Grid: Total Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Net Worth */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 relative overflow-hidden">
          <span className="text-xs font-medium text-slate-400">Kekayaan Bersih (Net Worth)</span>
          {loading ? (
            <div className="h-8 w-36 bg-slate-800 animate-pulse rounded-lg mt-2" />
          ) : (
            <h3 className="text-2xl font-extrabold text-white mt-1">
              {formatRupiah(netWorth)}
            </h3>
          )}
          <p className="text-[11px] text-slate-500 mt-2">Total saldo cair dikurangi kewajiban</p>
        </div>

        {/* Total Saldo Cair */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Saldo Tersedia</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          {loading ? (
            <div className="h-7 w-32 bg-slate-800 animate-pulse rounded-lg mt-2" />
          ) : (
            <h3 className="text-xl font-bold text-emerald-400 mt-1">
              {formatRupiah(totalLiquidAssets)}
            </h3>
          )}
          <p className="text-[11px] text-slate-500 mt-2">
            {accounts.length > 0 ? accounts.map((a) => a.name).join(" + ") : "Semua rekening & e-wallet"}
          </p>
        </div>

        {/* Tagihan SPayLater Card dengan Tombol Bayar */}
        <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-900/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-300">Tagihan SPayLater</span>
              {spaylaterBill > 0 ? (
                <ArrowDownLeft className="w-4 h-4 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            {loading ? (
              <div className="h-7 w-32 bg-rose-900/30 animate-pulse rounded-lg mt-2" />
            ) : (
              <h3
                className={`text-xl font-bold mt-1 ${
                  spaylaterBill > 0 ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {spaylaterBill > 0 ? formatRupiah(spaylaterBill) : "Rp 0 (Lunas)"}
              </h3>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-rose-900/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-rose-300/80">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {paylater ? `Jatuh tempo tgl ${paylater.due_date}` : "Tidak ada tagihan"}
              </span>
            </div>

            {paylater && spaylaterBill > 0 && (
              <button
                onClick={() => setIsPayModalOpen(true)}
                className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-rose-500/20"
              >
                Bayar Sekarang
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Dompet & Rekening */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            Dompet & Sumber Dana
          </h3>
          <Link
            href="/wallets"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Kelola Dompet →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 h-28 animate-pulse space-y-3">
                <div className="h-4 w-16 bg-slate-800 rounded" />
                <div className="h-6 w-24 bg-slate-800 rounded mt-4" />
              </div>
            ))}
          </div>
        ) : accounts.length === 0 && !paylater ? (
          <div className="p-8 rounded-2xl bg-slate-900/30 border border-dashed border-slate-800 text-center space-y-3">
            <Wallet className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-300">Belum Ada Data Akun di Supabase</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Silakan tambahkan akun pertama Anda di halaman Dompet.
            </p>
            <Link
              href="/wallets"
              className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buka Halaman Dompet</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Akun-akun Dompet Cair */}
            {accounts.map((account) => (
              <div
                key={account.id}
                className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      {getAccountIcon(account.type, account.name)}
                      <span className="text-xs font-bold text-white tracking-wide">{account.name}</span>
                    </div>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {account.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Saldo</p>
                </div>

                <div className="mt-3">
                  <p className="text-sm font-extrabold truncate text-white">
                    {formatRupiah(Number(account.balance || 0))}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {account.account_number || "Aktif"}
                  </p>
                </div>
              </div>
            ))}

            {/* Kartu SPayLater */}
            {paylater && (
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between hover:border-rose-900/50 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-rose-400" />
                      <span className="text-xs font-bold text-white tracking-wide">{paylater.name}</span>
                    </div>
                    <button
                      onClick={() => setIsEditBillModalOpen(true)}
                      title="Atur Tagihan"
                      className="p-1 text-slate-500 hover:text-white rounded"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    {spaylaterBill > 0 ? "Tagihan Aktif" : "Status Tagihan"}
                  </p>
                </div>

                <div className="mt-3">
                  <p
                    className={`text-sm font-extrabold truncate ${
                      spaylaterBill > 0 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {spaylaterBill > 0 ? formatRupiah(spaylaterBill) : "Lunas (Rp 0)"}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-slate-500">
                      Limit: {formatRupiah(Number(paylater.credit_limit || 0))}
                    </span>
                    {spaylaterBill > 0 && (
                      <button
                        onClick={() => setIsPayModalOpen(true)}
                        className="text-[10px] font-bold text-rose-400 hover:text-rose-300 underline"
                      >
                        Bayar →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Banner AI Peringatan Jatuh Tempo SPayLater */}
      {paylater && (
        <>
          {spaylaterBill > 0 ? (
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isOverdue
                  ? "bg-rose-950/40 border-rose-800/80"
                  : daysRemaining <= 5
                  ? "bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border-amber-500/30"
                  : "bg-slate-900/60 border-slate-800"
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    isOverdue ? "text-rose-400" : "text-amber-400"
                  }`}
                />
                <div>
                  <h4
                    className={`text-xs md:text-sm font-semibold ${
                      isOverdue ? "text-rose-300 font-bold" : "text-amber-300"
                    }`}
                  >
                    {isOverdue
                      ? "PERINGATAN: Tagihan SPayLater Telah Lewat Jatuh Tempo!"
                      : `Peringatan Jatuh Tempo SPayLater (H-${daysRemaining})`}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tagihan sebesar <b>{formatRupiah(spaylaterBill)}</b> jatuh tempo pada tanggal{" "}
                    <b>{paylater.due_date}</b>.
                    {totalLiquidAssets >= spaylaterBill ? (
                      <span className="text-emerald-400 font-medium">
                        {" "}
                        Saldo cair Anda ({formatRupiah(totalLiquidAssets)}) aman untuk pelunasan.
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold">
                        {" "}
                        Perhatian: Saldo Anda kurang dari nominal tagihan!
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsPayModalOpen(true)}
                className="self-end sm:self-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 shrink-0"
              >
                Bayar Tagihan Sekarang
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs md:text-sm font-semibold text-emerald-300">
                    Kondisi Tagihan Bersih & Aman
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Semua tagihan SPayLater bulan ini sudah lunas. Sisa limit kredit Anda utuh senilai{" "}
                    <b>{formatRupiah(Number(paylater.credit_limit || 0))}</b>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditBillModalOpen(true)}
                className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 shrink-0"
              >
                <span>Atur Tagihan Baru</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {paylater && (
        <>
          <PayBillModal
            bill={paylater}
            accounts={accounts}
            isOpen={isPayModalOpen}
            onClose={() => setIsPayModalOpen(false)}
            onSuccess={() => fetchData()}
          />
          <EditBillModal
            bill={paylater}
            isOpen={isEditBillModalOpen}
            onClose={() => setIsEditBillModalOpen(false)}
            onSuccess={() => fetchData()}
          />
        </>
      )}
    </div>
  );
}