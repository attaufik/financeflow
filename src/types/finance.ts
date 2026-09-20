export type AccountType = "bank" | "ewallet" | "paylater" | "cash";

export interface Account {
    id: string;
    name: string;
    type: AccountType;
    balance: number; // Saldo atau nilai tagihan jika paylater
    accountNumber?: string;
    color: string;
    icon: string;
    dueDate?: number; // Khusus PayLater (contoh: tanggal 25)
    limit?: number;   // Khusus PayLater
}

export type TransactionType = "income" | "expense";

export interface Transaction {
    id: string;
    accountId: string;
    accountName: string;
    category: string;
    amount: number;
    type: TransactionType;
    description: string;
    merchant?: string;
    date: string;
    isAiParsed?: boolean;
}