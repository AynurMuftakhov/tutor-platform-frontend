import { api } from './api';
import type {
    BillingSummary,
    BillingStudent,
    BillingStudentsResponse,
    StudentLedgerResponse,
    LedgerEntry,
    CreateBillingEntryPayload,
    UpdateBillingEntryPayload,
    BillingAnalytics,
    MonthlyDataPoint,
    UnifiedLedgerEntry,
    UnifiedLedgerResponse,
    CreatePaymentPayload,
    UpdatePaymentPayload,
    LedgerKind,
    PackageAdjustmentPayload,
    PaymentMethod,
    PackageAdjustmentEntry,
    PackageState,
    PackageLessonSlot,
    PackageAdjustmentType,
    PackageTracker,
    PackageSlotTracker,
    UnassignedLesson,
    PackageHistoryResponse,
    HistoricalPackage,
} from '../types/billing';

const BILLING_BASE = 'users-service/api/billing';

export const updateBillingAccount = async (
    studentId: string,
    payload: {
        defaultCurrency?: string;
        ratePerLesson?: number;
        pricePerPackage?: number;
        packageSize?: number;
        notes?: string;
    }
) => {
    await api.put(`${BILLING_BASE}/accounts/${studentId}`, payload);
};

const mapBillingSummary = (data: any, fallbackCurrency?: string): BillingSummary => {
    const paid = Number(data?.paidTotal ?? data?.paid ?? 0);
    const charged = Number(data?.chargedTotal ?? data?.charged ?? 0);
    const net = Number(data?.netTotal ?? data?.net ?? charged - paid);
    const outstanding = Number(data?.outstandingTotal ?? data?.outstanding ?? 0);

    return {
        currency: data?.currency ?? fallbackCurrency,
        paid,
        charged,
        net,
        outstanding,
    };
};

const mapBillingStudent = (student: any): BillingStudent => {
    const packageSize = Number(student.packageSize ?? 0) || 1;
    const pricePerPackage = Number(student.pricePerPackage ?? 0);
    // ratePerLesson from backend, or fallback to calculated per-lesson rate
    const ratePerLesson = Number(student.ratePerLesson) || (packageSize > 0 ? pricePerPackage / packageSize : 0);
    const fallbackLessonsInPackage = Number(student.lessonsCompleted ?? 0) % packageSize;
    const fallbackPaidInPackage = Number(student.lessonsPaid ?? 0) % packageSize;
    const fallbackBalanceInPackage = fallbackLessonsInPackage - fallbackPaidInPackage;

    return {
        studentId: student.studentId,
        studentName: student.studentName,
        studentAvatar: student.studentAvatar,

        // Package info
        packageSize,
        ratePerLesson,
        pricePerPackage,

        // ALL-TIME balance - trust backend values directly
        lessonsCompleted: Number(student.lessonsCompleted ?? 0),
        lessonsPaid: Number(student.lessonsPaid ?? 0),
        lessonsOutstanding: Number(student.lessonsOutstanding ?? 0),
        outstandingAmount: Number(student.outstandingAmount ?? 0),
        outstandingPackages: Number(student.outstandingPackages ?? 0),
        packageDue: Boolean(student.packageDue),
        hasCredit: Boolean(student.hasCredit),
        currentPackageLessonsCompleted: Number(student.currentPackageLessonsCompleted ?? fallbackLessonsInPackage),
        currentPackageLessonsPaid: Number(student.currentPackageLessonsPaid ?? fallbackPaidInPackage),
        currentPackageBalanceLessons: Number(student.currentPackageBalanceLessons ?? fallbackBalanceInPackage),
        currentPackageProgressInLessons: Number(student.currentPackageProgressInLessons ?? fallbackLessonsInPackage),
        currentPackageStatus: student.currentPackageStatus ?? undefined,
        outstandingAmountFullPackages: Number(student.outstandingAmountFullPackages ?? student.outstandingAmount ?? 0),
        packagesOwedFull: Number(student.packagesOwedFull ?? Math.max(Number(student.outstandingPackages ?? 0), 0)),

        // PERIOD-SPECIFIC
        periodLessonsCompleted: Number(student.periodLessonsCompleted ?? 0),
        periodLessonsPaid: Number(student.periodLessonsPaid ?? 0),
        periodEarned: Number(student.periodEarned ?? 0),
        periodReceived: Number(student.periodReceived ?? 0),

        // Other fields
        lastPaymentDate: student.lastPaymentDate ?? null,
        currency: student.currency ?? 'USD',
        isActive: student.isActive ?? true,

        // Redesign fields
        packagePhase: student.packagePhase,
        shouldShowOwedInUI: student.shouldShowOwedInUI,
        packagesToSettle: student.packagesToSettle,
        creditLessons: student.creditLessons,
    };
};

