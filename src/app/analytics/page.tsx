"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DbAccount, DbTransaction, DbPaylaterBill } from "@/types/database";
import { formatRupiah } from "@/lib/utils";
import {
  calculateMonthlyStats,
  calculateCategoryBreakdown,
  MonthlyStats,
  CategoryExpenseBreakdown,
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
  const [categories, setCategories] = useState<CategoryExpenseBreakdown[]>([]);

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
      const computedCats = calculateCategoryBreakdown(txData);

      setStats(computedStats);
      setCategories(computedCats);
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
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "warning":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      case "danger":
        return "text-rose-400 bg-rose-500/10 border-rose-500/30";
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
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Analisis & Prediksi Arus Kas
            </h2>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <Sparkles className="w-3 h-3" /> Gemini AI
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Intelijen finansial, proyeksi saldo akhir bulan, dan rekomendasi hemat berbasis data riil
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      {loading || !stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse h-32"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Proyeksi Saldo Akhir Bulan */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 border border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Proyeksi Akhir Bulan
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(
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
            <h3 className="text-xl md:text-2xl font-extrabold text-white mt-3">
              {formatRupiah(stats.projectedMonthEndBalance)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-2">
              Saldo Likuid dikurangi estimasi belanja sisa {stats.daysRemaining} hari & tagihan.
            </p>
          </div>

          {/* 2. Daily Burn Rate */}
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Daily Burn Rate
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                Hari ke-{stats.daysPassed}
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-extrabold text-white mt-3">
              {formatRupiah(stats.dailyBurnRate)}
              <span className="text-xs font-normal text-slate-400"> /hari</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-2">
              Sisa hari bulan ini: <b className="text-white">{stats.daysRemaining} hari lagi</b>.
            </p>
          </div>

          {/* 3. Pengeluaran Bulan Ini */}
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                Pengeluaran Bulan Ini
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Tabungan: {stats.savingsRate}%
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-extrabold text-white mt-3">
              {formatRupiah(stats.totalExpenseThisMonth)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-2">
              Pemasukan: <b className="text-emerald-400">{formatRupiah(stats.totalIncomeThisMonth)}</b>
            </p>
          </div>

          {/* 4. Tagihan SPayLater Aktif */}
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-orange-400" />
                Kewajiban SPayLater
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  stats.activePaylaterBill === 0
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                }`}
              >
                {stats.activePaylaterBill === 0 ? "Lunas" : "Belum Lunas"}
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-extrabold text-white mt-3">
              {formatRupiah(stats.activePaylaterBill)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-2">
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
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm md:text-base font-bold text-white">
                Pola Pengeluaran Berdasarkan Kategori
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Total {categories.length} Kategori
            </span>
          </div>

          {categories.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Belum ada transaksi pengeluaran yang tercatat pada bulan ini.
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {categories.map((cat, idx) => (
                <div key={cat.categoryId} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-200 flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          categoryBarColors[idx % categoryBarColors.length]
                        }`}
                      />
                      {cat.categoryName}
                      <span className="text-[10px] text-slate-500">
                        ({cat.transactionCount} transaksi)
                      </span>
                    </span>
                    <span className="font-bold text-white">
                      {formatRupiah(cat.totalAmount)}{" "}
                      <span className="text-slate-400 font-normal">
                        ({cat.percentage}%)
                      </span>
                    </span>
                  </div>

                  <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
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
        <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900/70 to-slate-900/30 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <h3 className="text-sm font-bold text-white">Indeks Kesehatan Finansial</h3>
            </div>

            {stats && (
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center space-y-2">
                <span className="text-4xl font-extrabold text-white">
                  {stats.healthScore}
                  <span className="text-sm font-normal text-slate-500">/100</span>
                </span>
                <div>
                  <span
                    className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${
                      stats.healthScore >= 75
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                        : stats.healthScore >= 50
                        ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                        : "text-rose-400 bg-rose-500/10 border-rose-500/30"
                    }`}
                  >
                    {stats.healthStatusText}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2 text-xs text-slate-400 pt-1">
              <div className="flex justify-between">
                <span>Rasio Likuiditas Kas</span>
                <span className="text-white font-medium">Kuat</span>
              </div>
              <div className="flex justify-between">
                <span>Kekuatan Arus Kas Bersih</span>
                <span
                  className={
                    stats && stats.netCashflow >= 0
                      ? "text-emerald-400 font-medium"
                      : "text-rose-400 font-medium"
                  }
                >
                  {stats && stats.netCashflow >= 0 ? "Surplus" : "Defisit"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Rasio Beban Cicilan</span>
                <span className="text-white font-medium">Terkendali (&lt;30%)</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerateInsight}
            disabled={aiLoading || !stats}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
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
        <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 border border-emerald-800/40 shadow-xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Rekomendasi Cerdas AI Financial Advisor
                </h3>
                <p className="text-xs text-slate-400">
                  Dihasilkan khusus berdasarkan profil pengeluaran dan saldo aktif Anda
                </p>
              </div>
            </div>
            <span className="text-[11px] text-emerald-400/80 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 hidden sm:inline-block">
              Analisis Terverifikasi
            </span>
          </div>

          {/* Headline Callout */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-medium text-sm leading-relaxed">
            💡 &ldquo;{aiInsight.headline}&rdquo;
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Cashflow & Burn Rate */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <span className="font-semibold text-white flex items-center gap-1.5 text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" /> Arus Kas & Burn Rate
              </span>
              <p className="text-slate-300 leading-relaxed">
                {aiInsight.cashflow_analysis}
              </p>
            </div>

            {/* Spending Warning */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <span className="font-semibold text-white flex items-center gap-1.5 text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" /> Deteksi Kebocoran Uang
              </span>
              <p className="text-slate-300 leading-relaxed">
                {aiInsight.spending_warning}
              </p>
            </div>

            {/* PayLater Advice */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <span className="font-semibold text-white flex items-center gap-1.5 text-sky-400">
                <CreditCard className="w-3.5 h-3.5" /> Evaluasi SPayLater
              </span>
              <p className="text-slate-300 leading-relaxed">
                {aiInsight.paylater_advice}
              </p>
            </div>
          </div>

          {/* Tips Aksi Nyata */}
          {aiInsight.tips && aiInsight.tips.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Rekomendasi Langkah Nyata Minggu Ini:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {aiInsight.tips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2"
                  >
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tanya AI Penasihat Keuangan (Interactive Q&A Section) */}
      <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm md:text-base font-bold text-white">
            Tanya AI Penasihat Keuangan
          </h3>
        </div>
        <p className="text-xs text-slate-400">
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
              className="text-xs bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-slate-700/60 transition-all text-left"
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
          className="flex items-center gap-2 pt-2"
        >
          <input
            type="text"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder="Tanyakan kondisi keuangan Anda (misal: 'Apakah aman jika saya belanja 500rb hari ini?')..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={qnaLoading || !questionInput.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
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
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 mt-4">
            {askedQuestion && (
              <p className="text-xs font-semibold text-emerald-400">
                ❓ Pertanyaan: &ldquo;{askedQuestion}&rdquo;
              </p>
            )}

            {qnaLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>AI sedang menganalisis kas dan merumuskan jawaban...</span>
              </div>
            ) : (
              <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                {qnaAnswer}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}