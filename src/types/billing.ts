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
    // Period-specific (based on date filter)
    earnedInPeriod: number;       // Amount earned in selected period
    receivedInPeriod: number;     // Amount received in selected period
    
    // All-time (always cumulative)
    outstandingTotal: number;     // Total outstanding across all students (all time)
    packagesToSettleCount: number; // Students with packagePhase=READY_TO_SETTLE
    
    // Monthly breakdown for chart
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
    
    // Package info
    packageSize: number;          // e.g., 8 lessons per package
    ratePerLesson: number;        // Actual rate per lesson (pricePerPackage / packageSize)
    pricePerPackage: number;      // Total price for the package

    // === ALL-TIME BALANCE (always cumulative, regardless of date filter) ===
    lessonsCompleted: number;     // Total lessons conducted (all time)
    lessonsPaid: number;          // Total lessons paid for (all time)
    lessonsOutstanding: number;   // lessonsCompleted - lessonsPaid (all time)
    outstandingAmount: number;    // Outstanding packages * package price (all time)
    outstandingPackages: number;  // floor(completed/pkgSize) - floor(paid/pkgSize) (all time)
    packageDue: boolean;          // true when outstandingPackages > 0
    hasCredit: boolean;           // true when outstandingPackages < 0 (prepayment)
    // Package-first helpers
    currentPackageLessonsCompleted?: number;
    currentPackageLessonsPaid?: number;
    currentPackageBalanceLessons?: number;
    currentPackageProgressInLessons?: number;
    currentPackageStatus?: string;
    outstandingAmountFullPackages?: number;
    packagesOwedFull?: number;
    
    // === PERIOD-SPECIFIC (filtered by date range, for analytics display) ===
    periodLessonsCompleted?: number;  // Lessons conducted in selected period
    periodLessonsPaid?: number;       // Lessons paid for in selected period
    periodEarned?: number;            // Amount earned in period
    periodReceived?: number;          // Amount received in period
    
    // Other fields
    lastPaymentDate: string | null;
    currency: string;
    isActive?: boolean;           // Whether student is active

    // Redesign fields
    packagePhase?: 'IN_PROGRESS' | 'READY_TO_SETTLE';
    shouldShowOwedInUI?: boolean;
    packagesToSettle?: boolean;
    creditLessons?: number;
    owesPackageCount?: number;
    settlementStatus?: string;
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
        currentPackageLessonsCompleted?: number;
        currentPackageLessonsPaid?: number;
        currentPackageBalanceLessons?: number;
        currentPackageProgressInLessons?: number;
        currentPackageStatus?: string;
        outstandingAmountFullPackages?: number;
        packagesOwedFull?: number;
    };
}

// Date range presets for billing filters
export type DateRangePreset = 'thisMonth' | 'lastMonth' | '3months' | '6months' | 'year' | 'custom';

// Sorting options for students list
export type BillingSortOption = 'priority' | 'name_asc' | 'most_progressed' | 'last_payment';

export interface BillingFilters {
    from: string;
    to: string;
    currency: string;
    preset: DateRangePreset;
    sortBy: BillingSortOption;
    activeOnly: boolean;
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

// ============================================
// Package Tracker Types (DEPRECATED - Use PackageState instead)
// ============================================
// These types are no longer used in the frontend.
// Keeping for reference until backend cleanup is complete.

/**
 * @deprecated Use PackageState instead. This slot-based tracker system has been replaced
 * by an adjustment-based system that automatically tracks lessons.
 */
export interface PackageTracker {
    packageSize: number;
    lessonsCompleted: number;
    packagePhase: 'IN_PROGRESS' | 'READY_TO_SETTLE';
    status: 'IN_PROGRESS' | 'READY' | 'OWES_PACKAGE' | 'PREPAID';
    pricePerPackage: number;
    currency: string;
    slots: PackageSlotTracker[];
    unassignedLessons: UnassignedLesson[];
    shouldShowOwedInUI: boolean;
}

/**
 * @deprecated Use PackageLessonSlot instead
 */
export interface PackageSlotTracker {
    index: number; // 1-based
    status: 'OPEN' | 'ASSIGNED' | 'CANCELED';
    lessonId?: string;
    lessonDate?: string;
    lessonTitle?: string;
}

/**
 * @deprecated No longer needed with adjustment-based system
 */
export interface UnassignedLesson {
    id: string;
    date: string;
    title: string;
    status: string;
}

// ============================================
// Package State Management Types (legacy or internal)
// ============================================

export type PackageAdjustmentType = 
    | 'RESET_PACKAGE'      // Start a new package from scratch
    | 'ADJUST_LESSONS'     // Add or remove lessons from current package count
    | 'SET_PACKAGE_START'; // Set which lesson starts the current package

export interface PackageAdjustmentPayload {
    type: PackageAdjustmentType;
    value?: number;           // For ADJUST_LESSONS: +/- count
    lessonId?: string;        // For SET_PACKAGE_START: the lesson ID to start from
    effectiveDate: string;    // ISO date string (YYYY-MM-DD)
    comment?: string;         // Reason for adjustment
}

export interface PackageAdjustmentEntry {
    id: string;
    studentId: string;
    type: PackageAdjustmentType;
    value: number | null;
    effectiveDate: string;
    comment: string | null;
    createdAt: string;
    createdBy?: string;       // Tutor ID who made the adjustment
}

export interface PackageState {
    // Current package info (after applying adjustments)
    currentPackageStart: number;      // Lesson index where current package starts (1-based)
    lessonsInPackage: number;         // Lessons completed in current package
    packageSize: number;              // Total lessons per package

    // Lesson details for current package
    packageLessons: PackageLessonSlot[];

    // Adjustment history
    adjustments: PackageAdjustmentEntry[];
}

// ============================================
// Package History Types
// ============================================

export interface PackageHistoryResponse {
    packages: HistoricalPackage[];
    currentPackageNumber: number;
    totalPackages: number;
}

export interface HistoricalPackage {
    packageNumber: number;           // Sequential package number (1, 2, 3...)
    startLessonIndex: number;        // Global lesson index where package started (1-based)
    endLessonIndex: number | null;   // Last lesson index, null if in progress
    lessonsCompleted: number;        // How many lessons finished in this package
    packageSize: number;             // Total slots in package
    status: 'IN_PROGRESS' | 'COMPLETED' | 'PAID';
    isCurrent: boolean;              // True for the active package
    startDate: string;               // Date of first lesson (YYYY-MM-DD)
    endDate?: string;                // Date of last lesson
    paidDate?: string;               // Date when package was paid
    amountPaid?: number;             // Amount paid for this package
    packageLessons: PackageLessonSlot[];
}

export interface PackageLessonSlot {
    slotNumber: number;               // 1 to packageSize
    lessonId?: string;                // If filled, the lesson ID
    lessonDate?: string;              // If filled, the lesson date (YYYY-MM-DD)
    lessonTitle?: string;             // If filled, lesson title/topic
    status: 'completed' | 'scheduled' | 'adjusted' | 'empty';
}