const mapLedgerEntry = (entry: any): LedgerEntry => ({
    id: entry.id,
    entryDate: entry.entryDate,
    entryType: entry.entryType,
    chargeKind: entry.chargeKind ?? null,
    amount: Number(entry.amount ?? 0),
    currency: entry.currency,
    comment: entry.comment ?? null,
    method: entry.method ?? null,
    meta: entry.meta ?? null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
});

const mapUnifiedLedgerEntry = (entry: any): UnifiedLedgerEntry => ({
    id: entry.id,
    entryDate: entry.entryDate,
    kind: entry.kind as LedgerKind,
    // Lesson fields
    lessonId: entry.lessonId ?? undefined,
    lessonTitle: entry.lessonTitle ?? undefined,
    lessonStatus: entry.lessonStatus ?? undefined,
    // Payment fields
    method: entry.method ?? null,
    comment: entry.comment ?? null,
    // Quantities
    quantity: Number(entry.quantity ?? (entry.kind === 'LESSON' ? 1 : 0)),
    amount: Number(entry.amount ?? 0),
    currency: entry.currency,
    // Balance after
    balanceAfterLessons: Number(entry.balanceAfterLessons ?? 0),
    balanceAfterAmount: Number(entry.balanceAfterAmount ?? 0),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
});

const mapMonthlyDataPoint = (point: any): MonthlyDataPoint => ({
    month: point.month,
    earned: Number(point.earned ?? 0),
    received: Number(point.received ?? 0),
});

const mapBillingAnalytics = (data: any): BillingAnalytics => ({
    // Period-specific (based on date filter)
    earnedInPeriod: Number(data?.earnedInPeriod ?? data?.earnedThisMonth ?? 0),
    receivedInPeriod: Number(data?.receivedInPeriod ?? data?.receivedThisMonth ?? 0),
    // All-time (always cumulative)
    outstandingTotal: Number(data?.outstandingTotal ?? 0),
    packagesToSettleCount: Number(data?.packagesToSettleCount ?? 0),
    monthlyData: (data?.monthlyData ?? []).map(mapMonthlyDataPoint),
});

/**
 * Get billing summary for a date range and currency
 */
export const getBillingSummary = async (
    from: string,
    to: string,
    currency: string
): Promise<BillingSummary> => {
    const params = new URLSearchParams({ from, to, currency });
    const response = await api.get(`${BILLING_BASE}/summary?${params}`);
    return mapBillingSummary(response.data, currency);
};

/**
 * Get billing students list with balances
 */
export const getBillingStudents = async (
    from: string,
    to: string,
    currency: string,
    sort: string = 'balance_desc',
    activeOnly = false
): Promise<BillingStudentsResponse> => {
    const params = new URLSearchParams({ from, to, currency, sort, activeOnly: String(activeOnly) });
    const response = await api.get(`${BILLING_BASE}/students?${params}`);
    const data = response.data;
    const studentsArray = Array.isArray(data) ? data : data?.students ?? [];
    return {
        students: studentsArray.map(mapBillingStudent),
        totalCount: data?.totalCount ?? studentsArray.length,
    };
};

/**
 * Get student ledger entries
 */
