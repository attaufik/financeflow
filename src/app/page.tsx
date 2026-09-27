"use client";

import React, { useEffect, useState, useCallback } from "react";
import { formatRupiah } from "@/lib/utils";
import { DbAccount, DbPaylaterBill, DbTransaction } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { calculatePeriodicExpenses, PeriodicExpenses } from "@/lib/analytics";
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
  CalendarDays,
  CalendarRange,
  TrendingDown,
  Activity,
} from "lucide-react";

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<DbAccount[]>([]);
  const [paylater, setPaylater] = useState<DbPaylaterBill | null>(null);
  const [, setTransactions] = useState<DbTransaction[]>([]);
  const [periodicExpenses, setPeriodicExpenses] = useState<PeriodicExpenses | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Pelunasan & Atur Tagihan State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isEditBillModalOpen, setIsEditBillModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accRes, payRes, txRes] = await Promise.all([
        supabase.from("accounts").select("*").order("created_at", { ascending: true }),
        supabase.from("paylater_bills").select("*").order("due_date", { ascending: true }).limit(1),
        supabase.from("transactions").select("*, categories(name)").order("transaction_date", { ascending: false }),
      ]);

      if (accRes.error) throw accRes.error;
      if (payRes.error) throw payRes.error;
      if (txRes.error) throw txRes.error;

      setAccounts(accRes.data || []);
      setPaylater(payRes.data && payRes.data.length > 0 ? payRes.data[0] : null);
      const txData = txRes.data || [];
      setTransactions(txData);
      setPeriodicExpenses(calculatePeriodicExpenses(txData));
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
    if (type === "bank") return <Landmark className="w-4 h-4 text-blue-600" />;
    if (type === "ewallet") {
      if (name.toLowerCase().includes("gopay")) return <Wallet2 className="w-4 h-4 text-emerald-600" />;
      return <Smartphone className="w-4 h-4 text-sky-600" />;
    }
    return <Wallet className="w-4 h-4 text-slate-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
            Ringkasan Finansial
          </h2>
          <p className="text-xs md:text-sm text-slate-500 font-medium">
            Kondisi kas dan kewajiban Anda hari ini (Realtime Supabase)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            title="Refresh Data"
            className="p-2.5 neu-btn rounded-2xl text-slate-600 hover:text-slate-900 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
          <Link
            href="/ai-chat"
            className="flex items-center gap-2 neu-btn-primary font-bold px-4 py-2.5 rounded-2xl text-xs md:text-sm shadow-md"
          >
            <Sparkles className="w-4 h-4" />
            <span>Chat AI / Scan Struk</span>
          </Link>
        </div>
      </div>

      {/* Error Alert State */}
      {error && (
        <div className="p-4 rounded-3xl neu-flat border-l-4 border-l-rose-500 flex items-start justify-between gap-3 bg-[#eef2f6]">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs md:text-sm font-bold text-rose-800">
                Gagal Menghubungkan ke Supabase
              </h4>
              <p className="text-xs text-rose-600 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchData()}
            className="px-3 py-1.5 neu-btn rounded-xl text-xs font-bold text-rose-700 shrink-0"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Bento Grid: Total Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Net Worth */}
        <div className="p-6 rounded-3xl neu-flat relative overflow-hidden flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kekayaan Bersih (Net Worth)
            </span>
            {loading ? (
              <div className="h-9 w-36 neu-pressed animate-pulse rounded-xl mt-3" />
            ) : (
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 mt-2">
                {formatRupiah(netWorth)}
              </h3>
            )}
          </div>
          <p className="text-[11px] font-medium text-slate-500 mt-3 pt-3 border-t border-slate-200/80">
            Total saldo cair dikurangi kewajiban
          </p>
        </div>

        {/* Total Saldo Cair */}
        <div className="p-6 rounded-3xl neu-flat flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Saldo Tersedia
              </span>
              <div className="w-8 h-8 rounded-full neu-pressed flex items-center justify-center text-emerald-600">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            {loading ? (
              <div className="h-8 w-32 neu-pressed animate-pulse rounded-xl mt-3" />
            ) : (
              <h3 className="text-2xl md:text-3xl font-black text-emerald-600 mt-2">
                {formatRupiah(totalLiquidAssets)}
              </h3>
            )}
          </div>
          <p className="text-[11px] font-medium text-slate-500 mt-3 pt-3 border-t border-slate-200/80">
            {accounts.length > 0 ? accounts.map((a) => a.name).join(" + ") : "Semua rekening & e-wallet"}
          </p>
        </div>

        {/* Tagihan SPayLater Card dengan Tombol Bayar */}
        <div className="p-6 rounded-3xl neu-flat flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Tagihan SPayLater
              </span>
              <div className={`w-8 h-8 rounded-full neu-pressed flex items-center justify-center ${
                spaylaterBill > 0 ? "text-rose-600" : "text-emerald-600"
              }`}>
                {spaylaterBill > 0 ? (
                  <ArrowDownLeft className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>
            </div>
            {loading ? (
              <div className="h-8 w-32 neu-pressed animate-pulse rounded-xl mt-3" />
            ) : (
              <h3
                className={`text-2xl md:text-3xl font-black mt-2 ${
                  spaylaterBill > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {spaylaterBill > 0 ? formatRupiah(spaylaterBill) : "Rp 0 (Lunas)"}
              </h3>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {paylater ? `Jatuh tempo tgl ${paylater.due_date}` : "Tidak ada tagihan"}
              </span>
            </div>

            {paylater && spaylaterBill > 0 && (
              <button
                onClick={() => setIsPayModalOpen(true)}
                className="px-3.5 py-1.5 neu-btn-danger font-bold text-xs rounded-xl shadow-sm"
              >
                Bayar Sekarang
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Widget Ritme Pengeluaran: Hari Ini, Minggu Ini, Bulan Ini */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl neu-pressed flex items-center justify-center text-emerald-600">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800">
              Ritme Pengeluaran Finansial
            </h3>
          </div>
          <Link
            href="/analytics"
            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
          >
            <span>Analisis Detail</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Hari Ini */}
          <div className="p-5 rounded-3xl neu-flat hover:neu-card transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-sky-600" />
                Hari Ini
              </span>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full neu-pressed text-sky-700">
                {periodicExpenses?.todayCount || 0} transaksi
              </span>
            </div>

            <div>
              <h4 className="text-xl md:text-2xl font-black text-slate-900">
                {formatRupiah(periodicExpenses?.today || 0)}
              </h4>
              <p className="text-[11px] font-medium text-slate-500 mt-2">
                {periodicExpenses && periodicExpenses.today > 0 && periodicExpenses.today > periodicExpenses.dailyAverage ? (
                  <span className="text-amber-600 font-bold">⚠️ Di atas rata-rata harian</span>
                ) : periodicExpenses && periodicExpenses.today > 0 ? (
                  <span className="text-emerald-600 font-bold">✅ Terkendali di bawah rata-rata</span>
                ) : (
                  <span className="text-slate-400">Belum ada pengeluaran hari ini</span>
                )}
              </p>
            </div>
          </div>

          {/* Minggu Ini */}
          <div className="p-5 rounded-3xl neu-flat hover:neu-card transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <CalendarRange className="w-4 h-4 text-amber-600" />
                Minggu Ini
              </span>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full neu-pressed text-amber-700">
                {periodicExpenses?.weekCount || 0} transaksi
              </span>
            </div>

            <div>
              <h4 className="text-xl md:text-2xl font-black text-slate-900">
                {formatRupiah(periodicExpenses?.thisWeek || 0)}
              </h4>
              <p className="text-[11px] font-medium text-slate-500 mt-2">
                Akumulasi Senin s/d hari ini
              </p>
            </div>
          </div>

          {/* Bulan Ini */}
          <div className="p-5 rounded-3xl neu-flat hover:neu-card transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                Bulan Ini
              </span>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full neu-pressed text-rose-700">
                {periodicExpenses?.monthCount || 0} transaksi
              </span>
            </div>

            <div>
              <h4 className="text-xl md:text-2xl font-black text-slate-900">
                {formatRupiah(periodicExpenses?.thisMonth || 0)}
              </h4>
              <p className="text-[11px] font-medium text-slate-500 mt-2">
                Rata-rata: <b className="text-slate-700">{formatRupiah(periodicExpenses?.dailyAverage || 0)}/hari</b>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Dompet & Rekening */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl neu-pressed flex items-center justify-center text-emerald-600">
              <Wallet className="w-4 h-4" />
            </div>
            Dompet & Sumber Dana
          </h3>
          <Link
            href="/wallets"
            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold"
          >
            Kelola Dompet →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-5 rounded-3xl neu-pressed h-32 animate-pulse space-y-3">
                <div className="h-4 w-16 bg-slate-300/60 rounded" />
                <div className="h-6 w-24 bg-slate-300/60 rounded mt-4" />
              </div>
            ))}
          </div>
        ) : accounts.length === 0 && !paylater ? (
          <div className="p-8 rounded-3xl neu-flat text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl neu-pressed flex items-center justify-center mx-auto text-slate-400">
              <Wallet className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Belum Ada Data Akun di Supabase</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Silakan tambahkan akun pertama Anda di halaman Dompet.
            </p>
            <Link
              href="/wallets"
              className="inline-flex items-center gap-1.5 neu-btn-primary font-bold px-4 py-2 rounded-2xl text-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buka Halaman Dompet</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Akun-akun Dompet Cair */}
            {accounts.map((account) => (
              <div
                key={account.id}
                className="p-5 rounded-3xl neu-flat hover:neu-card transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl neu-pressed flex items-center justify-center">
                        {getAccountIcon(account.type, account.name)}
                      </div>
                      <span className="text-xs font-bold text-slate-900 truncate">{account.name}</span>
                    </div>
                  </div>
                  <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full neu-pressed text-slate-600">
                    {account.type}
                  </span>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-slate-500 font-medium">Saldo</p>
                  <p className="text-base font-black truncate text-slate-900 mt-0.5">
                    {formatRupiah(Number(account.balance || 0))}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate font-medium">
                    {account.account_number || "Aktif"}
                  </p>
                </div>
              </div>
            ))}

            {/* Kartu SPayLater */}
            {paylater && (
              <div className="p-5 rounded-3xl neu-flat hover:neu-card transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl neu-pressed flex items-center justify-center text-rose-600">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 truncate">{paylater.name}</span>
                    </div>
                    <button
                      onClick={() => setIsEditBillModalOpen(true)}
                      title="Atur Tagihan"
                      className="p-1.5 neu-btn rounded-xl text-slate-500 hover:text-slate-900"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full neu-pressed text-rose-600">
                    PayLater
                  </span>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-slate-500 font-medium">
                    {spaylaterBill > 0 ? "Tagihan Aktif" : "Status Tagihan"}
                  </p>
                  <p
                    className={`text-base font-black truncate mt-0.5 ${
                      spaylaterBill > 0 ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {spaylaterBill > 0 ? formatRupiah(spaylaterBill) : "Lunas (Rp 0)"}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-slate-500 font-medium truncate">
                      Limit: {formatRupiah(Number(paylater.credit_limit || 0))}
                    </span>
                    {spaylaterBill > 0 && (
                      <button
                        onClick={() => setIsPayModalOpen(true)}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-700 underline"
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
              className={`p-5 rounded-3xl neu-flat flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 ${
                isOverdue
                  ? "border-l-rose-500 bg-rose-50/40"
                  : daysRemaining <= 5
                  ? "border-l-amber-500 bg-amber-50/40"
                  : "border-l-emerald-500 bg-[#eef2f6]"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl neu-pressed flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle
                    className={`w-5 h-5 ${
                      isOverdue ? "text-rose-600" : "text-amber-600"
                    }`}
                  />
                </div>
                <div>
                  <h4
                    className={`text-xs md:text-sm font-bold ${
                      isOverdue ? "text-rose-800" : "text-slate-900"
                    }`}
                  >
                    {isOverdue
                      ? "PERINGATAN: Tagihan SPayLater Telah Lewat Jatuh Tempo!"
                      : `Peringatan Jatuh Tempo SPayLater (H-${daysRemaining})`}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Tagihan sebesar <b className="text-slate-900">{formatRupiah(spaylaterBill)}</b> jatuh tempo pada tanggal{" "}
                    <b>{paylater.due_date}</b>.
                    {totalLiquidAssets >= spaylaterBill ? (
                      <span className="text-emerald-700 font-semibold">
                        {" "}
                        Saldo cair Anda ({formatRupiah(totalLiquidAssets)}) aman untuk pelunasan.
                      </span>
                    ) : (
                      <span className="text-rose-700 font-bold">
                        {" "}
                        Perhatian: Saldo Anda kurang dari nominal tagihan!
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsPayModalOpen(true)}
                className="self-end sm:self-center px-5 py-2.5 neu-btn-primary font-bold text-xs rounded-2xl shadow-md shrink-0"
              >
                Bayar Tagihan Sekarang
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-3xl neu-flat flex items-center justify-between gap-4 border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl neu-pressed flex items-center justify-center text-emerald-600 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs md:text-sm font-bold text-slate-900">
                    Kondisi Tagihan Bersih & Aman
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Semua tagihan SPayLater bulan ini sudah lunas. Sisa limit kredit Anda utuh senilai{" "}
                    <b className="text-slate-900">{formatRupiah(Number(paylater.credit_limit || 0))}</b>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditBillModalOpen(true)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 neu-btn px-3 py-2 rounded-xl flex items-center gap-1 shrink-0"
              >
                <span>Atur Tagihan</span>
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