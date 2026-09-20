import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stats, categories = [], query } = body;

    if (!stats) {
      return NextResponse.json({ error: "Data statistik finansial diperlukan" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    const categorySummary = categories
      .slice(0, 5)
      .map(
        (c: { categoryName: string; totalAmount: number; percentage: number }) =>
          `- ${c.categoryName}: Rp ${c.totalAmount.toLocaleString("id-ID")} (${c.percentage}%)`
      )
      .join("\n");

    const financialContext = `
Data Keuangan Pengguna Saat Ini:
- Total Saldo Likuid: Rp ${Number(stats.totalLiquidBalance).toLocaleString("id-ID")}
- Pemasukan Bulan Ini: Rp ${Number(stats.totalIncomeThisMonth).toLocaleString("id-ID")}
- Pengeluaran Bulan Ini: Rp ${Number(stats.totalExpenseThisMonth).toLocaleString("id-ID")}
- Daily Burn Rate: Rp ${Number(stats.dailyBurnRate).toLocaleString("id-ID")} / hari
- Sisa Hari Bulan Ini: ${stats.daysRemaining} hari
- Tagihan SPayLater Aktif: Rp ${Number(stats.activePaylaterBill).toLocaleString("id-ID")}
- Proyeksi Saldo Akhir Bulan: Rp ${Number(stats.projectedMonthEndBalance).toLocaleString("id-ID")} (Status: ${stats.projectedStatus})
- Skor Kesehatan Finansial: ${stats.healthScore}/100 (${stats.healthStatusText})

Pengeluaran Berdasarkan Kategori:
${categorySummary || "- Belum ada pengeluaran tercatat"}
`;

    // 1. Jika ada API Key Gemini, panggil AI
    if (apiKey) {
      let prompt = "";
      if (query && query.trim()) {
        prompt = `Anda adalah Financial Advisor pribadi FinanceFlow. Jawablah pertanyaan pengguna secara cerdas, bijak, ramah, dan berorientasi data berdasarkan konteks keuangan berikut:
${financialContext}

Pertanyaan Pengguna: "${query}"

Petunjuk Jawaban:
1. Jawab secara to-the-point dan ramah dalam bahasa Indonesia.
2. Gunakan angka riil dari data keuangan di atas untuk memperkuat argumen Anda (sebutkan saldo, sisa hari, atau burn rate).
3. Berikan saran realistis apakah keputusan tersebut aman atau berisiko bagi arus kas mereka.
4. Gunakan format markdown yang rapi dengan bullet points jika relevan.`;
      } else {
        prompt = `Anda adalah Financial Advisor pribadi FinanceFlow. Berikan analisis kesehatan keuangan dan rekomendasi actionable berdasarkan data berikut:
${financialContext}

Berikan respons HANYA dalam format JSON valid tanpa tanda markdown/backticks dengan skema berikut:
{
  "headline": string (ringkasan 1 kalimat yang memikat tentang kondisi kas saat ini),
  "cashflow_analysis": string (analisis singkat mengenai burn rate harian dan proyeksi akhir bulan),
  "spending_warning": string (analisis kategori pengeluaran terbesar dan potensi kebocoran uang),
  "paylater_advice": string (rekomendasi bijak seputar kewajiban SPayLater dan waktu pelunasan terbaik),
  "tips": [
    string (tips hemat konkret 1),
    string (tips hemat konkret 2),
    string (tips hemat konkret 3)
  ]
}`;
      }

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
                generationConfig: query ? undefined : { responseMimeType: "application/json" },
              }),
            }
          );

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const rawOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawOutput) {
              if (query) {
                return NextResponse.json({ answer: rawOutput });
              } else {
                const cleaned = rawOutput.replace(/```json\n?|\n?```/g, "").trim();
                const parsed = JSON.parse(cleaned);
                return NextResponse.json(parsed);
              }
            }
          }
        } catch (modelErr) {
          console.warn(`Model ${model} error in insight route:`, modelErr);
        }
      }
    }

    // 2. Fallback Heuristic jika API Key belum tersedia atau sedang rate limited
    if (query) {
      return NextResponse.json({
        answer: `Berdasarkan saldo Anda sebesar Rp ${Number(
          stats.totalLiquidBalance
        ).toLocaleString("id-ID")} dan pengeluaran harian sekitar Rp ${Number(
          stats.dailyBurnRate
        ).toLocaleString("id-ID")}, kondisi kas Anda saat ini berada pada status ${
          stats.healthStatusText
        }. Prioritaskan pelunasan tagihan wajib sebelum belanja non-pokok.`,
      });
    }

    return NextResponse.json({
      headline:
        stats.projectedStatus === "safe"
          ? "Arus kas Anda stabil dan terkendali dengan baik bulan ini."
          : "Waspada potensi defisit menjelang akhir bulan.",
      cashflow_analysis: `Rata-rata pengeluaran harian Anda adalah Rp ${Number(
        stats.dailyBurnRate
      ).toLocaleString("id-ID")}/hari. Dengan sisa ${
        stats.daysRemaining
      } hari, proyeksi saldo akhir bulan Anda adalah Rp ${Number(
        stats.projectedMonthEndBalance
      ).toLocaleString("id-ID")}.`,
      spending_warning:
        categories.length > 0
          ? `Kategori pengeluaran terbesar Anda adalah ${categories[0].categoryName} dengan porsi ${categories[0].percentage}% dari total belanja.`
          : "Belum ada pengeluaran signifikan tercatat.",
      paylater_advice:
        stats.activePaylaterBill > 0
          ? `Ada tagihan SPayLater aktif sebesar Rp ${Number(
              stats.activePaylaterBill
            ).toLocaleString("id-ID")}. Sebaiknya sisihkan dana sejak dini agar tidak terkena denda keterlambatan.`
          : "Tagihan SPayLater Anda lunas, pertahankan disiplin cicilan 0%!",
      tips: [
        "Batasi pengeluaran impulsif di akhir pekan.",
        "Simpan dana darurat minimal 10% dari pemasukan.",
        "Lunasi tagihan sebelum tanggal jatuh tempo untuk menjaga skor kredit.",
      ],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memproses insight";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