export const getStudentLedger = async (
    studentId: string,
    from: string,
    to: string,
    currency: string
): Promise<StudentLedgerResponse> => {
    const params = new URLSearchParams({ from, to, currency });
    const response = await api.get(`${BILLING_BASE}/students/${studentId}/ledger?${params}`);
    const data = response.data;
    const summarySource = data?.summary ?? data?.student ?? {};

    return {
        entries: (data?.entries ?? []).map(mapLedgerEntry),
        summary: {
            balanceToday: Number(summarySource.balanceToday ?? 0),
            paidInPeriod: Number(summarySource.paidInPeriod ?? 0),
            chargedInPeriod: Number(summarySource.chargedInPeriod ?? 0),
        },
    };
};

/**
 * Create a new billing entry (payment or charge)
 */
export const createBillingEntry = async (
    payload: CreateBillingEntryPayload
): Promise<LedgerEntry> => {
    const response = await api.post(`${BILLING_BASE}/entries`, payload);
    return response.data;
};

/**
 * Update an existing billing entry
 */
export const updateBillingEntry = async (
    id: string,
    payload: UpdateBillingEntryPayload
): Promise<LedgerEntry> => {
    const response = await api.put(`${BILLING_BASE}/entries/${id}`, payload);
    return response.data;
};

/**
 * Delete a billing entry
 */
export const deleteBillingEntry = async (id: string): Promise<void> => {
    await api.delete(`${BILLING_BASE}/entries/${id}`);
};

/**
 * Get billing analytics (KPI cards + monthly chart data)
 */
export const getBillingAnalytics = async (
    from: string,
    to: string,
    currency: string
): Promise<BillingAnalytics> => {
    const params = new URLSearchParams({ from, to, currency });
    const response = await api.get(`${BILLING_BASE}/analytics?${params}`);
    return mapBillingAnalytics(response.data);
};

/**
 * Get unified student ledger with LESSON + PAYMENT entries and balance_after
 */
export const getUnifiedStudentLedger = async (
    studentId: string,
    from: string,
    to: string,
    currency: string
): Promise<UnifiedLedgerResponse> => {
    const params = new URLSearchParams({ from, to, currency });
    const response = await api.get(`${BILLING_BASE}/students/${studentId}/ledger?${params}`);
    const data = response.data;
    const summarySource = data?.summary ?? {};

    return {
        entries: (data?.entries ?? []).map(mapUnifiedLedgerEntry),
        summary: {
            lessonsCompleted: Number(summarySource.lessonsCompleted ?? 0),
            lessonsPaid: Number(summarySource.lessonsPaid ?? 0),
            lessonsOutstanding: Number(summarySource.lessonsOutstanding ?? 0),
            outstandingAmount: Number(summarySource.balanceToday ?? summarySource.outstandingAmount ?? 0),
            paidInPeriod: Number(summarySource.paidInPeriod ?? 0),
            earnedInPeriod: Number(summarySource.chargedInPeriod ?? summarySource.earnedInPeriod ?? 0),
            currentPackageLessonsCompleted: Number(summarySource.currentPackageLessonsCompleted ?? 0),
            currentPackageLessonsPaid: Number(summarySource.currentPackageLessonsPaid ?? 0),
            currentPackageBalanceLessons: Number(summarySource.currentPackageBalanceLessons ?? 0),
            currentPackageProgressInLessons: Number(summarySource.currentPackageProgressInLessons ?? 0),
            currentPackageStatus: summarySource.currentPackageStatus ?? undefined,
            outstandingAmountFullPackages: Number(summarySource.outstandingAmountFullPackages ?? summarySource.outstandingAmount ?? 0),
            packagesOwedFull: Number(summarySource.packagesOwedFull ?? Math.max(Number(summarySource.lessonsOutstanding ?? 0), 0)),
        },
    };
};

/**
 * Create a payment entry (simplified API for new UX)
 */
export const createPayment = async (
    payload: CreatePaymentPayload
): Promise<UnifiedLedgerEntry> => {
    const response = await api.post(`${BILLING_BASE}/payments`, payload);
    return mapUnifiedLedgerEntry(response.data);
};

/**
 * Update a payment entry
 */
