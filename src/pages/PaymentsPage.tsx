import React, { useState, useCallback, useMemo } from 'react';
import { Alert, Box, Snackbar } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import PaymentsIcon from '@mui/icons-material/Payments';
import PageHeader from '../components/PageHeader';
import BillingFiltersBar, { getDefaultFilters } from '../components/billing/BillingFiltersBar';
import BillingKPICards from '../components/billing/BillingKPICards';
import StudentPackagesTable from '../components/billing/StudentCardsGrid';
import StudentLedgerDrawer from '../components/billing/StudentLedgerDrawer';
import AddPaymentModal, { PaymentPreset } from '../components/billing/AddPaymentModal';
import PlanSettingsModal from '../components/billing/PlanSettingsModal';
import SetCurrentStateWizard from '../components/billing/SetCurrentStateWizard';
import {
    getBillingStudents,
    getBillingAnalytics,
    getUnifiedStudentLedger,
    updatePayment,
    deletePayment,
} from '../services/billing.api';
import type {
    BillingFilters,
    BillingStudent,
    UnifiedLedgerEntry,
    BillingSortOption,
} from '../types/billing';

export const sortBillingStudents = (rawStudents: BillingStudent[], sortBy: BillingSortOption) => {
    const sorted = [...rawStudents];

    if (sortBy === 'name_asc') {
        sorted.sort((a, b) => a.studentName.localeCompare(b.studentName));
        return sorted;
    }

    if (sortBy === 'most_progressed') {
        sorted.sort((a, b) => {
            const getProgress = (s: BillingStudent) => {
                const completed = s.currentPackageLessonsCompleted ?? 0;
                const size = s.packageSize || 1;
                return completed / size;
            };
            return getProgress(b) - getProgress(a);
        });
        return sorted;
    }

    if (sortBy === 'last_payment') {
        sorted.sort((a, b) => {
            const dateA = a.lastPaymentDate ? new Date(a.lastPaymentDate).getTime() : 0;
            const dateB = b.lastPaymentDate ? new Date(b.lastPaymentDate).getTime() : 0;
            return dateB - dateA;
        });
        return sorted;
    }

    // Default: priority view - "Needs action"
    // Logic: packagesToSettle first, then owes, then progress
    sorted.sort((a, b) => {
        if (a.packagesToSettle && !b.packagesToSettle) return -1;
        if (!a.packagesToSettle && b.packagesToSettle) return 1;

        if (a.shouldShowOwedInUI && !b.shouldShowOwedInUI) return -1;
        if (!a.shouldShowOwedInUI && b.shouldShowOwedInUI) return 1;

        const progressA = (a.currentPackageLessonsCompleted ?? 0) / (a.packageSize || 1);
        const progressB = (b.currentPackageLessonsCompleted ?? 0) / (b.packageSize || 1);
        if (progressB !== progressA) return progressB - progressA;

        return a.studentName.localeCompare(b.studentName);
    });

    return sorted;
};

const PaymentsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Filters state
    const [filters, setFilters] = useState<BillingFilters>(getDefaultFilters());

    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<BillingStudent | null>(null);

    // Modal state
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [modalPreselectedStudent, setModalPreselectedStudent] = useState<BillingStudent | null>(null);
    const [paymentPreset, setPaymentPreset] = useState<PaymentPreset | null>(null);
    const [planModalOpen, setPlanModalOpen] = useState(false);
    const [planStudent, setPlanStudent] = useState<BillingStudent | null>(null);
    const [setupWizardOpen, setSetupWizardOpen] = useState(false);
    const [setupStudent, setSetupStudent] = useState<BillingStudent | null>(null);
    const [toastOpen, setToastOpen] = useState(false);

    // Analytics query
    const {
        data: analyticsData,
        isLoading: analyticsLoading,
    } = useQuery({
        queryKey: ['billing-analytics', filters.from, filters.to, filters.currency],
        queryFn: () => getBillingAnalytics(filters.from, filters.to, filters.currency),
    });

    // Students query
    const {
        data: studentsData,
        isLoading: studentsLoading,
    } = useQuery({
        queryKey: ['billing-students', filters.from, filters.to, filters.currency, filters.sortBy, filters.activeOnly],
        queryFn: () => getBillingStudents(filters.from, filters.to, filters.currency, filters.sortBy, filters.activeOnly),
    });

    // Ledger query (only when drawer is open)
    const {
        data: ledgerData,
        isLoading: ledgerLoading,
    } = useQuery({
        queryKey: ['billing-ledger', selectedStudent?.studentId, filters.from, filters.to, selectedStudent?.currency ?? filters.currency],
        queryFn: () => {
            if (!selectedStudent) return null;
            const ledgerCurrency = selectedStudent.currency ?? filters.currency;
            return getUnifiedStudentLedger(selectedStudent.studentId, filters.from, filters.to, ledgerCurrency);
        },
        enabled: !!selectedStudent && drawerOpen,
    });

    // Refresh all billing data
    const refreshAll = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['billing-analytics'] });
        queryClient.invalidateQueries({ queryKey: ['billing-students'] });
        if (selectedStudent) {
            queryClient.invalidateQueries({ queryKey: ['billing-ledger', selectedStudent.studentId] });
        }
    }, [queryClient, selectedStudent]);

    // Handlers
    const handleFiltersChange = (newFilters: BillingFilters) => {
        setFilters(newFilters);
    };

    const handleRowClick = (student: BillingStudent) => {
        setSelectedStudent(student);
        setDrawerOpen(true);
    };

    const handleDrawerClose = () => {
        setDrawerOpen(false);
    };

    const handleAddPaymentFromHeader = () => {
        setModalPreselectedStudent(null);
        setPaymentPreset(null);
        setPaymentModalOpen(true);
    };

    const handleAddPaymentFromDrawer = () => {
        setModalPreselectedStudent(selectedStudent);
        setPaymentPreset(null);
        setPaymentModalOpen(true);
    };

    const handleOpenPlan = (student: BillingStudent) => {
        setPlanStudent(student);
        setPlanModalOpen(true);
    };

    const handleOpenSetupWizard = (student: BillingStudent) => {
        setSetupStudent(student);
        setSetupWizardOpen(true);
    };

    const handleCloseSetupWizard = () => {
        setSetupWizardOpen(false);
        setSetupStudent(null);
    };

    const handleSetupSuccess = (studentId: string) => {
        refreshAll();
        const refreshedStudent = studentsData?.students.find((s) => s.studentId === studentId) ?? setupStudent;
        if (refreshedStudent) {
            setSelectedStudent(refreshedStudent);
            setDrawerOpen(true);
        }
        setToastOpen(true);
    };

    const handlePlanClose = () => {
        setPlanStudent(null);
        setPlanModalOpen(false);
    };

    const handlePaymentModalClose = () => {
        setPaymentModalOpen(false);
        setModalPreselectedStudent(null);
        setPaymentPreset(null);
    };

    const handlePaymentSuccess = () => {
        refreshAll();
    };

    const handleEditPayment = async (entry: UnifiedLedgerEntry) => {
        await updatePayment(entry.id, {
            lessonsCount: entry.quantity,
            amount: entry.amount,
            entryDate: entry.entryDate,
            comment: entry.comment,
        });
        refreshAll();
    };

    const handleDeletePayment = async (entry: UnifiedLedgerEntry) => {
        await deletePayment(entry.id);
        refreshAll();
    };

    const handleViewLesson = (lessonId: string) => {
        navigate(`/lessons/${lessonId}`);
    };

    // Sort students on frontend (as fallback if backend doesn't support sorting)
    const students = useMemo(() => {
        const rawStudents = studentsData?.students ?? [];
        return sortBillingStudents(rawStudents, filters.sortBy);
    }, [studentsData?.students, filters.sortBy]);


    return (
        <Box sx={{ bgcolor: '#fafbfd', minHeight: '100%' }}>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <PageHeader
                    title="Payments"
                    titleColor="primary"
                    icon={<PaymentsIcon />}
                    subtitle="Track lesson-based billing and payments"
                />

                {/* Filters bar */}
                <BillingFiltersBar
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    onAddPayment={handleAddPaymentFromHeader}
                />

                {/* KPI Cards with Insights */}
                <BillingKPICards
                    analytics={analyticsData ?? null}
                    loading={analyticsLoading}
                    currency={filters.currency}
                />

                {/* Students packages table */}
                <StudentPackagesTable
                    students={students}
                    loading={studentsLoading}
                    onRowClick={handleRowClick}
                    onOpenSetup={handleOpenSetupWizard}
                    onRecordPayment={(student, preset) => {
                        setModalPreselectedStudent(student);
                        setPaymentPreset(preset);
                        setPaymentModalOpen(true);
                    }}
                />
            </Box>

            {/* Student Ledger Drawer */}
            <StudentLedgerDrawer
                open={drawerOpen}
                onClose={handleDrawerClose}
                student={selectedStudent}
                ledgerData={ledgerData ?? null}
                loading={ledgerLoading}
                currency={selectedStudent?.currency ?? filters.currency}
                onAddPayment={handleAddPaymentFromDrawer}
                onEditPayment={handleEditPayment}
                onDeletePayment={handleDeletePayment}
                onViewLesson={handleViewLesson}
                onEditPlan={handleOpenPlan}
                onOpenSetup={handleOpenSetupWizard}
            />

            {/* Add Payment Modal */}
            <AddPaymentModal
                open={paymentModalOpen}
                onClose={handlePaymentModalClose}
                onSuccess={handlePaymentSuccess}
                defaultCurrency={filters.currency}
                preselectedStudent={modalPreselectedStudent}
                preset={paymentPreset}
            />

            {/* Plan settings modal */}
            <PlanSettingsModal
                open={planModalOpen}
                onClose={handlePlanClose}
                student={planStudent}
                defaultCurrency={filters.currency}
                onSaved={refreshAll}
            />

            {/* Package setup wizard */}
            <SetCurrentStateWizard
                open={setupWizardOpen}
                onClose={handleCloseSetupWizard}
                student={setupStudent}
                defaultCurrency={filters.currency}
                onSuccess={handleSetupSuccess}
            />

            <Snackbar
                open={toastOpen}
                autoHideDuration={3000}
                onClose={() => setToastOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="success" onClose={() => setToastOpen(false)} sx={{ width: '100%' }}>
                    State updated
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default PaymentsPage;
