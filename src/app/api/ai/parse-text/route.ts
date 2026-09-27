import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, accounts = [], categories = [] } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Input teks tidak boleh kosong" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const accountNames = accounts.map((a: { name: string }) => a.name).join(", ");
    const categoryNames = categories.map((c: { name: string }) => c.name).join(", ");

    // 1. Jika GEMINI_API_KEY terpasang, gunakan Gemini AI Model
    if (apiKey) {
      try {
        const prompt = `Anda adalah asisten AI Financial Copilot untuk FinanceFlow.
Tugas Anda: Analisis kalimat/perintah pengguna dan ekstrak menjadi aksi data keuangan yang tepat: apakah ini PENAMBAHAN SALDO, PENGURANGAN SALDO, atau PENCATATAN TRANSAKSI PENGELUARAN/PEMASUKAN.

Teks dari pengguna: "${text}"

Daftar Akun Pengguna: [${accountNames || "BCA, SeaBank, DANA, GoPay, Dompet Tunai"}]
Daftar Kategori: [${categoryNames || "Belanja & Kebutuhan, Makanan & Minuman, Transportasi, Tagihan & Utilitas, Gaji & Pemasukan"}]
Tanggal hari ini: ${new Date().toISOString().split("T")[0]}

Petunjuk Logika:
1. PENAMBAHAN SALDO (type: "income", action_intent: "add_balance"):
   - Kalimat berisi perintah atau informasi menambah saldo, top up, setor uang, gaji, atau saldo masuk.
   - Contoh: "tambah saldo bca 500rb", "isi saldo gopay 100k", "top up dana 200rb", "gajian masuk mandiri 5jt", "setor tunai bca 1jt", "dapat uang 300rb di seabank", "update saldo bca tambah 250rb".
   - "type": "income"
   - "merchant": "Top Up / Setor Tunai" atau nama pihak pengirim jika ada.
   - "description": Buat judul yang rapi, misal "Tambah Saldo BCA", "Top Up GoPay", "Gaji Bulanan".
   - "category": Pilih kategori bertipe pemasukan, misal "Gaji & Pemasukan" atau kategori pertama yang relevan.

2. PENGURANGAN SALDO (type: "expense", action_intent: "reduce_balance"):
   - Kalimat berisi perintah memotong/mengurangi saldo, tarik tunai, penarikan uang, atau mutasi keluar langsung.
   - Contoh: "kurangi saldo bca 100rb", "potong saldo gopay 50rb", "tarik tunai mandiri 200rb", "keluar uang 150rb dari bca", "update saldo bca kurangi 75rb".
   - "type": "expense"
   - "merchant": "Tarik Tunai / Penyesuaian Saldo" atau nama merchant.
   - "description": Buat judul yang rapi, misal "Kurangi Saldo BCA", "Tarik Tunai Mandiri".
   - "category": Pilih kategori pengeluaran yang sesuai atau "Umum / Lainnya".

3. TRANSAKSI BELANJA / PENGELUARAN BIASA (type: "expense", action_intent: "transaction"):
   - Contoh: "Beli bensin 50rb pakai DANA", "Ngopi 38rb pake GoPay", "Makan siang 25rb tunai".
   - "type": "expense"
   - "merchant": Nama toko/merchant (misal "SPBU Pertamina", "Kedai Kopi").
   - "description": Barang/jasa yang dibeli (misal "Beli Bensin", "Kopi").

4. NOMINAL ("amount"):
   - Angka murni/integer positif tanpa koma/titik.
   - Contoh konversi: 500rb/500k -> 500000; 1.5jt/1,5 juta -> 1500000; 250.000 -> 250000.

5. AKUN ("account_name"):
   - Cocokkan nama akun dengan salah satu dari Daftar Akun Pengguna yang paling mendekati teks pengguna.

Kembalikan HANYA JSON murni tanpa awalan markdown/backticks/penjelasan:
{
  "type": "income" atau "expense",
  "action_intent": "add_balance" atau "reduce_balance" atau "transaction",
  "amount": number,
  "merchant": string,
  "description": string,
  "category": string,
  "account_name": string,
  "transaction_date": "YYYY-MM-DD",
  "confidence": number
}`;

        const models = [
          "gemini-2.5-flash",
          "gemini-2.0-flash",
          "gemini-1.5-flash",
          "gemini-flash-latest",
          "gemini-3.5-flash",
        ];

        for (const model of models) {
          try {
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: { responseMimeType: "application/json" },
                }),
              }
            );

            if (geminiRes.ok) {
              const geminiData = await geminiRes.json();
              const rawOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (rawOutput) {
                const cleaned = rawOutput.replace(/```json\n?|\n?```/g, "").trim();
                const parsed = JSON.parse(cleaned);
                if (parsed.amount && parsed.amount > 0) {
                  return NextResponse.json(parsed);
                }
              }
            }
          } catch (mErr) {
            console.warn(`Model ${model} error:`, mErr);
          }
        }
      } catch (geminiError) {
        console.warn("Gemini API call failed, falling back to smart heuristic parser:", geminiError);
      }
    }

    // 2. Smart Heuristic Fallback Parser (Offline / Fallback cepat & akurat)
    const lower = text.toLowerCase();
    let type: "expense" | "income" = "expense";
    let actionIntent: "add_balance" | "reduce_balance" | "transaction" = "transaction";
    let amount = 0;
    let merchant = "Umum";
    let description = text;
    let category = "Belanja & Kebutuhan";
    let accountName = accounts[0]?.name || "BCA";

    // --- Ekstraksi Nominal Cerdas ---
    // A. Format Juta: 1.5jt, 2.5 juta, 1jt, 5m
    const jtMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta|million)/i);
    // B. Format Ribu: 500rb, 50k, 250 ribu, 15.5rb
    const rbMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:rb|k|ribu|thousand)/i);
    // C. Format Angka Penuh: Rp 500.000, Rp50.000, 250000
    const numMatch = lower.match(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)/i);

    if (jtMatch) {
      amount = parseFloat(jtMatch[1].replace(",", ".")) * 1000000;
    } else if (rbMatch) {
      amount = parseFloat(rbMatch[1].replace(",", ".")) * 1000;
    } else if (numMatch) {
      amount = parseFloat(numMatch[1].replace(/\./g, ""));
    }

    // --- Deteksi Akun Dinamis dari Data User ---
    if (accounts.length > 0) {
      for (const acc of accounts) {
        const accLower = acc.name.toLowerCase();
        if (lower.includes(accLower)) {
          accountName = acc.name;
          break;
        }
      }
    }

    // Cek alias umum jika belum cocok
    if (!accountName || accountName === accounts[0]?.name) {
      if (lower.includes("dana")) accountName = "DANA";
      else if (lower.includes("gopay") || lower.includes("go-pay")) accountName = "GoPay";
      else if (lower.includes("ovo")) accountName = "OVO";
      else if (lower.includes("shopeepay") || lower.includes("spay")) accountName = "ShopeePay";
      else if (lower.includes("seabank") || lower.includes("sea bank")) accountName = "SeaBank";
      else if (lower.includes("mandiri")) accountName = "Mandiri";
      else if (lower.includes("bni")) accountName = "BNI";
      else if (lower.includes("bri")) accountName = "BRI";
      else if (lower.includes("jago")) accountName = "Bank Jago";
      else if (lower.includes("tunai") || lower.includes("cash") || lower.includes("dompet")) accountName = "Dompet Tunai";
      else if (lower.includes("bca")) accountName = "BCA";
    }

    // --- Deteksi Niat Penambahan Saldo vs Pengurangan Saldo ---
    const isAddBalance =
      lower.includes("tambah saldo") ||
      lower.includes("tambahkan saldo") ||
      lower.includes("isi saldo") ||
      lower.includes("top up") ||
      lower.includes("topup") ||
      lower.includes("setor tunai") ||
      lower.includes("setor") ||
      lower.includes("gaji") ||
      lower.includes("gajian") ||
      lower.includes("pemasukan") ||
      lower.includes("terima uang") ||
      lower.includes("dapat uang") ||
      lower.includes("transfer masuk") ||
      lower.includes("cair") ||
      lower.includes("bonus") ||
      lower.includes("saldo masuk") ||
      /update saldo .* (?:tambah|masuk)/.test(lower);

    const isReduceBalance =
      lower.includes("kurangi saldo") ||
      lower.includes("kurangkan saldo") ||
      lower.includes("potong saldo") ||
      lower.includes("tarik tunai") ||
      lower.includes("tarik uang") ||
      lower.includes("ambil uang") ||
      lower.includes("keluar uang") ||
      lower.includes("saldo keluar") ||
      /update saldo .* (?:kurang|potong)/.test(lower);

    if (isAddBalance) {
      type = "income";
      actionIntent = "add_balance";
      merchant = "Top Up / Setor Tunai";
      description = `Tambah Saldo ${accountName}`;
      // Cari kategori income
      const incomeCat = categories.find((c: { type: string }) => c.type === "income");
      category = incomeCat ? incomeCat.name : "Gaji & Pemasukan";
    } else if (isReduceBalance) {
      type = "expense";
      actionIntent = "reduce_balance";
      merchant = "Tarik Tunai / Penyesuaian Saldo";
      description = `Kurangi Saldo ${accountName}`;
      const expenseCat = categories.find((c: { type: string }) => c.type === "expense");
      category = expenseCat ? expenseCat.name : "Pengeluaran";
    } else {
      // Belanja / Pengeluaran Biasa
      type = "expense";
      actionIntent = "transaction";
      if (
        lower.includes("bensin") ||
        lower.includes("pertalite") ||
        lower.includes("pertamax") ||
        lower.includes("parkir") ||
        lower.includes("tol")
      ) {
        category = "Transportasi";
        merchant = lower.includes("bensin") ? "SPBU Pertamina" : "Transportasi";
        description = "Bahan Bakar & Transportasi";
      } else if (
        lower.includes("kopi") ||
        lower.includes("ngopi") ||
        lower.includes("makan") ||
        lower.includes("sarapan") ||
        lower.includes("lunch") ||
        lower.includes("dinner") ||
        lower.includes("gofood") ||
        lower.includes("shopeefood")
      ) {
        category = "Makanan & Minuman";
        merchant = lower.includes("kopi") ? "Coffee Shop" : "Restoran / Makanan";
        description = lower.includes("kopi") ? "Ngopi Santai" : "Makan & Minum";
      } else if (
        lower.includes("listrik") ||
        lower.includes("pln") ||
        lower.includes("pulsa") ||
        lower.includes("paket data") ||
        lower.includes("wifi") ||
        lower.includes("pdam")
      ) {
        category = "Tagihan & Utilitas";
        merchant = "Pembayaran Tagihan";
        description = "Tagihan Bulanan";
      } else {
        category = "Belanja & Kebutuhan";
        merchant = "Toko / Merchant";
        description = text;
      }
    }

    return NextResponse.json({
      type,
      action_intent: actionIntent,
      amount: amount || 50000,
      merchant,
      description,
      category,
      account_name: accountName,
      transaction_date: new Date().toISOString().split("T")[0],
      confidence: 0.95,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memproses teks";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
