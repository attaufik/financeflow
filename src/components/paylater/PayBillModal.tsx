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
    if (type === "bank") return <Landmark className="w-4 h-4 text-blue-400" />;
    if (type === "ewallet") return <Smartphone className="w-4 h-4 text-sky-400" />;
    return <Wallet className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Pelunasan Tagihan {bill.name}
              </h3>
              <p className="text-xs text-slate-400">Jatuh tempo tanggal {bill.due_date}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-300 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Info Tagihan Card */}
        <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/30 flex items-center justify-between">
          <div>
            <span className="text-xs text-rose-300/80">Total Tagihan Yang Harus Dibayar</span>
            <h4 className="text-2xl font-extrabold text-rose-400 mt-0.5">
              {formatRupiah(billAmount)}
            </h4>
          </div>
          <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Belum Lunas
          </span>
        </div>

        <form onSubmit={handlePayBill} className="space-y-4">
          {/* Pilihan Sumber Dana Pembayaran */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Pilih Rekening / Sumber Dana Pembayaran
            </label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {accounts.map((acc) => {
                const isSelected = selectedAccountId === acc.id;
                const canAfford = Number(acc.balance || 0) >= billAmount;

                return (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30"
                        : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                        {getAccountIcon(acc.type)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          {acc.name}
                          <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                            {acc.type}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Saldo:{" "}
                          <span
                            className={
                              canAfford ? "text-slate-200 font-medium" : "text-rose-400 font-medium"
                            }
                          >
                            {formatRupiah(Number(acc.balance || 0))}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!canAfford && (
                        <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          Kurang
                        </span>
                      )}
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500 text-slate-950"
                            : "border-slate-700"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Konfirmasi Pembayaran */}
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <p>
              • Saldo di <b>{selectedAccount?.name || "rekening"}</b> akan otomatis berkurang senilai{" "}
              <b>{formatRupiah(billAmount)}</b>.
            </p>
            <p>• Transaksi pengeluaran otomatis dicatat di riwayat kas.</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !isBalanceSufficient}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
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
