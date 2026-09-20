"use client";

import React, { useEffect, useState, useCallback } from "react";
import { formatRupiah } from "@/lib/utils";
import { DbAccount, DbPaylaterBill, DbAccountType } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import PayBillModal from "@/components/paylater/PayBillModal";
import EditBillModal from "@/components/paylater/EditBillModal";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import {
  Plus,
  Landmark,
  Smartphone,
  CreditCard,
  Wallet2,
  Calendar,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  X,
  Loader2,
  Wallet,
  Sparkles,
  Edit2,
  Trash2,
  CheckCircle2,
  Settings2,
} from "lucide-react";

export default function WalletsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<DbAccount[]>([]);
  const [paylater, setPaylater] = useState<DbPaylaterBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Tambah / Edit Akun
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTargetAccount, setEditTargetAccount] = useState<DbAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [type, setType] = useState<DbAccountType>("bank");
  const [accountNumber, setAccountNumber] = useState("");
  const [balance, setBalance] = useState<string>("");
  const [color, setColor] = useState("from-blue-600 to-blue-800");

  // Modal Hapus Akun
  const [deleteTargetAccount, setDeleteTargetAccount] = useState<DbAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal Pelunasan & Atur Tagihan SPayLater
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isEditBillModalOpen, setIsEditBillModalOpen] = useState(false);

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accRes, payRes] = await Promise.all([
        supabase.from("accounts").select("*").order("created_at", { ascending: true }),
        supabase.from("paylater_bills").select("*").order("due_date", { ascending: true }).limit(1),
      ]);

      if (accRes.error) throw accRes.error;
      if (payRes.error) throw payRes.error;

      setAccounts(accRes.data || []);
      setPaylater(payRes.data && payRes.data.length > 0 ? payRes.data[0] : null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data dompet dari Supabase";
      console.error(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  // Langganan pembaruan Supabase Realtime otomatis
  useRealtimeSync({
    tables: ["accounts", "paylater_bills"],
    onSync: fetchWallets,
  });

  // Buka Modal Tambah Akun
  const openCreateModal = () => {
    setIsEditing(false);
    setEditTargetAccount(null);
    setName("");
    setType("bank");
    setAccountNumber("");
    setBalance("");
    setColor("from-blue-600 to-blue-800");
    setIsModalOpen(true);
  };

  // Buka Modal Edit Akun
  const openEditModal = (acc: DbAccount) => {
    setIsEditing(true);
    setEditTargetAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setAccountNumber(acc.account_number || "");
    setBalance(String(acc.balance || 0));
    setColor(acc.color || "from-blue-600 to-blue-800");
    setIsModalOpen(true);
  };

  // Handle Simpan Akun (Tambah atau Edit)
  const handleSubmitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      if (isEditing && editTargetAccount) {
        // --- EDIT AKUN ---
        const updatedFields = {
          name: name.trim(),
          type,
          account_number: accountNumber.trim() || null,
          balance: parseFloat(balance) || 0,
          color: color || "from-slate-700 to-slate-900",
        };

        const { data, error: updateError } = await supabase
          .from("accounts")
          .update(updatedFields)
          .eq("id", editTargetAccount.id)
          .select()
          .single();

        if (updateError) throw updateError;

        if (data) {
          setAccounts((prev) => prev.map((a) => (a.id === editTargetAccount.id ? data : a)));
        }
      } else {
        // --- TAMBAH AKUN BARU ---
        const newAcc: Partial<DbAccount> = {
          name: name.trim(),
          type,
          account_number: accountNumber.trim() || null,
          balance: parseFloat(balance) || 0,
          color: color || "from-slate-700 to-slate-900",
        };

        if (user?.id) {
          newAcc.user_id = user.id;
        }

        const { data, error: insertError } = await supabase
          .from("accounts")
          .insert(newAcc)
          .select()
          .single();

        if (insertError) throw insertError;

        if (data) {
          setAccounts((prev) => [...prev, data]);
        }
      }

      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan akun";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Hapus Akun
  const handleDeleteAccount = async () => {
    if (!deleteTargetAccount) return;

    setDeleting(true);
    try {
      const { error: delError } = await supabase
        .from("accounts")
        .delete()
        .eq("id", deleteTargetAccount.id);

      if (delError) throw delError;

      setAccounts((prev) => prev.filter((a) => a.id !== deleteTargetAccount.id));
      setDeleteTargetAccount(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus akun";
      alert(msg);
    } finally {
      setDeleting(false);
    }
  };

  // Helper fungsi untuk inisialisasi akun demo/default jika database masih kosong
  const handleSeedDefaults = async () => {
    setSubmitting(true);
    try {
      const defaultAccounts = [
        { user_id: user?.id, name: "BCA", type: "bank" as DbAccountType, account_number: "8830192831", balance: 14500000, color: "from-blue-600 to-blue-800" },
        { user_id: user?.id, name: "SeaBank", type: "bank" as DbAccountType, account_number: "9012839102", balance: 6250000, color: "from-orange-500 to-amber-600" },
        { user_id: user?.id, name: "DANA", type: "ewallet" as DbAccountType, account_number: "0812-3456-7890", balance: 850000, color: "from-sky-500 to-blue-600" },
        { user_id: user?.id, name: "GoPay", type: "ewallet" as DbAccountType, account_number: "0812-3456-7890", balance: 420000, color: "from-emerald-500 to-green-600" },
      ];

      const { error: accErr } = await supabase.from("accounts").insert(defaultAccounts);
      if (accErr) throw accErr;

      const defaultPaylater = {
        user_id: user?.id,
        name: "SPayLater",
        active_bill: 1250000,
        credit_limit: 5000000,
        due_date: 25,
        is_paid: false,
        color: "from-rose-600 to-red-700",
      };

      const { error: payErr } = await supabase.from("paylater_bills").insert([defaultPaylater]);
      if (payErr) console.warn("Paylater insert warning:", payErr);

      await fetchWallets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengisi akun awal";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getWalletIcon = (type: string, name: string) => {
    if (type === "bank") return <Landmark className="w-5 h-5" />;
    if (type === "ewallet") {
      if (name.toLowerCase().includes("gopay")) return <Wallet2 className="w-5 h-5" />;
      return <Smartphone className="w-5 h-5" />;
    }
    return <Wallet className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Dompet & Rekening</h2>
          <p className="text-xs md:text-sm text-slate-400">
            Kelola rekening bank, e-wallet, dan paylater Anda secara realtime
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchWallets()}
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
            <span>Tambah Akun</span>
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
                Terjadi Kesalahan
              </h4>
              <p className="text-xs text-rose-200/80 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchWallets()}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-medium border border-rose-500/30 transition-all shrink-0"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800" />
                <div className="space-y-2">
                  <div className="w-24 h-4 bg-slate-800 rounded" />
                  <div className="w-32 h-3 bg-slate-800 rounded" />
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between">
                <div className="w-28 h-6 bg-slate-800 rounded" />
                <div className="w-16 h-5 bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : accounts.length === 0 && !paylater ? (
        <div className="p-10 rounded-2xl bg-slate-900/30 border border-dashed border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mx-auto">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Belum Ada Akun Terdaftar</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Anda belum memiliki dompet atau rekening di database Supabase. Anda dapat menambahkan akun sendiri atau mengisi akun default (BCA, SeaBank, DANA, GoPay, SPayLater).
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleSeedDefaults}
              disabled={submitting}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{submitting ? "Memproses..." : "Isi Akun Default Otomatis"}</span>
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Manual</span>
            </button>
          </div>
        </div>
      ) : (
        /* List Akun */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Akun-akun Dompet Cair */}
          {accounts.map((acc) => {
            const cardGradient = acc.color || "from-blue-600 to-blue-800";
            return (
              <div
                key={acc.id}
                className="group p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all space-y-4 relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cardGradient} flex items-center justify-center text-white shadow-md`}
                    >
                      {getWalletIcon(acc.type, acc.name)}
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-white">{acc.name}</h4>
                      <p className="text-xs text-slate-500">
                        {acc.account_number || "Rekening / Dompet Digital"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {acc.type}
                    </span>

                    {/* Tombol Aksi Edit & Hapus Akun */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(acc)}
                        title="Edit Akun"
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTargetAccount(acc)}
                        title="Hapus Akun"
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400">Sisa Saldo</span>
                    <p className="text-lg font-extrabold text-white">
                      {formatRupiah(Number(acc.balance || 0))}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" /> Aktif
                  </div>
                </div>
              </div>
            );
          })}

          {/* Akun Khusus SPayLater */}
          {paylater && (
            <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-rose-900/50 transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center text-white shadow-md">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-white">{paylater.name}</h4>
                    <p className="text-xs text-slate-500">Kewajiban / Cicilan PayLater</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      paylater.active_bill > 0
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1"
                    }`}
                  >
                    {paylater.active_bill > 0 ? (
                      "paylater"
                    ) : (
                      <>
                        <CheckCircle2 className="w-2.5 h-2.5" /> Lunas
                      </>
                    )}
                  </span>

                  <button
                    onClick={() => setIsEditBillModalOpen(true)}
                    title="Atur Tagihan & Limit"
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400">Total Tagihan Aktif</span>
                  <p
                    className={`text-lg font-extrabold ${
                      paylater.active_bill > 0 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {paylater.active_bill > 0
                      ? formatRupiah(Number(paylater.active_bill || 0))
                      : "Rp 0 (Lunas)"}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Limit: {formatRupiah(Number(paylater.credit_limit || 0))}
                  </p>
                </div>

                <div className="text-right space-y-1.5">
                  <p className="text-xs font-semibold text-rose-300 flex items-center gap-1 justify-end">
                    <Calendar className="w-3.5 h-3.5" /> Jatuh Tempo Tgl {paylater.due_date}
                  </p>
                  {Number(paylater.active_bill || 0) > 0 && (
                    <button
                      onClick={() => setIsPayModalOpen(true)}
                      className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-rose-500/20"
                    >
                      Bayar Sekarang
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Tambah / Edit Akun */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {isEditing ? "Edit Akun Rekening" : "Tambah Akun Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nama Akun / Bank
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BCA, SeaBank, DANA"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tipe Akun
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as DbAccountType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="bank">Bank</option>
                  <option value="ewallet">E-Wallet</option>
                  <option value="cash">Tunai (Cash)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nomor Rekening / No. HP (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 8830192831 atau 08123..."
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isEditing ? "Saldo Terkini (Rp)" : "Saldo Awal (Rp)"}
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Warna Tema Kartu
                </label>
                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="from-blue-600 to-blue-800">Biru (BCA / Mandiri)</option>
                  <option value="from-orange-500 to-amber-600">Oranye (SeaBank / Shopee)</option>
                  <option value="from-sky-500 to-blue-600">Biru Muda (DANA)</option>
                  <option value="from-emerald-500 to-green-600">Hijau (GoPay / BSI)</option>
                  <option value="from-purple-600 to-indigo-700">Ungu (OVO / Jenius)</option>
                  <option value="from-slate-700 to-slate-900">Abu-abu Netral</option>
                </select>
              </div>

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
                  <span>{submitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Simpan Akun"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Akun */}
      {deleteTargetAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Hapus Akun Ini?</h4>
                <p className="text-xs text-slate-400">Akun tidak akan muncul lagi di dasbor</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1">
              <p className="font-semibold text-white">{deleteTargetAccount.name}</p>
              <p className="text-slate-400">
                Saldo: <b className="text-white">{formatRupiah(Number(deleteTargetAccount.balance))}</b>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTargetAccount(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
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

      {/* Modals SPayLater */}
      {paylater && (
        <>
          <PayBillModal
            bill={paylater}
            accounts={accounts}
            isOpen={isPayModalOpen}
            onClose={() => setIsPayModalOpen(false)}
            onSuccess={() => fetchWallets()}
          />
          <EditBillModal
            bill={paylater}
            isOpen={isEditBillModalOpen}
            onClose={() => setIsEditBillModalOpen(false)}
            onSuccess={() => fetchWallets()}
          />
        </>
      )}
    </div>
  );
}