import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType = "image/jpeg", accounts = [], categories = [] } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "Gambar struk tidak ditemukan" }, { status: 400 });
    }

    // Bersihkan prefix data URL (misal: "data:image/jpeg;base64,")
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, "");

    const apiKey = process.env.GEMINI_API_KEY;
    const accountNames = accounts.map((a: { name: string }) => a.name).join(", ");
    const categoryNames = categories.map((c: { name: string }) => c.name).join(", ");

    // Jika GEMINI_API_KEY terpasang, panggil Gemini Vision AI
    if (apiKey) {
      const prompt = `Anda adalah asisten AI pembaca struk belanjaan FinanceFlow. Analisis gambar struk/invoice ini secara akurat dan ekstrak data transaksi keuangan.
Daftar Akun yang dimiliki pengguna: [${accountNames || "BCA, SeaBank, DANA, GoPay"}]
Daftar Kategori yang tersedia: [${categoryNames || "Belanja & Kebutuhan, Makanan & Minuman, Transportasi, Tagihan & Utilitas, Gaji & Pemasukan"}]
Tanggal hari ini: ${new Date().toISOString().split("T")[0]}

Petunjuk Ekstraksi:
1. "amount": Ambil nominal Grand Total / Total Bayar akhir yang dibayar (angka bersih integer/number). HATI-HATI: perhatikan apakah angka menggunakan format desimal dua nol di belakang koma (seperti ',00' atau '.00') agar TIDAK salah membaca 200.000,00 menjadi 200.000.000. Selalu buang sen desimal setelah koma.
2. "merchant": Nama toko atau perusahaan penerbit struk (contoh: "TOKO ABANG", "Alfamart", "Indomaret", "Pertamina", dll.).
3. "description": Ringkasan barang yang dibeli (contoh: "Grosir sembako dan beras", "Belanja kebutuhan", dll.).
4. "category": Pilih kategori yang paling cocok dari daftar kategori yang tersedia.
5. "account_name": Metode pembayaran yang tertera jika ada, atau default "BCA" jika tidak terdeteksi.
6. "transaction_date": Tanggal transaksi yang tertera pada struk (format YYYY-MM-DD), gunakan tanggal hari ini jika tidak terbaca.
7. "confidence": Skor keyakinan pembacaan Anda (0.0 - 1.0).

Kembalikan HANYA JSON murni tanpa awalan/akhiran markdown/backticks:
{
  "type": "expense",
  "amount": number,
  "merchant": string,
  "description": string,
  "category": string,
  "account_name": string,
  "transaction_date": "YYYY-MM-DD",
  "confidence": number
}`;

      // Model Gemini Vision yang didukung (gemini-3.5-flash sangat cepat dan stabil)
      const models = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-flash-latest"];
      for (const model of models) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: prompt },
                      {
                        inlineData: {
                          mimeType,
                          data: cleanBase64,
                        },
                      },
                    ],
                  },
                ],
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
          } else {
            const errText = await geminiRes.text();
            console.warn(`Model ${model} returned error:`, errText);
          }
        } catch (modelErr) {
          console.warn(`Failed with model ${model}:`, modelErr);
        }
      }
    }

    // Jika GEMINI_API_KEY belum disetel, kembalikan simulasi dan beri tahu user
    return NextResponse.json({
      type: "expense",
      amount: 87500,
      merchant: "Alfamart (Simulasi - GEMINI_API_KEY belum dipasang)",
      description: "Belanja Kebutuhan Harian",
      category: "Belanja & Kebutuhan",
      account_name: "BCA",
      transaction_date: new Date().toISOString().split("T")[0],
      confidence: 0.5,
      is_mock: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal membaca struk belanjaan";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
