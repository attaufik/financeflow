"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Camera, Send, ImagePlus, Bot, User, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DbAccount, DbCategory } from "@/types/database";
import TransactionConfirmCard, { ParsedTransaction } from "@/components/ai/TransactionConfirmCard";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text?: string;
  imagePreview?: string;
  parsedTx?: ParsedTransaction;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Halo Taufik! Saya AI Financial Copilot Anda. Anda bisa memerintahkan saya untuk mengupdate saldo atau mencatat pengeluaran secara instan:",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [accounts, setAccounts] = useState<DbAccount[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load data akun & kategori untuk AI
  const loadMetadata = useCallback(async () => {
    const [accRes, catRes] = await Promise.all([
      supabase.from("accounts").select("*").order("name", { ascending: true }),
      supabase.from("categories").select("*").order("name", { ascending: true }),
    ]);
    if (accRes.data) setAccounts(accRes.data);
    if (catRes.data) setCategories(catRes.data);
  }, []);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  // Auto scroll ke bawah
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, analyzing]);

  // Kirim input teks ke AI
  const handleSendText = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || analyzing) return;

    const userMsgId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text: text.trim() },
    ]);
    setInputText("");
    setAnalyzing(true);

    try {
      const res = await fetch("/api/ai/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          accounts: accounts.map((a) => ({ id: a.id, name: a.name, balance: a.balance })),
          categories: categories.map((c) => ({ id: c.id, name: c.name, type: c.type })),
        }),
      });

      if (!res.ok) throw new Error("Gagal menganalisis teks");

      const parsedData: ParsedTransaction = await res.json();

      let assistantResponse = "Saya telah mendeteksi transaksi Anda. Silakan periksa kartu konfirmasi berikut sebelum disimpan:";
      if (parsedData.type === "income" || parsedData.action_intent === "add_balance") {
        assistantResponse = `Saya mendeteksi perintah penambahan saldo untuk ${parsedData.account_name || "akun Anda"}. Silakan periksa kartu konfirmasi penambahan saldo di bawah:`;
      } else if (parsedData.action_intent === "reduce_balance") {
        assistantResponse = `Saya mendeteksi perintah pengurangan saldo untuk ${parsedData.account_name || "akun Anda"}. Silakan periksa kartu konfirmasi pemotongan saldo di bawah:`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: assistantResponse,
          parsedTx: parsedData,
        },
      ]);
    } catch (err: unknown) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: "Maaf, saya belum dapat memahami perintah tersebut. Coba kalimat seperti 'Tambah saldo BCA 500rb' atau 'Kurangi saldo GoPay 50rb'.",
        },
      ]);
    } finally {
      setAnalyzing(false);
    }
  };

  // Upload & Baca Foto Struk Belanjaan
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;

      // Tampilkan foto di pesan pengguna
      const userMsgId = Date.now().toString();
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          sender: "user",
          text: "Menganalisis foto struk...",
          imagePreview: base64Data,
        },
      ]);

      setAnalyzing(true);

      try {
        const res = await fetch("/api/ai/parse-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type || "image/jpeg",
            accounts: accounts.map((a) => ({ id: a.id, name: a.name })),
            categories: categories.map((c) => ({ id: c.id, name: c.name })),
          }),
        });

        if (!res.ok) throw new Error("Gagal membaca foto struk");

        const parsedData = await res.json();

        const assistantText = parsedData.is_mock
          ? "Struk berhasil diterima! (Catatan: GEMINI_API_KEY belum dipasang di .env.local sehingga AI menampilkan contoh simulasi. Pasang kunci Gemini gratis untuk membaca gambar struk Anda secara live)."
          : `Struk berhasil dibaca! Terdeteksi total belanja senilai Rp ${Number(
              parsedData.amount
            ).toLocaleString("id-ID")} di ${parsedData.merchant || "toko"}. Silakan konfirmasi:`;

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "assistant",
            text: assistantText,
            parsedTx: parsedData,
          },
        ]);
      } catch (err: unknown) {
        console.error(err);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "assistant",
            text: "Maaf, gambar struk kurang jelas atau tidak terbaca. Pastikan tulisan total harga dan nama toko terlihat jelas.",
          },
        ]);
      } finally {
        setAnalyzing(false);
      }
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-300/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl neu-flat flex items-center justify-center text-emerald-600 shadow-sm">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <span>AI Financial Copilot</span>
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full neu-pressed-sm text-emerald-700">
                Vision & Balance AI
              </span>
            </h3>
            <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Perintah tambah/kurang saldo, foto struk, & catat mutasi otomatis
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg) => {
          const isAssistant = msg.sender === "assistant";

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isAssistant ? "" : "flex-row-reverse"}`}
            >
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isAssistant
                    ? "neu-flat text-emerald-600"
                    : "neu-pressed text-emerald-700"
                }`}
              >
                {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div
                className={`space-y-2.5 ${
                  isAssistant ? "max-w-md" : "max-w-xs sm:max-w-sm text-right"
                }`}
              >
                {/* Bubble Text */}
                {msg.text && (
                  <div
                    className={`p-4 rounded-3xl text-xs md:text-sm leading-relaxed ${
                      isAssistant
                        ? "neu-flat text-slate-800 border border-white/80"
                        : "neu-pressed text-emerald-950 bg-emerald-500/10 border border-emerald-500/20 font-semibold ml-auto"
                    }`}
                  >
                    <p>{msg.text}</p>
                    {msg.id === "welcome" && (
                      <ul className="text-xs text-slate-600 font-medium space-y-1.5 list-disc list-inside mt-2.5">
                        <li><b>Tambah / Isi Saldo</b>: <i>&quot;Tambah saldo BCA 500rb&quot;</i> atau <i>&quot;Top up DANA 100rb&quot;</i>.</li>
                        <li><b>Kurangi / Tarik Saldo</b>: <i>&quot;Kurangi saldo GoPay 50rb&quot;</i> atau <i>&quot;Tarik tunai BCA 200rb&quot;</i>.</li>
                        <li><b>Catat Pengeluaran</b>: <i>&quot;Beli bensin 50rb pakai Mandiri&quot;</i>.</li>
                        <li><b>Scan Struk</b>: Kirim foto struk belanjaan untuk diekstrak otomatis.</li>
                      </ul>
                    )}
                  </div>
                )}

                {/* Foto Struk Preview jika ada */}
                {msg.imagePreview && (
                  <div className="rounded-2xl overflow-hidden neu-flat p-1 border border-white/80 max-w-[200px] ml-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={msg.imagePreview}
                      alt="Struk Belanja"
                      className="w-full h-auto object-cover rounded-xl max-h-48"
                    />
                  </div>
                )}

                {/* Kartu Konfirmasi Transaksi / Mutasi AI */}
                {msg.parsedTx && (
                  <TransactionConfirmCard
                    initialData={msg.parsedTx}
                    accounts={accounts}
                    categories={categories}
                    onSaved={() => {
                      loadMetadata();
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: Date.now().toString(),
                          sender: "assistant",
                          text: "✅ Saldo akun dan riwayat kas Anda telah berhasil diperbarui!",
                        },
                      ]);
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Bubble saat AI menganalisis */}
        {analyzing && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl neu-flat flex items-center justify-center shrink-0 text-emerald-600">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl neu-flat border border-white/80 flex items-center gap-2.5 text-xs text-emerald-700 font-bold">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>AI sedang menganalisis perintah mutasi saldo...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => handleSendText("Tambah saldo BCA 500rb")}
          className="neu-btn px-3 py-1.5 rounded-xl text-emerald-700 hover:text-emerald-900 font-bold transition-all whitespace-nowrap bg-emerald-500/10 border border-emerald-500/20"
        >
          📈 Tambah saldo BCA 500rb
        </button>
        <button
          onClick={() => handleSendText("Top up DANA 100rb")}
          className="neu-btn px-3 py-1.5 rounded-xl text-sky-700 hover:text-sky-900 font-bold transition-all whitespace-nowrap bg-sky-500/10 border border-sky-500/20"
        >
          💳 Top up DANA 100rb
        </button>
        <button
          onClick={() => handleSendText("Kurangi saldo GoPay 50rb")}
          className="neu-btn px-3 py-1.5 rounded-xl text-rose-700 hover:text-rose-900 font-bold transition-all whitespace-nowrap bg-rose-500/10 border border-rose-500/20"
        >
          📉 Kurangi saldo GoPay 50rb
        </button>
        <button
          onClick={() => handleSendText("Tarik tunai BCA 200rb")}
          className="neu-btn px-3 py-1.5 rounded-xl text-amber-700 hover:text-amber-900 font-bold transition-all whitespace-nowrap bg-amber-500/10 border border-amber-500/20"
        >
          💵 Tarik tunai BCA 200rb
        </button>
        <button
          onClick={() => handleSendText("Beli bensin 50rb pakai Mandiri")}
          className="neu-btn px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 font-semibold transition-all whitespace-nowrap"
        >
          ⛽ Beli bensin 50rb Mandiri
        </button>
      </div>

      {/* Input Area (Text & Upload Struk) */}
      <div className="pt-1 shrink-0">
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleImageUpload}
          className="hidden"
        />

        <div className="p-2 rounded-2xl neu-flat border border-white/80 flex items-center gap-2">
          {/* Tombol Kamera HP */}
          <button
            type="button"
            title="Ambil Foto dari Kamera"
            onClick={() => cameraInputRef.current?.click()}
            className="p-2 neu-btn text-slate-500 hover:text-emerald-600 rounded-xl transition-all"
          >
            <Camera className="w-5 h-5" />
          </button>

          {/* Tombol Upload File Gambar */}
          <button
            type="button"
            title="Upload Foto Struk Belanja"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 neu-btn text-slate-500 hover:text-emerald-600 rounded-xl transition-all"
          >
            <ImagePlus className="w-5 h-5" />
          </button>

          {/* Input Chat */}
          <input
            type="text"
            placeholder="Ketik perintah (misal: 'Tambah saldo BCA 500rb' atau 'Kurangi saldo GoPay 50rb')..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendText();
            }}
            className="flex-1 bg-transparent text-xs md:text-sm text-slate-800 focus:outline-none placeholder:text-slate-400 font-semibold px-2"
          />

          {/* Tombol Kirim */}
          <button
            type="button"
            onClick={() => handleSendText()}
            disabled={!inputText.trim() || analyzing}
            className="p-2.5 neu-btn-primary text-white rounded-xl transition-all font-bold disabled:opacity-50 shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}