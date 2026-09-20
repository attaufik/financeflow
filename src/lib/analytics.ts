import { DbAccount, DbTransaction, DbPaylaterBill } from "@/types/database";

export interface MonthlyStats {
  totalLiquidBalance: number;
  totalIncomeThisMonth: number;
  totalExpenseThisMonth: number;
  netCashflow: number;
  savingsRate: number; // in percentage
  daysInMonth: number;
  daysPassed: number;
  daysRemaining: number;
  dailyBurnRate: number;
  activePaylaterBill: number;
  projectedMonthEndBalance: number;
  projectedStatus: "safe" | "warning" | "danger";
  healthScore: number; // 0 - 100
  healthStatusText: string;
}

export interface CategoryExpenseBreakdown {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
}

/**
 * Menghitung metrik finansial bulanan secara real-time
 */
export function calculateMonthlyStats(
  accounts: DbAccount[],
  transactions: DbTransaction[],
  paylaterBills: DbPaylaterBill[],
  referenceDate = new Date()
): MonthlyStats {
  // 1. Total Saldo Likuid (Bank + E-Wallet + Cash)
  const totalLiquidBalance = accounts.reduce(
    (sum, a) => sum + (Number(a.balance) || 0),
    0
  );

  // 2. Filter transaksi bulan berjalan
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth(); // 0-indexed

  const currentMonthTxs = transactions.filter((t) => {
    const txDate = new Date(t.transaction_date);
    return (
      txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth
    );
  });

  let totalIncomeThisMonth = 0;
  let totalExpenseThisMonth = 0;

  currentMonthTxs.forEach((t) => {
    const amt = Number(t.amount) || 0;
    if (t.type === "income") {
      totalIncomeThisMonth += amt;
    } else if (t.type === "expense") {
      totalExpenseThisMonth += amt;
    }
  });

  const netCashflow = totalIncomeThisMonth - totalExpenseThisMonth;
  const savingsRate =
    totalIncomeThisMonth > 0
      ? Math.max(0, Math.round((netCashflow / totalIncomeThisMonth) * 100))
      : 0;

  // 3. Perhitungan hari & Burn Rate
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysPassed = Math.max(1, referenceDate.getDate());
  const daysRemaining = Math.max(0, daysInMonth - daysPassed);

  const dailyBurnRate = Math.round(totalExpenseThisMonth / daysPassed);

  // 4. Tagihan SPayLater aktif yang belum lunas
  const activePaylaterBill = paylaterBills.reduce((sum, b) => {
    return sum + (!b.is_paid ? Number(b.active_bill) || 0 : 0);
  }, 0);

  // 5. Proyeksi Saldo Akhir Bulan
  // Proyeksi = Saldo Likuid - (Burn Rate * Sisa Hari) - Tagihan PayLater
  const projectedExpenditure = dailyBurnRate * daysRemaining + activePaylaterBill;
  const projectedMonthEndBalance = totalLiquidBalance - projectedExpenditure;

  let projectedStatus: "safe" | "warning" | "danger" = "safe";
  if (projectedMonthEndBalance < 0) {
    projectedStatus = "danger";
  } else if (projectedMonthEndBalance < totalLiquidBalance * 0.2) {
    projectedStatus = "warning";
  }

  // 6. Skor Kesehatan Finansial (0 - 100)
  // Bobot:
  // - Likuiditas positif vs pengeluaran (35 poin)
  // - Rasio tabungan/cashflow positif (25 poin)
  // - Beban paylater vs saldo (20 poin)
  // - Burn rate terkendali (20 poin)
  let healthScore = 50;

  if (totalLiquidBalance > totalExpenseThisMonth * 2) healthScore += 25;
  else if (totalLiquidBalance > totalExpenseThisMonth) healthScore += 15;
  else if (totalLiquidBalance < 0) healthScore -= 30;

  if (netCashflow > 0) healthScore += 20;
  else healthScore -= 15;

  if (activePaylaterBill === 0) healthScore += 15;
  else if (activePaylaterBill < totalLiquidBalance * 0.3) healthScore += 5;
  else healthScore -= 15;

  healthScore = Math.max(10, Math.min(100, healthScore));

  let healthStatusText = "Kondisi Stabil";
  if (healthScore >= 85) healthStatusText = "Sangat Sehat";
  else if (healthScore >= 70) healthStatusText = "Sehat & Terkendali";
  else if (healthScore >= 50) healthStatusText = "Cukup Waspada";
  else healthStatusText = "Kritis (Defisit)";

  return {
    totalLiquidBalance,
    totalIncomeThisMonth,
    totalExpenseThisMonth,
    netCashflow,
    savingsRate,
    daysInMonth,
    daysPassed,
    daysRemaining,
    dailyBurnRate,
    activePaylaterBill,
    projectedMonthEndBalance,
    projectedStatus,
    healthScore,
    healthStatusText,
  };
}

/**
 * Menghitung rincian pengeluaran per kategori bulan ini
 */
export function calculateCategoryBreakdown(
  transactions: DbTransaction[],
  referenceDate = new Date()
): CategoryExpenseBreakdown[] {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();

  const currentMonthExpenses = transactions.filter((t) => {
    if (t.type !== "expense") return false;
    const txDate = new Date(t.transaction_date);
    return (
      txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth
    );
  });

  const totalExpense = currentMonthExpenses.reduce(
    (sum, t) => sum + (Number(t.amount) || 0),
    0
  );

  const categoryMap = new Map<
    string,
    { categoryName: string; totalAmount: number; count: number }
  >();

  currentMonthExpenses.forEach((t) => {
    const catId = t.category_id || "uncategorized";
    const catName = t.categories?.name || "Lain-lain";
    const amt = Number(t.amount) || 0;

    const existing = categoryMap.get(catId) || {
      categoryName: catName,
      totalAmount: 0,
      count: 0,
    };

    existing.totalAmount += amt;
    existing.count += 1;
    categoryMap.set(catId, existing);
  });

  const result: CategoryExpenseBreakdown[] = [];
  categoryMap.forEach((val, key) => {
    const percentage =
      totalExpense > 0 ? Math.round((val.totalAmount / totalExpense) * 100) : 0;
    result.push({
      categoryId: key,
      categoryName: val.categoryName,
      totalAmount: val.totalAmount,
      percentage,
      transactionCount: val.count,
    });
  });

  // Urutkan dari nominal terbesar ke terkecil
  return result.sort((a, b) => b.totalAmount - a.totalAmount);
}
