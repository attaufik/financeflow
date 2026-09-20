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
  Check,
  Calendar,
  Wallet,
  Tag,
  AlertTriangle,
} from "lucide-react";

export interface ParsedTransaction {
  type: "expense" | "income";
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

  // Find matching account ID or default to first
  const matchedAccount = accounts.find(
    (a) =>
      initialData.account_name &&
      a.name.toLowerCase().includes(initialData.account_name.toLowerCase())
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    matchedAccount?.id || accounts[0]?.id || ""
  );

  // Find matching category ID or default to first
  const matchedCategory = categories.find(
    (c) =>
      initialData.category &&
      c.name.toLowerCase().includes(initialData.category.toLowerCase())
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    matchedCategory?.id || categories[0]?.id || ""
  );

  const [amount, setAmount] = useState<number>(initialData.amount);
  const [description, setDescription] = useState<string>(initialData.description);
  const [merchant, setMerchant] = useState<string>(initialData.merchant || "Umum");
  const [date, setDate] = useState<string>(
    initialData.transaction_date || new Date().toISOString().split("T")[0]
  );

  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleConfirmSave = async () => {
    if (!amount || amount <= 0) return;

    setSubmitting(true);
    try {
      const newTx = {
        user_id: user?.id,
        account_id: selectedAccountId || null,
        category_id: selectedCategoryId || null,
        type: initialData.type || "expense",
        amount: Number(amount),
        description: description.trim() || "Transaksi AI",
        merchant: merchant.trim() || null,
        transaction_date: date,
        is_ai_parsed: true,
      };

      // 1. Simpan Transaksi ke Supabase
      const { error: txErr } = await supabase.from("transactions").insert(newTx);
      if (txErr) throw txErr;

      // 2. Koreksi Saldo Akun Terkait
      if (selectedAccountId) {
        await handleTransactionCreated(supabase, {
          account_id: selectedAccountId,
          amount: Number(amount),
          type: initialData.type || "expense",
        });
      }

      setIsSaved(true);
      setIsEditing(false);
      if (onSaved) onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan transaksi";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAccountObj = accounts.find((a) => a.id === selectedAccountId);
  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-800/40 shadow-xl space-y-3 max-w-sm">
      {/* Badge AI Header */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <Sparkles className="w-3 h-3" /> Deteksi AI Cerdas
        </span>
        {!isSaved && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" />
            <span>{isEditing ? "Tutup" : "Koreksi"}</span>
          </button>
        )}
      </div>

      {/* Main Content */}
      {isEditing ? (
        /* Edit Mode */
        <div className="space-y-2.5 pt-1 text-xs">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Nama Toko / Merchant</label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Nominal (Rp)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Sumber Dana</label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white text-xs"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Kategori</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white text-xs"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Deskripsi</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
            />
          </div>
        </div>
      ) : (
        /* Preview Mode */
        <div className="space-y-2">
          <div>
            <h4 className="text-sm font-bold text-white">{merchant}</h4>
            <p className="text-xs text-slate-300">{description}</p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Nominal</span>
              <span className="font-extrabold text-sm text-emerald-400">
                {formatRupiah(amount)}
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Wallet className="w-3 h-3 text-slate-500" /> Sumber Dana
              </span>
              <span className="font-semibold text-white">
                {selectedAccountObj?.name || "BCA"}
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-500" /> Kategori
              </span>
              <span className="text-slate-300">
                {selectedCategoryObj?.name || "Belanja & Kebutuhan"}
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" /> Tanggal
              </span>
              <span className="text-slate-400">{date}</span>
            </div>
          </div>
        </div>
      )}

      {/* Peringatan jika saldo akun kurang */}
      {selectedAccountObj && initialData.type === "expense" && amount > Number(selectedAccountObj.balance) && !isSaved && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-300">Nominal Melebihi Saldo</p>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              Nominal {formatRupiah(amount)} melebihi saldo {selectedAccountObj.name} ({formatRupiah(Number(selectedAccountObj.balance))}). Saldo akun akan menjadi minus jika dilanjutkan. Gunakan tombol <b>Koreksi</b> di kanan atas untuk mengedit nominal jika AI salah mendeteksi.
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Action Button */}
      {isSaved ? (
        <div className="w-full py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>Tersimpan ke Riwayat Kas</span>
        </div>
      ) : (
        <button
          onClick={handleConfirmSave}
          disabled={submitting}
          className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Menyimpan...</span>
            </>
          ) : (
            <>
              <span>Konfirmasi & Simpan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
