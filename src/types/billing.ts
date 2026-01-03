// Billing Types

export type EntryType = 'PAYMENT' | 'CHARGE';
export type ChargeKind = 'PACKAGE_PURCHASE' | 'AD_HOC';
export type PaymentMethod = 'cash' | 'bank' | 'kaspi' | 'transfer' | 'other';

// New ledger entry kind for unified timeline
export type LedgerKind = 'LESSON' | 'PAYMENT';

export interface BillingSummary {
    paid: number;
    charged: number;
    net: number;
    outstanding: number;
    currency: string;
}

// Extended analytics response
export interface BillingAnalytics {
    earnedThisMonth: number;
    receivedThisMonth: number;
    outstandingTotal: number;
    monthlyData: MonthlyDataPoint[];
}

export interface MonthlyDataPoint {
    month: string; // e.g., "2025-01"
    earned: number;
    received: number;
}

export interface BillingStudent {
    studentId: string;
    studentName: string;
    studentAvatar?: string;
    // Legacy fields (backward compatibility)
    balanceToday: number;
    paidInPeriod: number;
    chargedInPeriod: number;
    // Package info
    packageSize: number;          // e.g., 8 lessons
    ratePerLesson: number;        // Package rate, e.g., 400 EUR for the package (UI divides by packageSize for per-lesson rate)
    // Lesson counts
    lessonsCompleted: number;     // conducted
    lessonsPaid: number;          // paid
    lessonsOutstanding: number;   // completed - paid
    // Money
    outstandingAmount: number;    // lessonsOutstanding * (ratePerLesson / packageSize)
    lastPaymentDate: string | null;
    currency: string;
}

// Legacy ledger entry (backward compatibility)
export interface LedgerEntry {
    id: string;
    entryDate: string;
    entryType: EntryType;
    chargeKind: ChargeKind | null;
    amount: number;
    currency: string;
    comment: string | null;
    method: string | null;
    meta: Record<string, unknown> | null;
    createdAt?: string;
    updatedAt?: string;
}

// New unified ledger entry with balance_after
export interface UnifiedLedgerEntry {
    id: string;
    entryDate: string;
    kind: LedgerKind;
    // For LESSON: lesson title, status
    lessonId?: string;
    lessonTitle?: string;
    lessonStatus?: string;
    // For PAYMENT: method, comment
    method?: string | null;
    comment?: string | null;
    // Quantities
    quantity: number;             // lessons count (can be 0.5, 0)
    amount: number;               // money
    currency: string;
    // Running balance after this entry
    balanceAfterLessons: number;
    balanceAfterAmount: number;
    // Metadata
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateBillingEntryPayload {
    studentId: string;
    entryType: EntryType;
    chargeKind?: ChargeKind | null;
    amount: number;
    currency: string;
    entryDate: string;
    method?: string | null;
    comment?: string | null;
    meta?: Record<string, unknown> | null;
}

export type UpdateBillingEntryPayload = CreateBillingEntryPayload;

// Simplified payment payload for new UX
export interface CreatePaymentPayload {
    studentId: string;
    lessonsCount: number;        // Number of lessons being paid for
    amount: number;              // Total amount
    currency: string;
    entryDate: string;
    method?: PaymentMethod | null;
    comment?: string | null;
}

export interface UpdatePaymentPayload {
    lessonsCount?: number;
    amount?: number;
    entryDate?: string;
    method?: PaymentMethod | null;
    comment?: string | null;
}

export interface BillingStudentsResponse {
    students: BillingStudent[];
    totalCount: number;
}

export interface StudentLedgerResponse {
    entries: LedgerEntry[];
    summary: {
        balanceToday: number;
        paidInPeriod: number;
        chargedInPeriod: number;
    };
}

// New unified ledger response with LESSON + PAYMENT entries
export interface UnifiedLedgerResponse {
    entries: UnifiedLedgerEntry[];
    summary: {
        lessonsCompleted: number;
        lessonsPaid: number;
        lessonsOutstanding: number;
        outstandingAmount: number;
        paidInPeriod: number;
        earnedInPeriod: number;
    };
}

// Date range presets for billing filters
export type DateRangePreset = 'thisMonth' | 'lastMonth' | '3months' | '6months' | 'year' | 'custom';

// Sorting options for students list
export type BillingSortOption = 'outstanding_desc' | 'name_asc';

export interface BillingFilters {
    from: string;
    to: string;
    currency: string;
    preset: DateRangePreset;
    sortBy: BillingSortOption;
}

// Common currencies
export const CURRENCIES = ['USD', 'EUR', 'AZN'] as const;
export type Currency = typeof CURRENCIES[number];

export const DEFAULT_BILLING_CURRENCY: Currency = 'USD';
export const CURRENCY_LABELS: Record<Currency, string> = {
    USD: 'USD',
    EUR: 'EUR',
    AZN: 'AZN',
};

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank', label: 'Bank Transfer' },
    { value: 'kaspi', label: 'Kaspi' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'other', label: 'Other' },
];
