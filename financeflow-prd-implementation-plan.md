# FinanceFlow — PRD & Implementation Plan

Dokumen ini adalah arahan produk dan rencana implementasi untuk membangun aplikasi **FinanceFlow**, yaitu web/PWA pengatur keuangan pribadi dengan Supabase realtime database dan AI Copilot untuk membaca struk, mencatat transaksi, memberi insight, dan memprediksi arus kas.

---

## 1. Product Requirements Document

### 1.1 Ringkasan Produk

**FinanceFlow** adalah aplikasi web/PWA personal untuk mengelola keuangan pribadi secara realtime. Aplikasi ini digunakan untuk memantau saldo rekening, dompet digital, transaksi pemasukan/pengeluaran, tagihan SPayLater, serta menyediakan AI Copilot yang dapat membaca foto struk atau input teks natural language menjadi transaksi otomatis.

Aplikasi ini dibuat untuk **pemakaian pribadi**, bukan untuk publik atau komersial.

### 1.2 Tujuan Utama

- Memantau kondisi keuangan pribadi harian dalam satu dashboard.
- Menyimpan data dompet, rekening, e-wallet, transaksi, dan tagihan secara realtime.
- Membantu pencatatan transaksi secara manual maupun melalui AI.
- Membaca foto struk/screenshot transaksi dan mengubahnya menjadi data transaksi.
- Memberikan rekomendasi, insight, dan prediksi saldo akhir bulan.
- Bisa dibuka di HP seperti aplikasi melalui PWA.

### 1.3 Target Pengguna

- Pengguna tunggal/personal.
- Membutuhkan aplikasi ringan, cepat, dan nyaman dipakai di HP.
- Ingin mencatat keuangan tanpa ribet input manual terus-menerus.
- Ingin AI membantu membaca struk dan memberi insight keuangan.

### 1.4 Tech Stack

#### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- Lucide React
- Recharts
- PWA support

#### Backend & Database

- Supabase
- PostgreSQL
- Supabase Realtime
- Supabase Storage
- Supabase Auth
- Row Level Security / RLS

#### AI

- Gemini Vision atau OpenAI Vision-compatible model.
- AI digunakan untuk:
  - Membaca foto struk.
  - Membaca input teks transaksi.
  - Memberikan financial insight.
  - Membuat prediksi arus kas.

---

## 2. Data Awal Aplikasi

### 2.1 Akun Aset / Dompet

- BCA
- SeaBank
- DANA
- GoPay

### 2.2 Kewajiban / Liability

- SPayLater
  - Nominal tagihan aktif.
  - Limit kredit.
  - Tanggal jatuh tempo.
  - Status lunas/belum lunas.

---

## 3. Modul Utama

### 3.1 Dashboard

Dashboard menampilkan ringkasan kondisi keuangan.

Fitur:

- Total saldo tersedia.
- Total tagihan aktif.
- Net worth.
- Ringkasan dompet.
- Pengeluaran bulan ini.
- Pemasukan bulan ini.
- Peringatan SPayLater.
- AI insight singkat.

Acceptance criteria:

- Data dashboard diambil dari Supabase, bukan hardcoded.
- Jika transaksi berubah, dashboard ikut update.
- Tampilan responsif di desktop dan mobile.
- SPayLater dihitung sebagai liability.
- Net worth = total aset cair - total tagihan aktif.

### 3.2 Dompet & Rekening

Halaman untuk mengelola akun keuangan.

Fitur:

- Tampilkan BCA, SeaBank, DANA, GoPay, dan SPayLater.
- Tambah akun.
- Edit saldo akun.
- Edit nama akun.
- Hapus akun jika aman.
- Tampilkan tipe akun: bank, ewallet, cash, paylater.

Acceptance criteria:

- Saldo akun berubah otomatis saat transaksi dibuat.
- SPayLater diperlakukan sebagai kewajiban.
- Setiap akun hanya bisa dilihat oleh user pemilik.

### 3.3 Transaksi

Halaman transaksi digunakan untuk melihat dan mengelola arus kas.

Fitur:

- Daftar transaksi.
- Filter tanggal.
- Filter akun.
- Filter kategori.
- Filter income/expense.
- Search merchant/deskripsi.
- Tambah transaksi manual.
- Edit transaksi.
- Hapus transaksi.

