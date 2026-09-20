"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { formatRupiah } from "@/lib/utils";
import { DbTransaction, DbAccount, DbCategory } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  handleTransactionCreated,
  handleTransactionUpdated,
  handleTransactionDeleted,
} from "@/lib/finance";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Sparkles,
  Plus,
  RefreshCw,
  AlertCircle,
  X,
  Loader2,
  Receipt,
  Edit2,
  Trash2,
} from "lucide-react";

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<DbTransaction[]>([]);
  const [accounts, setAccounts] = useState<DbAccount[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "expense" | "income">("all");

  // Modal Tambah / Edit Transaksi State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTargetTx, setEditTargetTx] = useState<DbTransaction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);

  // Modal Hapus State
  const [deleteTargetTx, setDeleteTargetTx] = useState<DbTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [txRes, accRes, catRes] = await Promise.all([
        supabase
          .from("transactions")
          .select(`*, accounts(name), categories(name)`)
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase.from("accounts").select("*").order("name", { ascending: true }),
        supabase.from("categories").select("*").order("name", { ascending: true }),
      ]);

      if (txRes.error) throw txRes.error;
      if (accRes.error) throw accRes.error;
      if (catRes.error) throw catRes.error;

      setTransactions((txRes.data as unknown as DbTransaction[]) || []);
      setAccounts(accRes.data || []);
      setCategories(catRes.data || []);

      if (accRes.data && accRes.data.length > 0 && !accountId) {
        setAccountId(accRes.data[0].id);
      }
      if (catRes.data && catRes.data.length > 0 && !categoryId) {
        setCategoryId(catRes.data[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat transaksi";
      console.error(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [accountId, categoryId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Langganan pembaruan Supabase Realtime otomatis
  useRealtimeSync({
    tables: ["transactions", "accounts"],
    onSync: fetchTransactions,
  });

  // Buka Modal Tambah Transaksi
  const openCreateModal = () => {
    setIsEditing(false);
    setEditTargetTx(null);
    setTxType("expense");
    setAmount("");
    setDescription("");
    setMerchant("");
    setTxDate(new Date().toISOString().split("T")[0]);
    if (accounts.length > 0) setAccountId(accounts[0].id);
    if (categories.length > 0) setCategoryId(categories[0].id);
    setIsModalOpen(true);
  };

  // Buka Modal Edit Transaksi
  const openEditModal = (tx: DbTransaction) => {
    setIsEditing(true);
    setEditTargetTx(tx);
    setTxType(tx.type);
    setAmount(String(tx.amount));
    setDescription(tx.description || "");
    setMerchant(tx.merchant || "");
    setTxDate(tx.transaction_date || new Date().toISOString().split("T")[0]);
    setAccountId(tx.account_id || (accounts[0]?.id ?? ""));
    setCategoryId(tx.category_id || (categories[0]?.id ?? ""));
    setIsModalOpen(true);
  };

  // Handle Simpan (Tambah atau Edit)
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      alert("Masukkan nominal transaksi yang valid");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && editTargetTx) {
        // --- EDIT TRANSAKSI ---
        const updatedFields = {
          account_id: accountId || null,
          category_id: categoryId || null,
          type: txType,
          amount: numAmount,
          description: description.trim() || (txType === "expense" ? "Pengeluaran" : "Pemasukan"),
          merchant: merchant.trim() || null,
          transaction_date: txDate,
        };

        const { data: updatedTx, error: updateError } = await supabase
          .from("transactions")
          .update(updatedFields)
          .eq("id", editTargetTx.id)
          .select(`*, accounts(name), categories(name)`)
          .single();

        if (updateError) throw updateError;

        // Koreksi saldo otomatis
        await handleTransactionUpdated(
          supabase,
          { account_id: editTargetTx.account_id, amount: editTargetTx.amount, type: editTargetTx.type },
          { account_id: accountId, amount: numAmount, type: txType }
        );

        if (updatedTx) {
          setTransactions((prev) =>
            prev.map((t) => (t.id === editTargetTx.id ? (updatedTx as unknown as DbTransaction) : t))
          );
        }
      } else {
        // --- TRANSAKSI BARU ---
        const newTx: Partial<DbTransaction> = {
          user_id: user?.id,
          account_id: accountId || null,
          category_id: categoryId || null,
          type: txType,
          amount: numAmount,
          description: description.trim() || (txType === "expense" ? "Pengeluaran" : "Pemasukan"),
          merchant: merchant.trim() || null,
          transaction_date: txDate,
          is_ai_parsed: false,
        };

        const { data: insertedTx, error: insertError } = await supabase
          .from("transactions")
          .insert(newTx)
          .select(`*, accounts(name), categories(name)`)
          .single();

        if (insertError) throw insertError;

        // Potong/tambah saldo akun otomatis
        await handleTransactionCreated(supabase, {
          account_id: accountId,
          amount: numAmount,
          type: txType,
        });

        if (insertedTx) {
          setTransactions((prev) => [insertedTx as unknown as DbTransaction, ...prev]);
        }
      }

      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan transaksi";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Hapus Transaksi
  const handleDeleteTransaction = async () => {
    if (!deleteTargetTx) return;

    setDeleting(true);
    try {
      const { error: delError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", deleteTargetTx.id);

      if (delError) throw delError;

      // Kembalikan saldo akun secara konsisten
      await handleTransactionDeleted(supabase, deleteTargetTx);

      setTransactions((prev) => prev.filter((t) => t.id !== deleteTargetTx.id));
      setDeleteTargetTx(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus transaksi";
      alert(msg);
    } finally {
      setDeleting(false);
    }
  };

  // Filter & Search
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterType !== "all" && tx.type !== filterType) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = tx.description?.toLowerCase().includes(q);
        const merchantMatch = tx.merchant?.toLowerCase().includes(q);
        const catMatch = tx.categories?.name?.toLowerCase().includes(q);
        const accMatch = tx.accounts?.name?.toLowerCase().includes(q);
        return descMatch || merchantMatch || catMatch || accMatch;
      }

      return true;
    });
  }, [transactions, filterType, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Riwayat Transaksi</h2>
          <p className="text-xs md:text-sm text-slate-400">
            Kelola, edit, dan pantau arus kas Anda secara konsisten
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTransactions()}
            disabled={loading}
            title="Refresh Data"
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Transaksi</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs md:text-sm font-semibold text-rose-300">
                Gagal Memuat Transaksi
              </h4>
              <p className="text-xs text-rose-200/80 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchTransactions()}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-medium border border-rose-500/30 transition-all shrink-0"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Cari transaksi, toko, atau kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Tab Filter Tipe */}
        <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              filterType === "all"
                ? "bg-slate-800 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilterType("expense")}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              filterType === "expense"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Pengeluaran
          </button>
          <button
            onClick={() => setFilterType("income")}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              filterType === "income"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Pemasukan
          </button>
        </div>
      </div>

      {/* List Transaksi */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800" />
                <div className="space-y-2">
                  <div className="w-32 h-4 bg-slate-800 rounded" />
                  <div className="w-48 h-3 bg-slate-800 rounded" />
                </div>
              </div>
              <div className="w-20 h-5 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        /* Empty State */
        <div className="p-10 rounded-2xl bg-slate-900/30 border border-dashed border-slate-800 text-center space-y-3">
          <Receipt className="w-8 h-8 text-slate-500 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-300">
            {searchQuery || filterType !== "all"
              ? "Tidak ada transaksi yang cocok dengan filter"
              : "Belum Ada Riwayat Transaksi"}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || filterType !== "all"
              ? "Coba ubah kata kunci pencarian atau ganti filter."
              : "Catat pengeluaran dan pemasukan harian Anda agar terpantau rapi."}
          </p>
          {!searchQuery && filterType === "all" && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Transaksi Pertama</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((tx) => {
            const isIncome = tx.type === "income";
            const accountName = tx.accounts?.name || "Akun";
            const categoryName = tx.categories?.name || "Umum";

            return (
              <div
                key={tx.id}
                className="group p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isIncome ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs md:text-sm font-semibold text-white">
                        {tx.description}
                      </h5>
                      {tx.is_ai_parsed && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.2 rounded-md">
                          <Sparkles className="w-2.5 h-2.5" /> AI Struk
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {tx.merchant && <span>{tx.merchant} • </span>}
                      <span className="text-slate-300 font-medium">{accountName}</span> •{" "}
                      {tx.transaction_date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p
                      className={`text-xs md:text-sm font-extrabold ${
                        isIncome ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatRupiah(Number(tx.amount || 0))}
                    </p>
                    <span className="text-[10px] text-slate-500">{categoryName}</span>
                  </div>

                  {/* Tombol Aksi Edit & Hapus (Muncul saat hover di desktop, selalu ada di mobile) */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(tx)}
                      title="Edit Transaksi"
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetTx(tx)}
                      title="Hapus Transaksi"
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah / Edit Transaksi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {isEditing ? "Edit Transaksi" : "Catat Transaksi Manual"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTransaction} className="space-y-4">
              {/* Tipe Transaksi */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTxType("expense")}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    txType === "expense"
                      ? "bg-rose-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setTxType("income")}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    txType === "income"
                      ? "bg-emerald-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Pemasukan
                </button>
              </div>

              {/* Nominal */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nominal (Rp)
                </label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-base font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Akun Dompet & Kategori */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Sumber Dana
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatRupiah(Number(acc.balance || 0))})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Kategori
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {categories
                      .filter((c) => c.type === txType)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Deskripsi Transaksi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Belanja mingguan, Bensin, Kopi"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Merchant & Tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Merchant / Toko
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Alfamart, Pertamina"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Simpan Transaksi"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Transaksi */}
      {deleteTargetTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Hapus Transaksi?</h4>
                <p className="text-xs text-slate-400">Saldo akun akan otomatis disesuaikan</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1">
              <p className="font-semibold text-white">{deleteTargetTx.description}</p>
              <p className="text-slate-400">
                Nominal:{" "}
                <b className={deleteTargetTx.type === "income" ? "text-emerald-400" : "text-rose-400"}>
                  {formatRupiah(Number(deleteTargetTx.amount))}
                </b>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTargetTx(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteTransaction}
                disabled={deleting}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{deleting ? "Menghapus..." : "Ya, Hapus"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}