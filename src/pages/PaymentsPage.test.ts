import { describe, expect, it } from 'vitest';
import { sortBillingStudents } from './PaymentsPage';
import { BillingStudent } from '../types/billing';

const buildStudent = (overrides: Partial<BillingStudent>): BillingStudent => ({
    studentId: overrides.studentId ?? 'id',
    studentName: overrides.studentName ?? 'Student',
    studentAvatar: overrides.studentAvatar,
    packageSize: overrides.packageSize ?? 8,
    ratePerLesson: overrides.ratePerLesson ?? 10,
    pricePerPackage: overrides.pricePerPackage ?? 80,
    lessonsCompleted: overrides.lessonsCompleted ?? 0,
    lessonsPaid: overrides.lessonsPaid ?? 0,
    lessonsOutstanding: overrides.lessonsOutstanding ?? 0,
    outstandingAmount: overrides.outstandingAmount ?? 0,
    outstandingPackages: overrides.outstandingPackages ?? 0,
    packageDue: overrides.packageDue ?? false,
    hasCredit: overrides.hasCredit ?? false,
    currentPackageLessonsCompleted: overrides.currentPackageLessonsCompleted ?? 0,
    currentPackageLessonsPaid: overrides.currentPackageLessonsPaid ?? 0,
    currentPackageBalanceLessons: overrides.currentPackageBalanceLessons ?? 0,
    currentPackageProgressInLessons: overrides.currentPackageProgressInLessons ?? 0,
    currentPackageStatus: overrides.currentPackageStatus,
    outstandingAmountFullPackages: overrides.outstandingAmountFullPackages ?? overrides.outstandingAmount ?? 0,
    packagesOwedFull: overrides.packagesOwedFull ?? Math.max(overrides.outstandingPackages ?? 0, 0),
    periodLessonsCompleted: overrides.periodLessonsCompleted ?? 0,
    periodLessonsPaid: overrides.periodLessonsPaid ?? 0,
    periodEarned: overrides.periodEarned ?? 0,
    periodReceived: overrides.periodReceived ?? 0,
    lastPaymentDate: overrides.lastPaymentDate ?? null,
    currency: overrides.currency ?? 'USD',
    isActive: overrides.isActive ?? true,
    packagePhase: overrides.packagePhase,
    shouldShowOwedInUI: overrides.shouldShowOwedInUI,
    packagesToSettle: overrides.packagesToSettle,
    creditLessons: overrides.creditLessons,
});

describe('sortBillingStudents', () => {
    it('orders by progress for most_progressed', () => {
        const students = [
            buildStudent({ studentId: 'a', studentName: 'Low', currentPackageLessonsCompleted: 1, packageSize: 8 }),
            buildStudent({ studentId: 'b', studentName: 'High', currentPackageLessonsCompleted: 7, packageSize: 8 }),
            buildStudent({ studentId: 'c', studentName: 'Mid', currentPackageLessonsCompleted: 4, packageSize: 8 }),
        ];

        const sorted = sortBillingStudents(students, 'most_progressed');

        expect(sorted.map((s) => s.studentName)).toEqual(['High', 'Mid', 'Low']);
    });

    it('orders by last payment date for last_payment', () => {
        const students = [
            buildStudent({ studentId: 'a', studentName: 'Old', lastPaymentDate: '2023-01-01' }),
            buildStudent({ studentId: 'b', studentName: 'New', lastPaymentDate: '2025-01-01' }),
            buildStudent({ studentId: 'c', studentName: 'Mid', lastPaymentDate: '2024-01-01' }),
        ];

        const sorted = sortBillingStudents(students, 'last_payment');

        expect(sorted.map((s) => s.studentName)).toEqual(['New', 'Mid', 'Old']);
    });

    it('prioritizes actions for priority (Needs action) sort', () => {
        const students = [
            buildStudent({ studentId: 'a', studentName: 'Progressed', currentPackageLessonsCompleted: 5, packageSize: 8 }),
            buildStudent({ studentId: 'b', studentName: 'To Settle', packagesToSettle: true }),
            buildStudent({ studentId: 'c', studentName: 'Owes', shouldShowOwedInUI: true }),
        ];

        const sorted = sortBillingStudents(students, 'priority');

        expect(sorted.map((s) => s.studentName)).toEqual(['To Settle', 'Owes', 'Progressed']);
    });
});
