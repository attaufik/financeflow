"use client";

import React, { useState } from "react";
import { DbPaylaterBill } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { CreditCard, X, Loader2 } from "lucide-react";

interface EditBillModalProps {
  bill: DbPaylaterBill;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditBillModal({
  bill,
  isOpen,
  onClose,
  onSuccess,
}: EditBillModalProps) {
  const [activeBill, setActiveBill] = useState<string>(String(bill.active_bill || 0));
  const [creditLimit, setCreditLimit] = useState<string>(String(bill.credit_limit || 5000000));
  const [dueDate, setDueDate] = useState<string>(String(bill.due_date || 25));
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numBill = parseFloat(activeBill) || 0;
    const numLimit = parseFloat(creditLimit) || 0;
    const numDue = parseInt(dueDate, 10) || 25;

    setSubmitting(true);
    try {
      const { error: updateErr } = await supabase
        .from("paylater_bills")
        .update({
          active_bill: numBill,
          credit_limit: numLimit,
          due_date: numDue,
          is_paid: numBill === 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bill.id);

      if (updateErr) throw updateErr;

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengupdate tagihan SPayLater";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
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
              <h3 className="text-base font-bold text-white">Atur Tagihan & Limit {bill.name}</h3>
              <p className="text-xs text-slate-400">Sesuaikan tagihan aktif dan tanggal jatuh tempo</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nominal Tagihan Aktif Bulan Ini (Rp)
            </label>
            <input
              type="number"
              required
              placeholder="0 jika sudah lunas"
              value={activeBill}
              onChange={(e) => setActiveBill(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base font-bold text-white focus:outline-none focus:border-rose-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Isi 0 jika tagihan bulan ini sudah tidak ada / lunas.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Total Limit Kredit SPayLater (Rp)
            </label>
            <input
              type="number"
              required
              placeholder="Contoh: 5000000"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tanggal Jatuh Tempo Setiap Bulan
            </label>
            <input
              type="number"
              min={1}
              max={31}
              required
              placeholder="Contoh: 25"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-rose-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              SPayLater biasanya jatuh tempo tanggal 5, 15, atau 25 setiap bulannya.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{submitting ? "Menyimpan..." : "Simpan Pengaturan"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
