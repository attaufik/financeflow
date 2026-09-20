"use client";

import React, { useState, useEffect, useRef } from "react";
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
      text: "Halo Taufik! Saya AI Financial Copilot Anda. Saya dapat membantu mencatat keuangan Anda secara otomatis:",
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
  useEffect(() => {
    async function loadMetadata() {
      const [accRes, catRes] = await Promise.all([
        supabase.from("accounts").select("*"),
        supabase.from("categories").select("*"),
      ]);
      if (accRes.data) setAccounts(accRes.data);
      if (catRes.data) setCategories(catRes.data);
    }
    loadMetadata();
  }, []);

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
          accounts: accounts.map((a) => ({ id: a.id, name: a.name })),
          categories: categories.map((c) => ({ id: c.id, name: c.name })),
        }),
      });

      if (!res.ok) throw new Error("Gagal menganalisis teks");

      const parsedData: ParsedTransaction = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: `Saya telah mendeteksi transaksi dari kalimat Anda. Silakan periksa kartu konfirmasi berikut sebelum disimpan:`,
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
          text: "Maaf, saya belum dapat memahami transaksi dari teks tersebut. Silakan coba lagi dengan format seperti 'Beli bensin 50rb pakai DANA'.",
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
    // Reset file input agar bisa upload file yang sama kembali
    e.target.value = "";
  };

  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>AI Financial Copilot</span>
              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Vision AI
              </span>
            </h3>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Siap membaca foto struk belanjaan & mencatat pengeluaran
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
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isAssistant
                    ? "bg-slate-800 border border-slate-700 text-emerald-400"
                    : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
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
                    className={`p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed ${
                      isAssistant
                        ? "bg-slate-900 border border-slate-800 text-slate-200"
                        : "bg-emerald-500 text-slate-950 font-medium ml-auto"
                    }`}
                  >
                    <p>{msg.text}</p>
                    {msg.id === "welcome" && (
                      <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside mt-2">
                        <li>Kirim foto struk belanjaan untuk dicatat otomatis.</li>
                        <li>Ketik teks cepat, misal: <i>&quot;Beli bensin 50rb pakai DANA&quot;</i>.</li>
                        <li>Konfirmasi data sebelum transaksi masuk ke saldo Anda.</li>
                      </ul>
                    )}
                  </div>
                )}

                {/* Foto Struk Preview jika ada */}
                {msg.imagePreview && (
                  <div className="rounded-2xl overflow-hidden border border-slate-800 max-w-[200px] ml-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={msg.imagePreview}
                      alt="Struk Belanja"
                      className="w-full h-auto object-cover max-h-48"
                    />
                  </div>
                )}

                {/* Kartu Konfirmasi Transaksi AI */}
                {msg.parsedTx && (
                  <TransactionConfirmCard
                    initialData={msg.parsedTx}
                    accounts={accounts}
                    categories={categories}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Bubble saat AI menganalisis */}
        {analyzing && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-emerald-400">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-2 text-xs text-emerald-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI sedang menganalisis transaksi...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
        <button
          onClick={() => handleSendText("Beli bensin 50rb pakai DANA")}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all whitespace-nowrap"
        >
          ⛽ Beli bensin 50rb pakai DANA
        </button>
        <button
          onClick={() => handleSendText("Ngopi 38rb pakai GoPay")}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all whitespace-nowrap"
        >
          ☕ Ngopi 38rb pakai GoPay
        </button>
        <button
          onClick={() => handleSendText("Belanja bulanan 250rb BCA")}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all whitespace-nowrap"
        >
          🛒 Belanja bulanan 250rb BCA
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

        <div className="p-2 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-2 shadow-xl">
          {/* Tombol Kamera HP */}
          <button
            type="button"
            title="Ambil Foto dari Kamera"
            onClick={() => cameraInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-emerald-400 rounded-xl hover:bg-slate-800 transition-all"
          >
            <Camera className="w-5 h-5" />
          </button>

          {/* Tombol Upload File Gambar */}
          <button
            type="button"
            title="Upload Foto Struk Belanja"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-emerald-400 rounded-xl hover:bg-slate-800 transition-all"
          >
            <ImagePlus className="w-5 h-5" />
          </button>

          {/* Input Chat */}
          <input
            type="text"
            placeholder="Ketik pengeluaran (misal: 'Beli bensin 50rb DANA')..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendText();
            }}
            className="flex-1 bg-transparent text-xs md:text-sm text-white focus:outline-none placeholder:text-slate-500"
          />

          {/* Tombol Kirim */}
          <button
            type="button"
            onClick={() => handleSendText()}
            disabled={!inputText.trim() || analyzing}
            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl transition-all font-semibold disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}