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
    <div className="p-4 rounded-3xl neu-flat border border-white/80 shadow-md space-y-3 max-w-sm">
      {/* Badge AI Header */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-700 uppercase tracking-wider neu-pressed-sm px-2.5 py-1 rounded-full">
          <Sparkles className="w-3 h-3 text-emerald-600" /> Deteksi AI Cerdas
        </span>
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
        <div className="space-y-2.5 pt-1 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">Nama Toko / Merchant</label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full neu-input rounded-xl px-3 py-2 text-slate-800 text-xs font-semibold focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">Nominal (Rp)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full neu-input rounded-xl px-3 py-2 text-slate-800 font-black text-sm focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Sumber Dana</label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full neu-input rounded-xl px-2.5 py-2 text-slate-800 text-xs font-semibold focus:outline-none bg-[#eef2f6]"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-white text-slate-800">
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Kategori</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full neu-input rounded-xl px-2.5 py-2 text-slate-800 text-xs font-semibold focus:outline-none bg-[#eef2f6]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white text-slate-800">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">Deskripsi</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full neu-input rounded-xl px-3 py-2 text-slate-800 text-xs font-semibold focus:outline-none"
            />
          </div>
        </div>
      ) : (
        /* Preview Mode */
        <div className="space-y-2">
          <div>
            <h4 className="text-sm font-black text-slate-800">{merchant}</h4>
            <p className="text-xs text-slate-500 font-medium">{description}</p>
          </div>

          <div className="p-3 rounded-2xl neu-pressed space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Total Nominal</span>
              <span className="font-black text-sm text-emerald-600">
                {formatRupiah(amount)}
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 flex items-center gap-1 font-medium">
                <Wallet className="w-3 h-3 text-slate-400" /> Sumber Dana
              </span>
              <span className="font-bold text-slate-700">
                {selectedAccountObj?.name || "BCA"}
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 flex items-center gap-1 font-medium">
                <Tag className="w-3 h-3 text-slate-400" /> Kategori
              </span>
              <span className="font-bold text-slate-700">
                {selectedCategoryObj?.name || "Belanja & Kebutuhan"}
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 flex items-center gap-1 font-medium">
                <Calendar className="w-3 h-3 text-slate-400" /> Tanggal
              </span>
              <span className="font-semibold text-slate-600">{date}</span>
            </div>
          </div>
        </div>
      )}

      {/* Peringatan jika saldo akun kurang */}
      {selectedAccountObj && initialData.type === "expense" && amount > Number(selectedAccountObj.balance) && !isSaved && (
        <div className="p-3 rounded-2xl neu-flat border-l-4 border-amber-500 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-amber-900">Nominal Melebihi Saldo</p>
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              Nominal {formatRupiah(amount)} melebihi saldo {selectedAccountObj.name} ({formatRupiah(Number(selectedAccountObj.balance))}). Saldo akun akan menjadi minus jika dilanjutkan. Gunakan tombol <b>Koreksi</b> di kanan atas untuk mengedit nominal jika AI salah mendeteksi.
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Action Button */}
      {isSaved ? (
        <div className="w-full py-2.5 neu-pressed rounded-2xl flex items-center justify-center gap-1.5 text-xs font-black text-emerald-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Tersimpan ke Riwayat Kas</span>
        </div>
      ) : (
        <button
          onClick={handleConfirmSave}
          disabled={submitting}
          className="w-full mt-2 neu-btn-primary font-bold py-2.5 rounded-2xl text-xs text-white flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-50"
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
