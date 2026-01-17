import React, { useState, useCallback, useMemo } from 'react';
import { Box } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import PaymentsIcon from '@mui/icons-material/Payments';
import PageHeader from '../components/PageHeader';
import BillingFiltersBar, { getDefaultFilters } from '../components/billing/BillingFiltersBar';
import BillingKPICards from '../components/billing/BillingKPICards';
import StudentCardsGrid from '../components/billing/StudentCardsGrid';
import StudentLedgerDrawer from '../components/billing/StudentLedgerDrawer';
import AddPaymentModal from '../components/billing/AddPaymentModal';
import PlanSettingsModal from '../components/billing/PlanSettingsModal';
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
} from '../types/billing';

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
    const [planModalOpen, setPlanModalOpen] = useState(false);
    const [planStudent, setPlanStudent] = useState<BillingStudent | null>(null);

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

    const handleQuickPay = (student: BillingStudent) => {
        setModalPreselectedStudent(student);
        setPaymentModalOpen(true);
    };

    const handleAddPaymentFromHeader = () => {
        setModalPreselectedStudent(null);
        setPaymentModalOpen(true);
    };

    const handleAddPaymentFromDrawer = () => {
        setModalPreselectedStudent(selectedStudent);
        setPaymentModalOpen(true);
    };

    const handleOpenPlan = (student: BillingStudent) => {
        setPlanStudent(student);
        setPlanModalOpen(true);
    };

    const handlePlanClose = () => {
        setPlanStudent(null);
        setPlanModalOpen(false);
    };

    const handlePaymentModalClose = () => {
        setPaymentModalOpen(false);
        setModalPreselectedStudent(null);
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
        
        // Create a copy to avoid mutating the original data
        const sorted = [...rawStudents];
        
        if (filters.sortBy === 'name_asc') {
            // Sort alphabetically by name
            sorted.sort((a, b) => a.studentName.localeCompare(b.studentName));
        } else {
            // Default: sort by outstanding (debtors first)
            sorted.sort((a, b) => b.lessonsOutstanding - a.lessonsOutstanding);
        }
        
        return sorted;
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

                {/* KPI Cards with Analytics Chart */}
                <BillingKPICards
                    analytics={analyticsData ?? null}
                    loading={analyticsLoading}
                    currency={filters.currency}
                />

                {/* Students Cards View */}
                <StudentCardsGrid
                    students={students}
                    loading={studentsLoading}
                    onCardClick={handleRowClick}
                    onQuickPay={handleQuickPay}
                    onEditPlan={handleOpenPlan}
                    onPackageChanged={refreshAll}
                    filterCurrency={filters.currency}
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
            />

            {/* Add Payment Modal */}
            <AddPaymentModal
                open={paymentModalOpen}
                onClose={handlePaymentModalClose}
                onSuccess={handlePaymentSuccess}
                defaultCurrency={filters.currency}
                preselectedStudent={modalPreselectedStudent}
            />

            {/* Plan settings modal */}
            <PlanSettingsModal
                open={planModalOpen}
                onClose={handlePlanClose}
                student={planStudent}
                defaultCurrency={filters.currency}
                onSaved={refreshAll}
            />
        </Box>
    );
};

export default PaymentsPage;
