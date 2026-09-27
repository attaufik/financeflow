"use client";

import React, { useState } from "react";
import { formatRupiah } from "@/lib/utils";
import { DbAccount, DbPaylaterBill } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { adjustAccountBalance } from "@/lib/finance";
import { useAuth } from "@/context/AuthContext";
import {
  CreditCard,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Landmark,
  Smartphone,
  Wallet,
} from "lucide-react";

interface PayBillModalProps {
  bill: DbPaylaterBill;
  accounts: DbAccount[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PayBillModal({
  bill,
  accounts,
  isOpen,
  onClose,
  onSuccess,
}: PayBillModalProps) {
  const { user } = useAuth();
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts[0]?.id || ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const billAmount = Number(bill.active_bill || 0);
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const selectedBalance = Number(selectedAccount?.balance || 0);
  const isBalanceSufficient = selectedBalance >= billAmount;

  const handlePayBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) {
      setError("Silakan pilih rekening sumber pembayaran");
      return;
    }

    if (!isBalanceSufficient) {
      setError(
        `Saldo ${selectedAccount.name} (${formatRupiah(
          selectedBalance
        )}) tidak mencukupi untuk tagihan ${formatRupiah(billAmount)}`
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Potong saldo rekening terpilih
      const adjustRes = await adjustAccountBalance(
        supabase,
        selectedAccountId,
        -billAmount
      );
      if (!adjustRes.success) {
        throw new Error(adjustRes.error || "Gagal memotong saldo rekening");
      }

      // 2. Dapatkan kategori 'Tagihan & Utilitas' jika ada
      const { data: catData } = await supabase
        .from("categories")
        .select("id")
        .eq("name", "Tagihan & Utilitas")
        .limit(1)
        .maybeSingle();

      // 3. Catat transaksi pengeluaran otomatis
      const newTx = {
        user_id: user?.id,
        account_id: selectedAccountId,
        category_id: catData?.id || null,
        type: "expense",
        amount: billAmount,
        description: `Pelunasan Tagihan ${bill.name}`,
        merchant: "Shopee / SPayLater",
        transaction_date: new Date().toISOString().split("T")[0],
        is_ai_parsed: false,
      };

      const { error: txErr } = await supabase.from("transactions").insert(newTx);
      if (txErr) console.warn("Transaksi warning:", txErr);

      // 4. Ubah status tagihan SPayLater menjadi Lunas
      const { error: billErr } = await supabase
        .from("paylater_bills")
        .update({
          active_bill: 0,
          is_paid: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bill.id);

      if (billErr) throw billErr;

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memproses pelunasan";
      console.error(err);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getAccountIcon = (type: string) => {
    if (type === "bank") return <Landmark className="w-4 h-4 text-blue-600" />;
    if (type === "ewallet") return <Smartphone className="w-4 h-4 text-sky-600" />;
    return <Wallet className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#eef2f6] neu-card rounded-3xl p-6 shadow-2xl space-y-5 border border-white/80">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-300/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-pressed flex items-center justify-center text-rose-600">
              <CreditCard className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">
                Pelunasan Tagihan {bill.name}
              </h3>
              <p className="text-xs text-slate-500 font-medium">Jatuh tempo tanggal {bill.due_date}</p>
            </div>
          </div>
          <button onClick={onClose} className="neu-btn p-1.5 rounded-xl text-slate-500 hover:text-slate-800 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl neu-flat border-l-4 border-rose-500 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700 font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {/* Info Tagihan Card */}
        <div className="p-4 rounded-2xl neu-flat border border-white/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">Total Tagihan Yang Harus Dibayar</span>
            <h4 className="text-2xl font-black text-rose-600 mt-0.5">
              {formatRupiah(billAmount)}
            </h4>
          </div>
          <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full neu-pressed-sm text-rose-600">
            Belum Lunas
          </span>
        </div>

        <form onSubmit={handlePayBill} className="space-y-4">
          {/* Pilihan Sumber Dana Pembayaran */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Pilih Rekening / Sumber Dana Pembayaran
            </label>
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {accounts.map((acc) => {
                const isSelected = selectedAccountId === acc.id;
                const canAfford = Number(acc.balance || 0) >= billAmount;

                return (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "neu-pressed ring-2 ring-emerald-500/40 bg-emerald-500/10"
                        : "neu-flat hover:translate-y-[-1px]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl neu-pressed flex items-center justify-center shrink-0">
                        {getAccountIcon(acc.type)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          {acc.name}
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full neu-pressed-sm text-slate-500 font-semibold">
                            {acc.type}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Saldo:{" "}
                          <span
                            className={
                              canAfford ? "text-slate-800 font-bold" : "text-rose-600 font-bold"
                            }
                          >
                            {formatRupiah(Number(acc.balance || 0))}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!canAfford && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          Kurang
                        </span>
                      )}
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isSelected
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "neu-circle-recessed"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Konfirmasi Pembayaran */}
          <div className="p-3.5 rounded-2xl neu-pressed text-[11px] text-slate-600 font-medium space-y-1">
            <p>
              • Saldo di <b>{selectedAccount?.name || "rekening"}</b> akan otomatis berkurang senilai{" "}
              <b className="text-rose-600">{formatRupiah(billAmount)}</b>.
            </p>
            <p>• Transaksi pengeluaran otomatis dicatat di riwayat kas.</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-300/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 neu-btn rounded-2xl text-xs font-bold text-slate-600 hover:text-slate-900 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !isBalanceSufficient}
              className="flex items-center gap-1.5 neu-btn-primary font-bold px-5 py-2.5 rounded-2xl text-xs text-white transition-all shadow-md disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{submitting ? "Memproses Pelunasan..." : "Konfirmasi & Bayar Lunas"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
