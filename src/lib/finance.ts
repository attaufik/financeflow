import { SupabaseClient } from "@supabase/supabase-js";
import { DbTransaction } from "@/types/database";

/**
 * Mengubah saldo akun dengan menambahkan nilai delta (+ untuk penambahan, - untuk pengurangan)
 */
export async function adjustAccountBalance(
  supabase: SupabaseClient,
  accountId: string,
  delta: number
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    const { data: account, error: fetchErr } = await supabase
      .from("accounts")
      .select("balance")
      .eq("id", accountId)
      .single();

    if (fetchErr || !account) {
      return { success: false, error: fetchErr?.message || "Akun tidak ditemukan" };
    }

    const currentBalance = Number(account.balance || 0);
    const newBalance = currentBalance + delta;

    const { error: updateErr } = await supabase
      .from("accounts")
      .update({ balance: newBalance })
      .eq("id", accountId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true, newBalance };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal mengupdate saldo akun";
    return { success: false, error: msg };
  }
}

/**
 * Dijalankan saat transaksi baru dibuat
 * Expense -> mengurangi saldo (-amount)
 * Income  -> menambah saldo (+amount)
 */
export async function handleTransactionCreated(
  supabase: SupabaseClient,
  tx: { account_id: string | null; amount: number; type: "income" | "expense" }
) {
  if (!tx.account_id) return;
  const delta = tx.type === "expense" ? -Number(tx.amount) : Number(tx.amount);
  await adjustAccountBalance(supabase, tx.account_id, delta);
}

/**
 * Dijalankan saat transaksi diedit
 * Mengembalikan pengaruh saldo lama, lalu menerapkan pengaruh saldo baru
 */
export async function handleTransactionUpdated(
  supabase: SupabaseClient,
  oldTx: { account_id: string | null; amount: number; type: "income" | "expense" },
  newTx: { account_id: string | null; amount: number; type: "income" | "expense" }
) {
  // Jika akunnya sama, hitung net delta
  if (oldTx.account_id && newTx.account_id && oldTx.account_id === newTx.account_id) {
    const oldDelta = oldTx.type === "expense" ? -Number(oldTx.amount) : Number(oldTx.amount);
    const newDelta = newTx.type === "expense" ? -Number(newTx.amount) : Number(newTx.amount);
    const netDelta = newDelta - oldDelta;
    if (netDelta !== 0) {
      await adjustAccountBalance(supabase, newTx.account_id, netDelta);
    }
  } else {
    // Jika ganti akun: kembalikan saldo akun lama, lalu potong/tambah saldo akun baru
    if (oldTx.account_id) {
      const revertDelta = oldTx.type === "expense" ? Number(oldTx.amount) : -Number(oldTx.amount);
      await adjustAccountBalance(supabase, oldTx.account_id, revertDelta);
    }
    if (newTx.account_id) {
      const applyDelta = newTx.type === "expense" ? -Number(newTx.amount) : Number(newTx.amount);
      await adjustAccountBalance(supabase, newTx.account_id, applyDelta);
    }
  }
}

/**
 * Dijalankan saat transaksi dihapus
 * Mengembalikan saldo ke akun terkait:
 * Jika expense dihapus -> saldo bertambah kembali (+amount)
 * Jika income dihapus  -> saldo berkurang kembali (-amount)
 */
export async function handleTransactionDeleted(
  supabase: SupabaseClient,
  tx: DbTransaction
) {
  if (!tx.account_id) return;
  const revertDelta = tx.type === "expense" ? Number(tx.amount) : -Number(tx.amount);
  await adjustAccountBalance(supabase, tx.account_id, revertDelta);
}