export const updatePayment = async (
    id: string,
    payload: UpdatePaymentPayload
): Promise<UnifiedLedgerEntry> => {
    const response = await api.patch(`${BILLING_BASE}/payments/${id}`, payload);
    return mapUnifiedLedgerEntry(response.data);
};

/**
 * Delete a payment entry
 */
export const deletePayment = async (id: string): Promise<void> => {
    await api.delete(`${BILLING_BASE}/payments/${id}`);
};

export interface PackageSetupPayload {
    effectiveDate: string;
    packageSize: number;
    pricePerPackage: number;
    currency: string;
    completedLessons: number;
    paidLessons: number;
    comment?: string | null;
    recordPayment?: boolean;
    paymentLessons?: number;
    paymentAmount?: number;
    paymentMethod?: PaymentMethod | null;
    paymentComment?: string | null;
    paymentDate?: string;
}

/**
 * Seed a student's current package state (migration helper)
 */
export const packageSetupStudent = async (
    studentId: string,
    payload: PackageSetupPayload
): Promise<void> => {
    await api.post(`${BILLING_BASE}/students/${studentId}/package-setup`, payload);
};

// ============================================
// Package State Management API
// ============================================

const mapPackageAdjustmentEntry = (entry: any): PackageAdjustmentEntry => ({
    id: entry.id,
    studentId: entry.studentId,
    type: entry.type as PackageAdjustmentType,
    value: entry.value ?? null,
    effectiveDate: entry.effectiveDate,
    comment: entry.comment ?? null,
    createdAt: entry.createdAt,
    createdBy: entry.createdBy ?? undefined,
});

const mapPackageLessonSlot = (slot: any): PackageLessonSlot => ({
    slotNumber: Number(slot.slotNumber),
    lessonId: slot.lessonId ?? undefined,
    lessonDate: slot.lessonDate ?? undefined,
    lessonTitle: slot.lessonTitle ?? undefined,
    status: slot.status ?? 'empty',
});

const mapPackageState = (data: any): PackageState => ({
    currentPackageStart: Number(data.currentPackageStart ?? 1),
    lessonsInPackage: Number(data.lessonsInPackage ?? 0),
    packageSize: Number(data.packageSize ?? 1),
    packageLessons: (data.packageLessons ?? []).map(mapPackageLessonSlot),
    adjustments: (data.adjustments ?? []).map(mapPackageAdjustmentEntry),
});

/**
 * Get the current package state for a student
 * Includes lesson slots and adjustment history
 */
export const getPackageState = async (studentId: string): Promise<PackageState> => {
    const response = await api.get(`${BILLING_BASE}/students/${studentId}/package-state`);
    return mapPackageState(response.data);
};

/**
 * Create a package adjustment
 * Used to reset package, adjust lesson counts, or set package start point
 */
export const createPackageAdjustment = async (
    studentId: string,
    payload: PackageAdjustmentPayload
): Promise<PackageAdjustmentEntry> => {
    const response = await api.post(
        `${BILLING_BASE}/students/${studentId}/package-adjustments`,
        payload
    );
    return mapPackageAdjustmentEntry(response.data);
};

/**
 * Delete a package adjustment
 */
export const deletePackageAdjustment = async (
    studentId: string,
    adjustmentId: string
): Promise<void> => {
    await api.delete(`${BILLING_BASE}/students/${studentId}/package-adjustments/${adjustmentId}`);
};

// ============================================
// Package History API
// ============================================

const mapHistoricalPackage = (pkg: any): HistoricalPackage => ({
    packageNumber: Number(pkg.packageNumber),
    startLessonIndex: Number(pkg.startLessonIndex),
    endLessonIndex: pkg.endLessonIndex != null ? Number(pkg.endLessonIndex) : null,
    lessonsCompleted: Number(pkg.lessonsCompleted ?? 0),
    packageSize: Number(pkg.packageSize),
    status: pkg.status ?? 'IN_PROGRESS',
    isCurrent: !!pkg.isCurrent,
    startDate: pkg.startDate,
    endDate: pkg.endDate,
    paidDate: pkg.paidDate,
    amountPaid: pkg.amountPaid != null ? Number(pkg.amountPaid) : undefined,
    packageLessons: (pkg.packageLessons ?? []).map(mapPackageLessonSlot),
});

