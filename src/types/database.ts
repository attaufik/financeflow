export type DbAccountType = "bank" | "ewallet" | "cash";

export interface DbAccount {
  id: string;
  user_id?: string;
  name: string;
  type: DbAccountType;
  account_number: string | null;
  balance: number;
  color: string | null;
  created_at?: string;
}

export interface DbPaylaterBill {
  id: string;
  user_id?: string;
  name: string;
  active_bill: number;
  credit_limit: number;
  due_date: number; // e.g. 25
  is_paid: boolean;
  color: string | null;
  updated_at?: string;
}

export interface DbCategory {
  id: string;
  user_id?: string;
  name: string;
  type: "income" | "expense";
  icon: string | null;
}

export interface DbTransaction {
  id: string;
  user_id?: string;
  account_id: string | null;
  category_id: string | null;
  type: "income" | "expense";
  amount: number;
  description: string;
  merchant: string | null;
  receipt_url: string | null;
  is_ai_parsed: boolean;
  transaction_date: string;
  created_at?: string;
  // Joined relation fields
  accounts?: { name: string } | null;
  categories?: { name: string } | null;
}