Field transaksi:

- Akun.
- Kategori.
- Nominal.
- Jenis transaksi: income / expense.
- Deskripsi.
- Merchant.
- Tanggal transaksi.
- Receipt image URL.
- Status apakah dibuat oleh AI.

Acceptance criteria:

- Expense mengurangi saldo akun.
- Income menambah saldo akun.
- Edit transaksi mengoreksi saldo lama dan saldo baru.
- Hapus transaksi mengembalikan saldo sesuai transaksi sebelumnya.

### 3.4 SPayLater

Modul khusus untuk mengelola tagihan SPayLater.

Fitur:

- Simpan tagihan aktif.
- Simpan limit.
- Simpan tanggal jatuh tempo.
- Tombol bayar tagihan.
- Pilih akun pembayaran: BCA, SeaBank, DANA, atau GoPay.
- Setelah dibayar:
  - Saldo akun pembayaran berkurang.
  - Status tagihan berubah menjadi paid.
  - Transaksi pembayaran otomatis dibuat.

Acceptance criteria:

- SPayLater muncul sebagai liability.
- Net worth menghitung tagihan SPayLater.
- Ada warning H-7, H-3, dan H-1 sebelum jatuh tempo.
- Jika lewat jatuh tempo dan belum paid, status bisa menjadi overdue.

### 3.5 AI Copilot

AI Copilot berbentuk chatbot di dalam aplikasi.

Fitur:

- Input teks.
- Upload foto struk.
- Ambil foto dari kamera HP.
- AI membaca foto struk.
- AI mengekstrak merchant, nominal, tanggal, kategori, metode pembayaran, dan confidence score.
- AI menampilkan kartu konfirmasi sebelum menyimpan.
- User bisa edit hasil AI sebelum transaksi disimpan.

Contoh input:

- `Beli bensin 50rb pakai DANA`
- `Ngopi 38rb pakai GoPay`
- Upload foto struk Alfamart.

Output AI harus berupa JSON valid:

```json
{
  "type": "expense",
  "amount": 87500,
  "merchant": "Alfamart",
  "description": "Belanja kebutuhan harian",
  "category": "Belanja & Kebutuhan",
  "account_name": "BCA",
  "transaction_date": "2026-09-20",
  "confidence": 0.92
}
```

Acceptance criteria:

- AI tidak langsung menyimpan tanpa konfirmasi user.
- Jika akun pembayaran tidak jelas, AI wajib bertanya.
- Jika nominal tidak jelas, AI wajib bertanya.
- Setelah user konfirmasi, transaksi masuk ke Supabase.
- Foto struk disimpan di Supabase Storage jika diperlukan.

### 3.6 AI Insight & Prediksi

AI memberikan analisis keuangan berbasis data.

Fitur:

- Rekomendasi hemat.
- Deteksi kategori boros.
- Prediksi saldo akhir bulan.
- Peringatan jika burn rate terlalu tinggi.
- Peringatan tagihan SPayLater.

Contoh pertanyaan:

- `Apakah saldo saya cukup sampai akhir bulan?`
- `Kategori mana yang paling boros bulan ini?`
- `Apakah aman bayar SPayLater sekarang?`

Acceptance criteria:

- AI membaca data transaksi bulan berjalan.
- AI memberikan jawaban berbasis data.
- AI menyebut angka penting seperti saldo, tagihan, pengeluaran rata-rata, dan sisa hari dalam bulan.
- AI tidak mengarang jika data tidak tersedia.

---

## 4. Database Design

Gunakan Supabase Auth dan RLS karena data yang disimpan adalah data keuangan pribadi.

### 4.1 `accounts`

```sql
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('bank', 'ewallet', 'cash', 'paylater')),
  account_number text,
  balance numeric(15,2) default 0 not null,
  credit_limit numeric(15,2),
  due_day int,
  color text,
  icon text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 4.2 `categories`

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text,
  color text,
  created_at timestamptz default now()
);
```

### 4.3 `transactions`

