"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { DbAccount, DbTransaction, DbPaylaterBill } from "@/types/database";
import { formatRupiah } from "@/lib/utils";
import {
  calculateMonthlyStats,
  calculateCategoryBreakdown,
  calculatePeriodicExpenses,
  MonthlyStats,
  CategoryExpenseBreakdown,
  PeriodicExpenses,
  ExpensePeriod,
} from "@/lib/analytics";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import {
  TrendingUp,
  PieChart,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Wallet,
  CreditCard,
  CheckCircle2,
  HelpCircle,
  Send,
  Loader2,
  RefreshCw,
  Zap,
  ShieldCheck,
  Flame,
  CalendarDays,
  CalendarRange,
  Clock,
  Layers,
} from "lucide-react";

interface AIInsightResult {
  headline: string;
  cashflow_analysis: string;
  spending_warning: string;
  paylater_advice: string;
  tips: string[];
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<DbAccount[]>([]);
  const [transactions, setTransactions] = useState<DbTransaction[]>([]);
  const [paylaterBills, setPaylaterBills] = useState<DbPaylaterBill[]>([]);

  // Computed state
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [periodicExpenses, setPeriodicExpenses] = useState<PeriodicExpenses | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<ExpensePeriod>("month");

  // Dynamic category breakdown based on selected period
  const categories = useMemo(() => {
    return calculateCategoryBreakdown(transactions, selectedPeriod);
  }, [transactions, selectedPeriod]);

  // AI Insight state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<AIInsightResult | null>(null);

  // Q&A state
  const [questionInput, setQuestionInput] = useState("");
  const [qnaLoading, setQnaLoading] = useState(false);
  const [qnaAnswer, setQnaAnswer] = useState<string | null>(null);
  const [askedQuestion, setAskedQuestion] = useState<string | null>(null);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [accRes, txRes, billRes] = await Promise.all([
        supabase.from("accounts").select("*"),
        supabase
          .from("transactions")
          .select("*, categories(name)")
          .order("transaction_date", { ascending: false }),
        supabase.from("paylater_bills").select("*"),
      ]);

      const accData = accRes.data || [];
      const txData = txRes.data || [];
      const billData = billRes.data || [];

      setAccounts(accData);
      setTransactions(txData);
      setPaylaterBills(billData);

      const computedStats = calculateMonthlyStats(accData, txData, billData);
      const computedPeriodic = calculatePeriodicExpenses(txData);

