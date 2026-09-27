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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#eef2f6] neu-card rounded-3xl p-6 shadow-2xl space-y-5 border border-white/80">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-300/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-pressed flex items-center justify-center text-rose-600">
              <CreditCard className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Atur Tagihan & Limit {bill.name}</h3>
              <p className="text-xs text-slate-500 font-medium">Sesuaikan tagihan aktif dan tanggal jatuh tempo</p>
            </div>
          </div>
          <button onClick={onClose} className="neu-btn p-1.5 rounded-xl text-slate-500 hover:text-slate-800 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nominal Tagihan Aktif Bulan Ini (Rp)
            </label>
            <input
              type="number"
              required
              placeholder="0 jika sudah lunas"
              value={activeBill}
              onChange={(e) => setActiveBill(e.target.value)}
              className="w-full neu-input rounded-2xl px-4 py-2.5 text-base font-black text-slate-800 focus:outline-none"
            />
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Isi 0 jika tagihan bulan ini sudah tidak ada / lunas.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Total Limit Kredit SPayLater (Rp)
            </label>
            <input
              type="number"
              required
              placeholder="Contoh: 5000000"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              className="w-full neu-input rounded-2xl px-4 py-2.5 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
              className="w-full neu-input rounded-2xl px-4 py-2.5 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none"
            />
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              SPayLater biasanya jatuh tempo tanggal 5, 15, atau 25 setiap bulannya.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-300/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 neu-btn rounded-2xl text-xs font-bold text-slate-600 hover:text-slate-900 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 neu-btn-danger font-bold px-5 py-2.5 rounded-2xl text-xs text-white transition-all shadow-md disabled:opacity-50"
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