```sql
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  account_id uuid references accounts(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(15,2) not null check (amount > 0),
  description text not null,
  merchant text,
  receipt_url text,
  is_ai_parsed boolean default false,
  transaction_date date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 4.4 `paylater_bills`

```sql
create table paylater_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  account_id uuid references accounts(id) on delete cascade,
  bill_name text default 'SPayLater',
  amount numeric(15,2) not null default 0,
  due_date date not null,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid', 'overdue')),
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 4.5 `ai_messages`

```sql
create table ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text,
  image_url text,
  metadata jsonb,
  created_at timestamptz default now()
);
```

---

## 5. Security Requirements

Wajib:

- Gunakan Supabase Auth.
- Aktifkan RLS di semua tabel.
- Data hanya bisa diakses user pemilik.
- Jangan simpan `service_role_key` di frontend.
- Frontend hanya boleh memakai:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- API key AI hanya boleh disimpan di server route atau `.env.local` tanpa prefix `NEXT_PUBLIC_`.
- AI tidak boleh menerima data user lain.
- Upload struk harus menggunakan path storage berdasarkan `user_id`.

---

## 6. Implementation Plan

### Phase 1 — Stabilkan Frontend Dasar

Status: sebagian sudah selesai.

Tasks:

- Pastikan route berikut tidak 404:
  - `/`
  - `/wallets`
  - `/transactions`
  - `/ai-chat`
  - `/analytics`
- Pastikan Tailwind berjalan normal.
- Pastikan layout mobile dan desktop nyaman.
- Pisahkan mock data dari UI component.

### Phase 2 — Supabase Integration

Tasks:

- Pastikan `src/lib/supabase.ts` tersedia.
- Pastikan `.env.local` tersedia dan berisi Supabase URL serta anon key.
- Buat type helper untuk database.
- Ganti mock accounts dengan fetch dari Supabase.
- Ganti mock transactions dengan fetch dari Supabase.
- Tambahkan loading state.
- Tambahkan empty state.
- Tambahkan error state.

Acceptance criteria:

- Dashboard membaca data dari Supabase.
- Wallet page membaca data dari Supabase.
- Transactions page membaca data dari Supabase.
- Tidak ada data hardcoded untuk data utama keuangan.

### Phase 3 — Auth & RLS

Tasks:

- Aktifkan Supabase Auth.
- Buat halaman login sederhana.
- Gunakan email/password atau magic link.
- Tambahkan session handling.
- Tambahkan `user_id` pada semua query.
- Aktifkan RLS policies.

Acceptance criteria:

- Jika belum login, user diarahkan ke login.
- Setelah login, user hanya melihat data sendiri.
- Tabel tidak bisa dibaca tanpa session valid.

### Phase 4 — CRUD Core Finance

Tasks:

- Tambah transaksi manual.
- Edit transaksi.
- Hapus transaksi.
- Tambah akun.
- Edit akun.
- Update saldo otomatis saat transaksi dibuat, diedit, atau dihapus.
- Buat utility function untuk menghitung summary dashboard.

Acceptance criteria:

- Expense mengurangi saldo.
- Income menambah saldo.
- Edit transaksi mengoreksi saldo lama dan saldo baru.
- Hapus transaksi mengembalikan saldo.

### Phase 5 — SPayLater Module

Tasks:

- Buat UI khusus SPayLater.
- Buat form tambah tagihan.
- Buat tombol bayar tagihan.
- Saat bayar tagihan:
  - Kurangi saldo akun pembayaran.
  - Buat transaksi expense.
  - Ubah status bill menjadi paid.
- Buat warning due date.

Acceptance criteria:

- Tagihan SPayLater muncul di dashboard.
- Net worth menghitung liability.
- Warning muncul mendekati jatuh tempo.

### Phase 6 — AI Receipt Parser

Tasks:

- Buat route API:
  - `/api/ai/parse-receipt`
  - `/api/ai/parse-text`
- Tambahkan upload foto ke Supabase Storage.
- Kirim gambar ke AI Vision.
- AI mengembalikan JSON transaksi.
- Tampilkan confirmation card.
- Setelah user klik confirm, simpan transaksi.

Acceptance criteria:

- Foto struk bisa diupload dari HP.
- AI membaca merchant dan nominal.
- User bisa edit sebelum simpan.
- Transaksi masuk ke database setelah konfirmasi.

### Phase 7 — AI Financial Advisor

Tasks:

