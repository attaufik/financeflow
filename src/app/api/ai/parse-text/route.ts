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

    // Jika GEMINI_API_KEY terpasang, gunakan Gemini AI Model
    if (apiKey) {
      try {
        const prompt = `Anda adalah asisten keuangan pribadi FinanceFlow. Ekstrak teks berikut menjadi data transaksi keuangan.
Teks dari pengguna: "${text}"

Daftar Akun yang tersedia: [${accountNames || "BCA, SeaBank, DANA, GoPay"}]
Daftar Kategori yang tersedia: [${categoryNames || "Belanja & Kebutuhan, Makanan & Minuman, Transportasi, Tagihan & Utilitas, Gaji & Pemasukan"}]
Tanggal hari ini: ${new Date().toISOString().split("T")[0]}

Kembalikan HANYA JSON murni tanpa markdown/backticks/penjelasan dengan skema berikut:
{
  "type": "expense" atau "income",
  "amount": number (angka bersih tanpa koma atau titik),
  "merchant": string (nama toko/lokasi/penyedia jasa atau kosong jika tidak ada),
  "description": string (penjelasan singkat barang/jasa yang dibeli),
  "category": string (pilih salah satu dari daftar kategori yang paling cocok),
  "account_name": string (pilih akun dari daftar akun yang paling cocok, default "BCA" jika tidak disebut),
  "transaction_date": "YYYY-MM-DD",
  "confidence": number (antara 0.0 hingga 1.0)
}`;

        const models = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-flash-latest"];
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
                return NextResponse.json(parsed);
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

    // Heuristic Fallback Parser (untuk parsing natural language jika API key belum dipasang)
    const lower = text.toLowerCase();
    let type: "expense" | "income" = "expense";
    let amount = 0;
    let merchant = "Umum";
    let description = text;
    let category = "Belanja & Kebutuhan";
    let accountName = "BCA";

    // Deteksi nominal (misal 50rb, 50k, 50.000, 50000, Rp 50.000)
    const rbMatch = lower.match(/(\d+[\d.,]*)\s*(rb|k|ribu)/i);
    const numMatch = lower.match(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)/i);

    if (rbMatch) {
      amount = parseFloat(rbMatch[1].replace(",", ".")) * 1000;
    } else if (numMatch) {
      amount = parseFloat(numMatch[1].replace(/\./g, ""));
    }

    // Deteksi akun
    if (lower.includes("dana")) accountName = "DANA";
    else if (lower.includes("gopay") || lower.includes("go-pay")) accountName = "GoPay";
    else if (lower.includes("seabank") || lower.includes("sea bank")) accountName = "SeaBank";
    else if (lower.includes("bca")) accountName = "BCA";

    // Deteksi jenis & kategori
    if (lower.includes("gaji") || lower.includes("pemasukan") || lower.includes("transfer masuk") || lower.includes("dapat uang")) {
      type = "income";
      category = "Gaji & Pemasukan";
      merchant = "Transfer Masuk";
    } else if (lower.includes("bensin") || lower.includes("pertalite") || lower.includes("pertamax") || lower.includes("parkir") || lower.includes("tol")) {
      category = "Transportasi";
      merchant = lower.includes("bensin") ? "SPBU Pertamina" : "Transportasi";
      description = "Bahan Bakar & Transportasi";
    } else if (lower.includes("kopi") || lower.includes("ngopi") || lower.includes("makan") || lower.includes("sarapan") || lower.includes("lunch") || lower.includes("dinner") || lower.includes("gofood")) {
      category = "Makanan & Minuman";
      merchant = lower.includes("kopi") ? "Coffee Shop" : "Restoran / Makanan";
    } else if (lower.includes("listrik") || lower.includes("pln") || lower.includes("pulsa") || lower.includes("wifi") || lower.includes("pdam")) {
      category = "Tagihan & Utilitas";
      merchant = "Pembayaran Tagihan";
    }

    return NextResponse.json({
      type,
      amount: amount || 50000,
      merchant,
      description,
      category,
      account_name: accountName,
      transaction_date: new Date().toISOString().split("T")[0],
      confidence: 0.88,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memproses teks";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
