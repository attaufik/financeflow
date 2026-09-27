# 💎 FinanceFlow — Smart Personal Finance & Cashflow

<p align="center">
  <img src="public/icons/icon-512x512.png" alt="FinanceFlow Logo" width="120" style="border-radius: 28px; box-shadow: 8px 8px 16px #cdd5e0, -8px -8px 16px #ffffff;" />
</p>

<p align="center">
  <b>Aplikasi Manajemen Keuangan & Arus Kas Pribadi Berbasis AI dengan Desain Neumorphism (Soft UI) Light Theme.</b>
</p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js" alt="Next.js" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" /></a>
  <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" /></a>
  <a href="https://ai.google.dev/"><img src="https://img.shields.io/badge/Google_Gemini-Vision_AI-4285F4?style=for-the-badge&logo=google" alt="Google Gemini" /></a>
</p>

---

## ✨ Fitur Utama

### 🎨 1. Desain Taktil Neumorphism (Soft UI) Light Theme
- Mengusung palet soft canvas (`#eef2f6`) dengan simulasi pencahayaan ganda (*dual-lighting shadows*).
- Elemen interaktif timbul (*raised cards*), cekung (*recessed sockets/inputs*), dan tombol dengan depresi taktil yang memanjakan mata dan memberikan pengalaman premium.

### 📅 2. Pelacakan Ritme Pengeluaran (Expense Rhythm)
- **Harian (Hari Ini)**: Pantau total pengeluaran harian Anda agar tidak melebihi batas wajar.
- **Mingguan (Minggu Ini)**: Evaluasi ritme pengeluaran 7 hari terakhir beserta rata-rata harian.
- **Bulanan (Bulan Ini)**: Kontrol arus kas bulanan secara holistik terhadap pemasukan.
- Dilengkapi filter breakdown kategori interaktif per periode.

### 💳 3. Multi-Akun & Manajemen Dompet
- Dukungan berbagai jenis akun: **Rekening Bank** (BCA, Mandiri, BRI, dll.), **E-Wallet** (GoPay, OVO, DANA, ShopeePay), dan **Uang Tunai (Cash)**.
- Penyesuaian saldo otomatis secara real-time saat transaksi dicatat, diedit, atau dihapus.

### 🛍️ 4. SPayLater & Pelacak Tagihan Cicilan
- Catat limit kredit, tagihan aktif bulan ini, dan tanggal jatuh tempo (tanggal 5, 15, atau 25).
- Indikator peringatan jatuh tempo otomatis saat mendekati batas pembayaran.
- **Fitur Pelunasan Tagihan Instan**: Bayar tagihan langsung dari saldo rekening pilihan, potong saldo otomatis, dan catat transaksi pelunasan ke riwayat kas.

### 🤖 5. AI Financial Copilot & Vision AI (Google Gemini)
- **OCR Scan Struk Belanja**: Ambil foto struk dari kamera HP atau unggah gambar; AI secara otomatis mengekstrak nama toko/merchant, total harga, kategori, dan tanggal transaksi.
- **Natural Language Input**: Cukup ketik kalimat sehari-hari seperti *"Beli bensin 50rb pakai DANA"*, AI akan langsung membedah nominal, dompet sumber, dan kategorinya.
- **Kartu Konfirmasi Pintar**: Pratinjau dan koreksi cepat sebelum transaksi disimpan ke database.
- **Financial Health Index & AI Advisor**: Analisis rasio tabungan, skor kesehatan finansial, serta saran anggaran cerdas.

### ⚡ 6. Supabase Realtime Sync
- Sinkronisasi instan antar-perangkat tanpa perlu reload halaman saat ada pembaruan transaksi atau saldo.

---

## 🛠️ Tech Stack

| Komponen | Teknologi |
| :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| **Bahasa** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) & Custom Neumorphic Design System |
| **Backend & Database** | [Supabase](https://supabase.com/) (PostgreSQL + Row-Level Security) |
| **Autentikasi** | Supabase Auth (Email & Password) |
| **Kecerdasan Buatan** | [Google Gemini API](https://ai.google.dev/) (`gemini-1.5-flash` Multimodal Vision) |
| **Ikon** | [Lucide React](https://lucide.dev/) |

---

## 🚀 Panduan Memulai (Local Development)

### 1. Kloning Repository
```bash
git clone https://github.com/attaufik/financeflow.git
cd financeflow
```

### 2. Instal Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Buat file bernama `.env.local` di direktori utama, lalu masukkan kredensial berikut:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Gemini AI Key
GEMINI_API_KEY=your-gemini-api-key
```

> Kunci API Gemini bisa didapatkan gratis di [Google AI Studio](https://aistudio.google.com/).

### 4. Jalankan Development Server
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

### 5. Build Produksi
Untuk memastikan tidak ada kesalahan tipe atau kompilasi:
```bash
npm run build
```

---

## 🌐 Panduan Deployment ke Vercel

Aplikasi ini dioptimalkan untuk di-deploy secara instan di **Vercel**:

1. Buka [Vercel Dashboard](https://vercel.com/dashboard) dan klik **Add New...** -> **Project**.
2. Pilih repository **`financeflow`** dari akun GitHub Anda, lalu klik **Import**.
3. Di bagian **Environment Variables**, tambahkan 3 variabel dari file `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
4. Klik **Deploy**.
5. Vercel akan otomatis melakukan auto-deploy setiap kali Anda melakukan `git push` ke branch `main`.

---

## 📱 Struktur Direktori

```text
├── public/                 # Static assets, icons, PWA manifest
├── src/
│   ├── app/                # Next.js App Router (Pages & API routes)
│   │   ├── page.tsx        # Dashboard utama (Bento grid, Ritme pengeluaran)
│   │   ├── ai-chat/        # AI Copilot & Vision OCR
│   │   ├── analytics/      # Analisis pengeluaran & Health index
│   │   ├── login/          # Autentikasi Neumorphic
│   │   ├── transactions/   # Riwayat & mutasi kas
│   │   ├── wallets/        # Manajemen akun & SPayLater
│   │   └── api/ai/         # Endpoint API AI (Parse receipt & prompt)
│   ├── components/         # Komponen UI Reusable
│   │   ├── ai/             # Kartu konfirmasi AI
│   │   ├── layout/         # Sidebar, BottomNav, AuthGuard
│   │   └── paylater/       # Modal pelunasan & pengaturan tagihan
│   ├── context/            # AuthContext & state global
│   ├── hooks/              # Realtime sync hooks
│   ├── lib/                # Supabase client, utilitas, kalkulasi finansial
│   └── types/              # Type definitions TypeScript
└── tailwind.config.ts      # Konfigurasi Tailwind & tema
```

---

## 📄 Lisensi & Kontributor

Dikembangkan dengan ❤️ oleh **[Taufik Nur Rohman](https://github.com/attaufik)**.

Proyek ini dibuat untuk keperluan manajemen finansial pribadi yang efisien, cerdas, dan menyenangkan untuk digunakan sehari-hari.