- Buat route API:
  - `/api/ai/insight`
- Ambil data:
  - Saldo akun.
  - Transaksi bulan ini.
  - Tagihan aktif.
  - Budget jika ada.
- Kirim ringkasan data ke AI.
- AI menjawab pertanyaan user berdasarkan data.

Acceptance criteria:

- AI bisa menjawab kondisi cashflow.
- AI bisa prediksi saldo akhir bulan.
- AI bisa memberi rekomendasi hemat.
- AI tidak menjawab berdasarkan asumsi kosong.

### Phase 8 — Realtime & PWA

Tasks:

- Tambahkan Supabase Realtime subscription untuk:
  - `accounts`
  - `transactions`
  - `paylater_bills`
- Tambahkan manifest PWA.
- Tambahkan icon app.
- Tambahkan mobile safe area styling.
- Test install di HP.

Acceptance criteria:

- Data berubah realtime tanpa refresh.
- Web bisa ditambahkan ke home screen HP.
- Tampilan nyaman di layar HP.

---

## 7. Suggested Folder Structure

```txt
src/
  app/
    page.tsx
    layout.tsx
    globals.css
    login/
      page.tsx
    wallets/
      page.tsx
    transactions/
      page.tsx
    ai-chat/
      page.tsx
    analytics/
      page.tsx
    api/
      ai/
        parse-receipt/
          route.ts
        parse-text/
          route.ts
        insight/
          route.ts

  components/
    layout/
      Sidebar.tsx
      BottomNav.tsx
    dashboard/
      SummaryCards.tsx
      WalletGrid.tsx
      SpaylaterWarning.tsx
    wallets/
      AccountCard.tsx
      AccountForm.tsx
    transactions/
      TransactionList.tsx
      TransactionForm.tsx
    ai/
      ChatWindow.tsx
      ReceiptUpload.tsx
      TransactionConfirmCard.tsx
    ui/

  lib/
    supabase.ts
    utils.ts
    finance.ts
    ai.ts

  types/
    finance.ts
    database.ts
```

---

## 8. Prompt untuk AI Agent Antigravity

Copy prompt berikut ke Antigravity:

```txt
You are helping me build a personal finance PWA called FinanceFlow.

Context:
- Stack: Next.js App Router, TypeScript, Tailwind CSS, Supabase, Supabase Realtime, Supabase Auth.
- Purpose: personal finance dashboard for private use.
- Accounts: BCA, SeaBank, DANA, GoPay, and SPayLater.
- Key features: dashboard, wallets, transactions, SPayLater bills, AI chatbot, receipt image parser, financial insights, PWA mobile support.

Important requirements:
1. Do not rewrite the whole app unless necessary.
2. Keep code modular and clean.
3. Prioritize data security because this is financial data.
4. Use Supabase Auth and RLS.
5. Never expose AI API keys or Supabase service role keys in frontend code.
6. Replace existing mock data gradually with Supabase queries.
7. Use loading, empty, and error states.
8. Make UI mobile-first and desktop-friendly.
9. AI receipt parser must show confirmation before saving transaction.
10. Transaction balance updates must be consistent:
   - expense decreases account balance
   - income increases account balance
   - editing/deleting transaction must correctly revert/apply balance changes

Current stage:
- Basic Next.js UI already exists.
- Supabase project and `src/lib/supabase.ts` already exist.
- Continue from Phase 2: connect dashboard, wallets, and transactions to Supabase data.

Please inspect the existing codebase first, then propose a short plan before editing files.
```

---

## 9. Recommended First Task for Antigravity

Mulai dari tugas kecil berikut agar aman:

```txt
Start with Phase 2 only. Inspect the current codebase, then connect the dashboard and wallets page to Supabase. Do not implement AI yet. Replace mock account data with real Supabase data, add loading/error/empty states, and keep the UI design unchanged.
```

---

## 10. Catatan Penting

- Jangan langsung mengerjakan semua phase sekaligus.
- Prioritaskan Phase 2 terlebih dahulu.
- Setelah dashboard dan wallets berhasil membaca data Supabase, lanjut ke transactions.
- AI receipt parser sebaiknya dikerjakan setelah CRUD transaksi sudah stabil.
- Untuk data keuangan, security lebih penting daripada cepat jadi.