      setStats(computedStats);
      setPeriodicExpenses(computedPeriodic);
    } catch (err) {
      console.error("Error loading analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Langganan pembaruan Supabase Realtime otomatis
  useRealtimeSync({
    tables: ["accounts", "transactions", "paylater_bills"],
    onSync: fetchData,
  });

  // Trigger AI Insight
  const handleGenerateInsight = async () => {
    if (!stats) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats, categories }),
      });
      if (!res.ok) throw new Error("Gagal mengambil insight AI");
      const data: AIInsightResult = await res.json();
      setAiInsight(data);
    } catch (err) {
      console.error(err);
      alert("Gagal memanggil AI Advisor. Pastikan koneksi internet stabil.");
    } finally {
      setAiLoading(false);
    }
  };

  // Submit Tanya AI
  const handleAskQuestion = async (presetQuestion?: string) => {
    const q = presetQuestion || questionInput;
    if (!q.trim() || !stats || qnaLoading) return;

    setQnaLoading(true);
    setAskedQuestion(q);
    setQuestionInput("");

    try {
      const res = await fetch("/api/ai/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats, categories, query: q }),
      });
      if (!res.ok) throw new Error("Gagal mendapatkan jawaban");
      const data = await res.json();
      setQnaAnswer(data.answer || "Tidak ada jawaban yang dihasilkan.");
    } catch (err) {
      console.error(err);
      setQnaAnswer("Maaf, terjadi kendala saat memproses pertanyaan Anda.");
    } finally {
      setQnaLoading(false);
    }
  };

  const getStatusColor = (status: "safe" | "warning" | "danger") => {
    switch (status) {
      case "safe":
        return "text-emerald-700 neu-pressed border-emerald-500/20";
      case "warning":
        return "text-amber-700 neu-pressed border-amber-500/20";
      case "danger":
        return "text-rose-700 neu-pressed border-rose-500/20";
    }
  };

  const categoryBarColors = [
    "bg-emerald-500",
    "bg-sky-500",
    "bg-amber-500",
    "bg-violet-500",
    "bg-rose-500",
    "bg-teal-500",
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Analisis & Prediksi Arus Kas
            </h2>
            <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider neu-pressed px-3 py-1 rounded-full">
              <Sparkles className="w-3 h-3 text-emerald-600" /> Gemini AI
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
            Intelijen finansial, proyeksi saldo akhir bulan, dan rekomendasi hemat berbasis data riil
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold neu-btn rounded-2xl text-slate-600 hover:text-slate-900 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Kartu Perbandingan Pengeluaran Berkala (Hari Ini / Minggu Ini / Bulan Ini) */}
      <div className="space-y-3.5">
        <div className="flex items-center gap-2 px-1">
          <div className="w-7 h-7 rounded-xl neu-pressed flex items-center justify-center text-emerald-600">
            <Clock className="w-4 h-4" />
          </div>
          <h3 className="text-sm md:text-base font-extrabold text-slate-800">
            Pengeluaran Berdasarkan Periode Waktu
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Hari Ini */}
          <div className="p-6 rounded-3xl neu-flat hover:neu-card transition-all flex flex-col justify-between">
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
              <h4 className="text-2xl font-black text-slate-900">
                {formatRupiah(periodicExpenses?.today || 0)}
              </h4>
              <p className="text-[11px] font-medium text-slate-500 mt-2">
                {periodicExpenses && periodicExpenses.today > 0 && periodicExpenses.today > periodicExpenses.dailyAverage ? (
                  <span className="text-amber-600 font-bold">⚠️ Lebih tinggi dari rata-rata harian</span>
                ) : periodicExpenses && periodicExpenses.today > 0 ? (
                  <span className="text-emerald-600 font-bold">✅ Terkendali di bawah rata-rata</span>
                ) : (
                  <span className="text-slate-400">Belum ada pengeluaran hari ini</span>
                )}
              </p>
            </div>
          </div>

          {/* Minggu Ini */}
          <div className="p-6 rounded-3xl neu-flat hover:neu-card transition-all flex flex-col justify-between">
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
              <h4 className="text-2xl font-black text-slate-900">
                {formatRupiah(periodicExpenses?.thisWeek || 0)}
              </h4>
              <p className="text-[11px] font-medium text-slate-500 mt-2">
                Akumulasi pengeluaran Senin s/d hari ini
              </p>
            </div>
          </div>

          {/* Bulan Ini */}
          <div className="p-6 rounded-3xl neu-flat hover:neu-card transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-600" />
                Bulan Ini
              </span>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full neu-pressed text-rose-700">
                {periodicExpenses?.monthCount || 0} transaksi
              </span>
            </div>
            <div>
              <h4 className="text-2xl font-black text-slate-900">
                {formatRupiah(periodicExpenses?.thisMonth || 0)}
              </h4>
              <p className="text-[11px] font-medium text-slate-500 mt-2">
                Rata-rata: <b className="text-slate-700">{formatRupiah(periodicExpenses?.dailyAverage || 0)}/hari</b>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      {loading || !stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-6 rounded-3xl neu-pressed animate-pulse h-36"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. Proyeksi Saldo Akhir Bulan */}
          <div className="p-6 rounded-3xl neu-flat flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Proyeksi Akhir Bulan
              </span>
              <span
                className={`text-[10px] font-black px-2.5 py-1 rounded-full ${getStatusColor(
                  stats.projectedStatus
                )}`}
              >
                {stats.projectedStatus === "safe"
                  ? "Aman"
                  : stats.projectedStatus === "warning"
                  ? "Waspada"
                  : "Defisit"}
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-3">
              {formatRupiah(stats.projectedMonthEndBalance)}
            </h3>
            <p className="text-[11px] font-medium text-slate-500 mt-2">
              Saldo Likuid dikurangi estimasi belanja sisa {stats.daysRemaining} hari & tagihan.
            </p>
          </div>

          {/* 2. Daily Burn Rate */}
          <div className="p-6 rounded-3xl neu-flat flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                Daily Burn Rate
              </span>
              <span className="text-[10px] font-black text-slate-600 neu-pressed px-2.5 py-1 rounded-full">
                Hari ke-{stats.daysPassed}
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-3">
              {formatRupiah(stats.dailyBurnRate)}
              <span className="text-xs font-semibold text-slate-400"> /hari</span>
            </h3>
            <p className="text-[11px] font-medium text-slate-500 mt-2">
              Sisa hari bulan ini: <b className="text-slate-800">{stats.daysRemaining} hari lagi</b>.
            </p>
          </div>

          {/* 3. Pengeluaran Bulan Ini */}
          <div className="p-6 rounded-3xl neu-flat flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                Pengeluaran Bulan Ini
              </span>
              <span className="text-[10px] font-black text-emerald-700 neu-pressed px-2.5 py-1 rounded-full">
                Tabungan: {stats.savingsRate}%
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-3">
              {formatRupiah(stats.totalExpenseThisMonth)}
            </h3>
            <p className="text-[11px] font-medium text-slate-500 mt-2">
              Pemasukan: <b className="text-emerald-700">{formatRupiah(stats.totalIncomeThisMonth)}</b>
            </p>
          </div>

          {/* 4. Tagihan SPayLater Aktif */}
          <div className="p-6 rounded-3xl neu-flat flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-rose-600" />
                Kewajiban SPayLater
              </span>
              <span
                className={`text-[10px] font-black px-2.5 py-1 rounded-full neu-pressed ${
                  stats.activePaylaterBill === 0
                    ? "text-emerald-700"
                    : "text-rose-700"
                }`}
              >
                {stats.activePaylaterBill === 0 ? "Lunas" : "Belum Lunas"}
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-3">
              {formatRupiah(stats.activePaylaterBill)}
            </h3>
            <p className="text-[11px] font-medium text-slate-500 mt-2">
              {stats.activePaylaterBill > 0
                ? "Jatuh tempo tanggal 25. Sisihkan dana di rekening."
                : "Semua tagihan cicilan Anda telah diselesaikan."}
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Breakdown Kategori & Skor Kesehatan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kiri (2 cols): Rincian Pengeluaran Kategori */}
        <div className="lg:col-span-2 p-6 md:p-8 rounded-3xl neu-flat space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl neu-pressed flex items-center justify-center text-sky-600">
                <PieChart className="w-4 h-4" />
              </div>
              <h3 className="text-sm md:text-base font-extrabold text-slate-900">
                Pola Pengeluaran Berdasarkan Kategori
              </h3>
            </div>

            {/* Filter Periode Kategori */}
            <div className="flex items-center neu-pressed p-1 rounded-2xl self-start sm:self-auto">
              {(
                [
                  { key: "today", label: "Hari Ini" },
                  { key: "week", label: "Minggu Ini" },
                  { key: "month", label: "Bulan Ini" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedPeriod(tab.key)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    selectedPeriod === tab.key
                      ? "neu-btn-primary shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-1">
            <span>
              Menampilkan {categories.length} kategori ({selectedPeriod === "today" ? "Hari Ini" : selectedPeriod === "week" ? "Minggu Ini" : "Bulan Ini"})
            </span>
          </div>

          {categories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium neu-pressed rounded-2xl">
              Belum ada transaksi pengeluaran yang tercatat pada {selectedPeriod === "today" ? "hari ini" : selectedPeriod === "week" ? "minggu ini" : "bulan ini"}.
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {categories.map((cat, idx) => (
                <div key={cat.categoryId} className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          categoryBarColors[idx % categoryBarColors.length]
                        }`}
                      />
                      {cat.categoryName}
                      <span className="text-[10px] text-slate-500 font-medium">
                        ({cat.transactionCount} transaksi)
                      </span>
                    </span>
                    <span className="font-extrabold text-slate-900">
                      {formatRupiah(cat.totalAmount)}{" "}
                      <span className="text-slate-500 font-semibold">
                        ({cat.percentage}%)
                      </span>
                    </span>
                  </div>

                  <div className="w-full neu-pressed h-3 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        categoryBarColors[idx % categoryBarColors.length]
                      }`}
                      style={{ width: `${Math.max(2, cat.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kanan (1 col): Skor Kesehatan Finansial */}
        <div className="p-6 md:p-8 rounded-3xl neu-flat flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <div className="w-8 h-8 rounded-xl neu-pressed flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Indeks Kesehatan Finansial</h3>
            </div>

            {stats && (
              <div className="p-6 rounded-3xl neu-pressed text-center space-y-2.5">
                <span className="text-4xl md:text-5xl font-black text-slate-900">
                  {stats.healthScore}
                  <span className="text-base font-semibold text-slate-400">/100</span>
                </span>
                <div>
                  <span
                    className={`inline-block text-xs font-black px-3.5 py-1 rounded-full neu-flat ${
                      stats.healthScore >= 75
                        ? "text-emerald-700"
                        : stats.healthScore >= 50
                        ? "text-amber-700"
                        : "text-rose-700"
                    }`}
                  >
                    {stats.healthStatusText}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2.5 text-xs text-slate-500 font-medium pt-2">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                <span>Rasio Likuiditas Kas</span>
                <span className="text-slate-900 font-bold">Kuat</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                <span>Kekuatan Arus Kas Bersih</span>
                <span
                  className={
                    stats && stats.netCashflow >= 0
                      ? "text-emerald-700 font-bold"
                      : "text-rose-700 font-bold"
                  }
                >
                  {stats && stats.netCashflow >= 0 ? "Surplus" : "Defisit"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Rasio Beban Cicilan</span>
                <span className="text-slate-900 font-bold">Terkendali (&lt;30%)</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerateInsight}
            disabled={aiLoading || !stats}
            className="w-full neu-btn-primary font-black py-3.5 rounded-2xl text-xs md:text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
          >
            {aiLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menganalisis Pola Keuangan...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Konsultasi AI Financial Advisor</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI Financial Advisor Result Card */}
      {aiInsight && (
        <div className="p-6 md:p-8 rounded-3xl neu-flat border-l-4 border-l-emerald-500 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl neu-pressed flex items-center justify-center text-emerald-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Rekomendasi Cerdas AI Financial Advisor
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Dihasilkan khusus berdasarkan profil pengeluaran dan saldo aktif Anda
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 neu-pressed px-3 py-1 rounded-full hidden sm:inline-block">
              Analisis Terverifikasi
            </span>
          </div>

          {/* Headline Callout */}
          <div className="p-4 rounded-2xl neu-pressed text-emerald-800 font-semibold text-sm leading-relaxed">
            💡 &ldquo;{aiInsight.headline}&rdquo;
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Cashflow & Burn Rate */}
            <div className="p-4 rounded-2xl neu-pressed space-y-1.5">
              <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Arus Kas & Burn Rate
              </span>
              <p className="text-slate-600 leading-relaxed font-medium">
                {aiInsight.cashflow_analysis}
              </p>
            </div>

            {/* Spending Warning */}
            <div className="p-4 rounded-2xl neu-pressed space-y-1.5">
              <span className="font-bold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Deteksi Kebocoran Uang
              </span>
              <p className="text-slate-600 leading-relaxed font-medium">
                {aiInsight.spending_warning}
              </p>
            </div>

            {/* PayLater Advice */}
            <div className="p-4 rounded-2xl neu-pressed space-y-1.5">
              <span className="font-bold text-sky-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Evaluasi SPayLater
              </span>
              <p className="text-slate-600 leading-relaxed font-medium">
                {aiInsight.paylater_advice}
              </p>
            </div>
          </div>

          {/* Tips Aksi Nyata */}
          {aiInsight.tips && aiInsight.tips.length > 0 && (
            <div className="pt-3 border-t border-slate-200/80">
              <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Rekomendasi Langkah Nyata Minggu Ini:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {aiInsight.tips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl neu-pressed text-xs text-slate-700 flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full neu-flat text-emerald-700 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed font-medium">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tanya AI Penasihat Keuangan (Interactive Q&A Section) */}
      <div className="p-6 md:p-8 rounded-3xl neu-flat space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl neu-pressed flex items-center justify-center text-emerald-600">
            <HelpCircle className="w-4 h-4" />
          </div>
          <h3 className="text-sm md:text-base font-extrabold text-slate-900">
            Tanya AI Penasihat Keuangan
          </h3>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Ajukan pertanyaan finansial apa pun (misal kelayakan belanja, rencana tabungan, atau pelunasan hutang). AI akan menjawab berdasarkan angka riil Anda.
        </p>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            "Apakah saldo saya aman sampai akhir bulan?",
            "Kategori mana yang paling boros bulan ini?",
            "Bolehkah saya beli gadget Rp 3.000.000 sekarang?",
            "Kapan waktu terbaik untuk melunasi SPayLater?",
          ].map((chip) => (
            <button
              key={chip}
              onClick={() => handleAskQuestion(chip)}
              disabled={qnaLoading}
              className="text-xs neu-btn font-semibold px-3.5 py-2 rounded-2xl transition-all text-left text-slate-700 hover:text-slate-900"
            >
              💬 {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskQuestion();
          }}
          className="flex items-center gap-2.5 pt-2"
        >
          <input
            type="text"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder="Tanyakan kondisi keuangan Anda (misal: 'Apakah aman jika saya belanja 500rb hari ini?')..."
            className="flex-1 neu-input rounded-2xl px-4 py-3 text-xs md:text-sm text-slate-900 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={qnaLoading || !questionInput.trim()}
            className="neu-btn-primary disabled:opacity-50 font-bold px-5 py-3 rounded-2xl text-xs md:text-sm flex items-center gap-2 shadow-sm shrink-0"
          >
            {qnaLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Tanya</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Q&A Output Display */}
        {(qnaLoading || qnaAnswer) && (
          <div className="p-5 rounded-2xl neu-pressed space-y-2 mt-4">
            {askedQuestion && (
              <p className="text-xs font-bold text-emerald-800">
                ❓ Pertanyaan: &ldquo;{askedQuestion}&rdquo;
              </p>
            )}

            {qnaLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2 font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>AI sedang menganalisis kas dan merumuskan jawaban...</span>
              </div>
            ) : (
              <div className="text-xs md:text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-line">
                {qnaAnswer}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}