const mapPackageHistoryResponse = (data: any): PackageHistoryResponse => ({
    packages: (data.packages ?? []).map(mapHistoricalPackage),
    currentPackageNumber: Number(data.currentPackageNumber ?? 1),
    totalPackages: Number(data.totalPackages ?? 1),
});

/**
 * Get package history for a student
 * Returns all package cycles, both historical and current
 *
 * @param studentId - Student ID
 * @param packageNumber - Optional: Return only specific package number
 */
export const getPackageHistory = async (
    studentId: string,
    packageNumber?: number
): Promise<PackageHistoryResponse> => {
    const params = packageNumber ? `?packageNumber=${packageNumber}` : '';
    const response = await api.get(`${BILLING_BASE}/students/${studentId}/package-history${params}`);
    return mapPackageHistoryResponse(response.data);
};

// ============================================
// Package Tracker API (DEPRECATED - Use PackageState instead)
// ============================================
// The following APIs are no longer used in the frontend.
// They have been replaced by the PackageState adjustment-based system.
// Keeping these commented for reference until backend cleanup is complete.

/*
const mapPackageSlotTracker = (slot: any): PackageSlotTracker => ({
    index: Number(slot.index ?? slot.slotIndex),
    status: slot.status,
    lessonId: slot.lessonId ?? slot.lesson?.id ?? undefined,
    lessonDate: slot.lessonDate ?? slot.lesson?.date ?? undefined,
    lessonTitle: slot.lessonTitle ?? slot.lesson?.title ?? undefined,
});

const mapUnassignedLesson = (lesson: any): UnassignedLesson => ({
    id: lesson.id,
    date: lesson.date,
    title: lesson.title,
    status: lesson.status ?? 'COMPLETED',
});

const mapPackageTracker = (data: any): PackageTracker => ({
    packageSize: Number(data.packageSize ?? 1),
    lessonsCompleted: Number(data.lessonsCompleted ?? data.progress?.completedLessons ?? 0),
    packagePhase: data.packagePhase ?? data.progress?.packagePhase,
    status:
        data.status ??
        (data.progress?.packagePhase === 'READY_TO_SETTLE'
            ? 'READY'
            : data.progress?.packagePhase === 'IN_PROGRESS'
                ? 'IN_PROGRESS'
                : 'IN_PROGRESS'),
    pricePerPackage: Number(data.pricePerPackage ?? 0),
    currency: data.currency,
    slots: (data.slots ?? []).map(mapPackageSlotTracker),
    unassignedLessons: (data.unassignedLessons ?? data.unassignedCompletedLessons ?? []).map(mapUnassignedLesson),
    shouldShowOwedInUI: !!(data.shouldShowOwedInUI ?? data.progress?.shouldShowOwedInUI),
});

export const getPackageTracker = async (studentId: string): Promise<PackageTracker> => {
    const response = await api.get(`${BILLING_BASE}/students/${studentId}/package-tracker`);
    return mapPackageTracker(response.data);
};

export const assignLessonToSlot = async (
    studentId: string,
    slotIndex: number,
    lessonId: string
): Promise<void> => {
    await api.post(`${BILLING_BASE}/students/${studentId}/slots/${slotIndex}/assign`, { lessonId });
};

export const unassignLessonFromSlot = async (
    studentId: string,
    slotIndex: number
): Promise<void> => {
    await api.post(`${BILLING_BASE}/students/${studentId}/slots/${slotIndex}/unassign`, {});
};

export const cancelSlot = async (
    studentId: string,
    slotIndex: number
): Promise<void> => {
    await api.post(`${BILLING_BASE}/students/${studentId}/slots/${slotIndex}/cancel`, {});
};

export const reopenSlot = async (
    studentId: string,
    slotIndex: number
): Promise<void> => {
    await api.post(`${BILLING_BASE}/students/${studentId}/slots/${slotIndex}/reopen`, {});
};
*/
