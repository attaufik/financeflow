"use client";

import React, { useState } from "react";
import { formatRupiah } from "@/lib/utils";
import { DbAccount, DbCategory } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { handleTransactionCreated } from "@/lib/finance";
import { useAuth } from "@/context/AuthContext";
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Edit2,
  Calendar,
  Wallet,
  Tag,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

export interface ParsedTransaction {
  type: "expense" | "income";
  action_intent?: "add_balance" | "reduce_balance" | "transaction";
  amount: number;
  merchant?: string;
  description: string;
  category?: string;
  account_name?: string;
  transaction_date: string;
  confidence?: number;
}

interface TransactionConfirmCardProps {
  initialData: ParsedTransaction;
  accounts: DbAccount[];
  categories: DbCategory[];
  onSaved?: () => void;
}

export default function TransactionConfirmCard({
  initialData,
  accounts,
  categories,
  onSaved,
}: TransactionConfirmCardProps) {
  const { user } = useAuth();

  // Tipe transaksi: "income" (penambahan saldo) atau "expense" (pengurangan saldo)
  const [txType, setTxType] = useState<"income" | "expense">(
    initialData.type || "expense"
  );

  // Cari akun yang cocok berdasarkan nama atau default ke akun pertama
  const matchedAccount = accounts.find(
    (a) =>
      initialData.account_name &&
      a.name.toLowerCase().includes(initialData.account_name.toLowerCase())
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    matchedAccount?.id || accounts[0]?.id || ""
  );

  // Cari kategori yang cocok
  const matchedCategory = categories.find(
    (c) =>
      initialData.category &&
      c.name.toLowerCase().includes(initialData.category.toLowerCase()) &&
      c.type === txType
  );
  const fallbackCat = categories.find((c) => c.type === txType) || categories[0];
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    matchedCategory?.id || fallbackCat?.id || ""
  );

  const [amount, setAmount] = useState<number>(initialData.amount);
  const [description, setDescription] = useState<string>(initialData.description);
  const [merchant, setMerchant] = useState<string>(
    initialData.merchant || (txType === "income" ? "Top Up / Setor Tunai" : "Pengeluaran")
  );
  const [date, setDate] = useState<string>(
    initialData.transaction_date || new Date().toISOString().split("T")[0]
  );

  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const selectedAccountObj = accounts.find((a) => a.id === selectedAccountId);
  const currentBalance = Number(selectedAccountObj?.balance || 0);

  // Estimasi saldo setelah penambahan atau pengurangan
  const isIncome = txType === "income";
  const estimatedNewBalance = isIncome
    ? currentBalance + Number(amount || 0)
    : currentBalance - Number(amount || 0);

  // Ganti tipe transaksi saat mode koreksi
  const handleTypeChange = (newType: "income" | "expense") => {
    setTxType(newType);
    const newCat = categories.find((c) => c.type === newType);
    if (newCat) setSelectedCategoryId(newCat.id);
  };

  const handleConfirmSave = async () => {
    if (!amount || amount <= 0) return;

    setSubmitting(true);
    try {
      const newTx = {
        user_id: user?.id,
        account_id: selectedAccountId || null,
        category_id: selectedCategoryId || null,
        type: txType,
        amount: Number(amount),
        description:
          description.trim() ||
          (isIncome
            ? `Tambah Saldo ${selectedAccountObj?.name || ""}`
            : `Pengeluaran ${selectedAccountObj?.name || ""}`),
        merchant: merchant.trim() || null,
        transaction_date: date,
        is_ai_parsed: true,
      };

      // 1. Simpan Transaksi ke Supabase
      const { error: txErr } = await supabase.from("transactions").insert(newTx);
      if (txErr) throw txErr;

      // 2. Koreksi Saldo Akun Terkait (Income -> saldo bertambah, Expense -> saldo berkurang)
      if (selectedAccountId) {
        await handleTransactionCreated(supabase, {
          account_id: selectedAccountId,
          amount: Number(amount),
          type: txType,
        });
      }

      setIsSaved(true);
      setIsEditing(false);
      if (onSaved) onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan data";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="p-4 rounded-3xl neu-flat border border-white/80 shadow-md space-y-3.5 max-w-sm text-left">
      {/* Badge Header: Intent Tipe (Penambahan vs Pengurangan) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isIncome ? (
            <span className="flex items-center gap-1 text-[10px] font-black text-emerald-700 uppercase tracking-wider neu-pressed-sm px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <TrendingUp className="w-3 h-3 text-emerald-600" /> Penambahan Saldo (+)
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-black text-rose-700 uppercase tracking-wider neu-pressed-sm px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
              <TrendingDown className="w-3 h-3 text-rose-600" /> Pengurangan Saldo (-)
            </span>
          )}
        </div>

        {!isSaved && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="neu-btn text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-xl flex items-center gap-1 font-semibold transition-all"
          >
            <Edit2 className="w-3 h-3" />
            <span>{isEditing ? "Tutup" : "Koreksi"}</span>
          </button>
        )}
      </div>

      {/* Main Content */}
      {isEditing ? (
        /* Edit Mode */
        <div className="space-y-3 pt-1 text-xs">
          {/* Switcher Tipe Mutasi Saldo */}
          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">
              Arah Perubahan Saldo
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 neu-pressed rounded-xl">
              <button
                type="button"
                onClick={() => handleTypeChange("income")}
                className={`py-1.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1 ${
                  isIncome
                    ? "neu-flat text-emerald-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ Tambah Saldo</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("expense")}
                className={`py-1.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1 ${
                  !isIncome
                    ? "neu-flat text-rose-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-rose-600" />
                <span>- Kurang Saldo</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">
              Nominal (Rp)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full neu-input rounded-xl px-3 py-2 text-slate-800 font-black text-sm focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                Akun Dompet / Rekening
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full neu-input rounded-xl px-2.5 py-2 text-slate-800 text-xs font-semibold focus:outline-none bg-[#eef2f6]"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-white text-slate-800">
                    {a.name} ({formatRupiah(Number(a.balance || 0))})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                Kategori
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full neu-input rounded-xl px-2.5 py-2 text-slate-800 text-xs font-semibold focus:outline-none bg-[#eef2f6]"
              >
                {categories
                  .filter((c) => c.type === txType)
                  .map((c) => (
                    <option key={c.id} value={c.id} className="bg-white text-slate-800">
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">
              Deskripsi Singkat
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full neu-input rounded-xl px-3 py-2 text-slate-800 text-xs font-semibold focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">
              Keterangan Toko / Pihak Pengirim
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full neu-input rounded-xl px-3 py-2 text-slate-800 text-xs font-semibold focus:outline-none"
            />
          </div>
        </div>
      ) : (
        /* Preview Mode */
        <div className="space-y-2.5">
          <div>
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <span>{description || merchant}</span>
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              {merchant && merchant !== description ? `${merchant} • ` : ""}
              {date}
            </p>
          </div>

          {/* Kotak Rincian Saldo & Proyeksi Baru */}
          <div className="p-3.5 rounded-2xl neu-pressed space-y-2.5 text-xs">
            {/* Nominal Mutasi */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-300/60">
              <span className="text-slate-500 font-medium">Nominal Mutasi</span>
              <span
                className={`font-black text-base ${
                  isIncome ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {isIncome ? "+" : "-"}
                {formatRupiah(amount)}
              </span>
            </div>

            {/* Rekening Tujuan/Sumber */}
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 flex items-center gap-1 font-medium">
                <Wallet className="w-3 h-3 text-slate-400" /> Akun Terkait
              </span>
              <span className="font-bold text-slate-800">
                {selectedAccountObj?.name || "BCA"}
              </span>
            </div>

            {/* Saldo Saat Ini vs Estimasi Saldo Baru */}
            <div className="p-2 rounded-xl bg-white/50 border border-slate-200/60 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-500">
                <span>Saldo Sekarang:</span>
                <span className="font-semibold text-slate-700">
                  {formatRupiah(currentBalance)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-0.5 border-t border-slate-200/50">
                <span className="font-bold text-slate-700">Estimasi Saldo Baru:</span>
                <span
                  className={`font-black text-xs ${
                    estimatedNewBalance < 0
                      ? "text-rose-600"
                      : isIncome
                      ? "text-emerald-700"
                      : "text-slate-800"
                  }`}
                >
                  {formatRupiah(estimatedNewBalance)}
                </span>
              </div>
            </div>

            {/* Kategori */}
            <div className="flex justify-between items-center text-[11px] pt-1">
              <span className="text-slate-500 flex items-center gap-1 font-medium">
                <Tag className="w-3 h-3 text-slate-400" /> Kategori
              </span>
              <span className="font-bold text-slate-700">
                {selectedCategoryObj?.name || (isIncome ? "Gaji & Pemasukan" : "Pengeluaran")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Peringatan jika saldo akun kurang saat pengeluaran */}
      {selectedAccountObj && !isIncome && amount > currentBalance && !isSaved && (
        <div className="p-3 rounded-2xl neu-flat border-l-4 border-amber-500 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-amber-900">Nominal Melebihi Saldo</p>
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              Saldo {selectedAccountObj.name} ({formatRupiah(currentBalance)}) akan menjadi minus jika dilanjutkan. Gunakan tombol <b>Koreksi</b> jika ingin mengubah nominal atau arah saldo.
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Action Button */}
      {isSaved ? (
        <div className="w-full py-2.5 neu-pressed rounded-2xl flex items-center justify-center gap-1.5 text-xs font-black text-emerald-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>
            {isIncome ? "Saldo Berhasil Ditambahkan!" : "Saldo Berhasil Dipotong!"}
          </span>
        </div>
      ) : (
        <button
          onClick={handleConfirmSave}
          disabled={submitting}
          className={`w-full mt-2 font-bold py-2.5 rounded-2xl text-xs text-white flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-50 ${
            isIncome ? "neu-btn-primary" : "neu-btn-danger"
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Memproses Pembaruan Saldo...</span>
            </>
          ) : (
            <>
              <span>
                {isIncome
                  ? `Konfirmasi & Tambah Saldo (${formatRupiah(amount)})`
                  : `Konfirmasi & Kurangi Saldo (${formatRupiah(amount)})`}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
