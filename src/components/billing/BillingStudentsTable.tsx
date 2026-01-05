import React from 'react';
import {
    Avatar,
    Box,
    Button,
    Chip,
    Paper,
    Skeleton,
    Stack,
    Tooltip,
    Typography,
    useTheme,
    alpha,
} from '@mui/material';
import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
    GridToolbarContainer,
    GridToolbarColumnsButton,
    GridToolbarDensitySelector,
    GridToolbarExport,
} from '@mui/x-data-grid';
import PaymentIcon from '@mui/icons-material/Payment';
import CelebrationIcon from '@mui/icons-material/Celebration';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { BillingStudent } from '../../types/billing';

interface BillingStudentsTableProps {
    students: BillingStudent[];
    loading: boolean;
    currency: string;
    onRowClick: (student: BillingStudent) => void;
    onQuickPay: (student: BillingStudent) => void;
    onEditPlan: (student: BillingStudent) => void;
}

function formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

const CustomToolbar: React.FC = () => (
    <GridToolbarContainer>
        <GridToolbarColumnsButton />
        <GridToolbarDensitySelector />
        <GridToolbarExport />
    </GridToolbarContainer>
);

const BillingStudentsTable: React.FC<BillingStudentsTableProps> = ({
    students,
    loading,
    currency,
    onRowClick,
    onQuickPay,
    onEditPlan,
}) => {
    const theme = useTheme();

    const resolvePackagePrice = (student: BillingStudent) => {
        return student.pricePerPackage || 0;
    };

    // Check if all students are settled
    const allSettled = students.length > 0 && students.every(s => s.lessonsOutstanding <= 0);

    const getLessonsBadge = (student: BillingStudent) => {
        const { lessonsCompleted, lessonsPaid, lessonsOutstanding } = student;
        const hasDebt = lessonsOutstanding > 0;
        const hasCredit = lessonsOutstanding < 0;

        return (
            <Stack direction="row" spacing={0.5} alignItems="center">
                <Tooltip title="Lessons completed">
                    <Chip
                        label={lessonsCompleted}
                        size="small"
                        sx={{
                            height: 22,
                            minWidth: 28,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            bgcolor: alpha(theme.palette.info.main, 0.1),
                            color: theme.palette.info.main,
                        }}
                    />
                </Tooltip>
                <Typography variant="caption" color="text.disabled">/</Typography>
                <Tooltip title="Lessons paid">
                    <Chip
                        label={lessonsPaid}
                        size="small"
                        sx={{
                            height: 22,
                            minWidth: 28,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            bgcolor: alpha(theme.palette.success.main, 0.1),
                            color: theme.palette.success.main,
                        }}
                    />
                </Tooltip>
                <Typography variant="caption" color="text.disabled">/</Typography>
                <Tooltip title={hasCredit ? 'Lessons credit' : 'Lessons outstanding'}>
                    <Chip
                        label={Math.abs(lessonsOutstanding)}
                        size="small"
                        sx={{
                            height: 22,
                            minWidth: 28,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            bgcolor: hasDebt 
                                ? alpha(theme.palette.error.main, 0.1)
                                : hasCredit
                                ? alpha(theme.palette.success.main, 0.1)
                                : alpha(theme.palette.grey[500], 0.1),
                            color: hasDebt 
                                ? theme.palette.error.main
                                : hasCredit
                                ? theme.palette.success.main
                                : theme.palette.text.secondary,
                        }}
                    />
                </Tooltip>
            </Stack>
        );
    };

    const getBalanceBadge = (student: BillingStudent) => {
        const packageSize = student.packageSize || 1;
        const packageRate = student.pricePerPackage || 0;
        const displayCurrency = student.currency || currency;
        
        // Calculate packages
        const completedPackages = Math.floor(student.lessonsCompleted / packageSize);
        const paidPackages = Math.floor(student.lessonsPaid / packageSize);
        const outstandingPackages = completedPackages - paidPackages;
        const owedAmount = outstandingPackages * packageRate;

        if (outstandingPackages > 0) {
            return (
                <Chip
                    label={`Owes ${outstandingPackages} pkg (${formatMoney(owedAmount, displayCurrency)})`}
                    size="small"
                    sx={{
                        bgcolor: alpha(theme.palette.error.main, 0.1),
                        color: theme.palette.error.main,
                        fontWeight: 600,
                        borderRadius: '8px',
                        '& .MuiChip-label': {
                            px: 1,
                        },
                    }}
                />
            );
        }
        if (outstandingPackages < 0) {
            return (
                <Chip
                    label={`Credit ${Math.abs(outstandingPackages)} pkg (${formatMoney(Math.abs(owedAmount), displayCurrency)})`}
                    size="small"
                    sx={{
                        bgcolor: alpha(theme.palette.success.main, 0.1),
                        color: theme.palette.success.main,
                        fontWeight: 600,
                        borderRadius: '8px',
                        '& .MuiChip-label': {
                            px: 1,
                        },
                    }}
                />
            );
        }
        return (
            <Chip
                label="Settled"
                size="small"
                sx={{
                    bgcolor: alpha(theme.palette.grey[500], 0.1),
                    color: theme.palette.text.secondary,
                    fontWeight: 500,
                    borderRadius: '8px',
                }}
            />
        );
    };

    const getQuickPayButton = (student: BillingStudent) => {
        const packageSize = student.packageSize || 1;
        const packageRate = student.pricePerPackage || 0;
        const displayCurrency = student.currency || currency;
        
        // Calculate packages
        const completedPackages = Math.floor(student.lessonsCompleted / packageSize);
        const paidPackages = Math.floor(student.lessonsPaid / packageSize);
        const outstandingPackages = completedPackages - paidPackages;
        
        const hasDebt = outstandingPackages > 0;
        const quickPayPackages = hasDebt ? outstandingPackages : 1;
        const quickPayAmount = quickPayPackages * packageRate;

        return (
            <Tooltip 
                title={hasDebt 
                    ? `Pay for ${quickPayPackages} package${quickPayPackages !== 1 ? 's' : ''}`
                    : 'Record payment'
                }
            >
                <Button
                    size="small"
                    variant={hasDebt ? 'contained' : 'outlined'}
                    startIcon={<PaymentIcon sx={{ fontSize: 14 }} />}
                    onClick={(e) => {
                        e.stopPropagation();
                        onQuickPay(student);
                    }}
                    sx={{
                        textTransform: 'none',
                        fontSize: '0.7rem',
                        py: 0.5,
                        px: 1.5,
                        borderRadius: 2,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {hasDebt 
                        ? `${quickPayPackages} pkg • ${formatMoney(quickPayAmount, displayCurrency)}`
                        : 'Pay'
                    }
                </Button>
            </Tooltip>
        );
    };

    const columns: GridColDef<BillingStudent>[] = [
        {
            field: 'studentName',
            headerName: 'Student',
            flex: 1,
            minWidth: 180,
            renderCell: (params: GridRenderCellParams<BillingStudent>) => (
                <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar
                        src={params.row.studentAvatar}
                        alt={params.row.studentName}
                        sx={{
                            width: 32,
                            height: 32,
                            fontSize: 14,
                            bgcolor: theme.palette.primary.light,
                        }}
                    >
                        {params.row.studentName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                        <Typography fontWeight={600} variant="body2">
                            {params.row.studentName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {params.row.packageSize} lessons • {formatMoney(resolvePackagePrice(params.row), params.row.currency || currency)} package
                        </Typography>
                        <Button
                            size="small"
                            variant="text"
                            onClick={(e) => { e.stopPropagation(); onEditPlan(params.row); }}
                            sx={{ minWidth: 0, p: 0, fontSize: '0.75rem' }}
                        >
                            Edit plan
                        </Button>
                    </Box>
                </Box>
            ),
        },
        {
            field: 'lessons',
            headerName: 'Lessons (C/P/O)',
            width: 150,
            sortable: false,
            renderCell: (params: GridRenderCellParams<BillingStudent>) => 
                getLessonsBadge(params.row),
        },
        {
            field: 'outstandingAmount',
            headerName: 'Balance',
            width: 160,
            renderCell: (params: GridRenderCellParams<BillingStudent>) => 
                getBalanceBadge(params.row),
        },
        {
            field: 'lastPaymentDate',
            headerName: 'Last payment',
            width: 120,
            renderCell: (params: GridRenderCellParams<BillingStudent>) => (
                <Typography variant="body2" color="text.secondary">
                    {formatDate(params.row.lastPaymentDate)}
                </Typography>
            ),
        },
        {
            field: 'actions',
            headerName: '',
            width: 140,
            sortable: false,
            renderCell: (params: GridRenderCellParams<BillingStudent>) => 
                getQuickPayButton(params.row),
        },
    ];

    if (loading) {
        return (
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                {[...Array(5)].map((_, i) => (
                    <Box key={i} display="flex" gap={2} mb={2} alignItems="center">
                        <Skeleton variant="circular" width={32} height={32} />
                        <Skeleton variant="text" width="25%" height={24} />
                        <Skeleton variant="rounded" width={100} height={24} />
                        <Skeleton variant="text" width="15%" height={24} />
                        <Skeleton variant="text" width="15%" height={24} />
                    </Box>
                ))}
            </Paper>
        );
    }

    if (students.length === 0) {
        return (
            <Paper
                elevation={0}
                sx={{
                    p: 6,
                    borderRadius: 3,
                    border: `1px solid ${theme.palette.divider}`,
                    textAlign: 'center',
                    bgcolor: alpha(theme.palette.background.paper, 0.5),
                }}
            >
                <Box
                    sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        mb: 2,
                    }}
                >
                    <ReceiptLongIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                </Box>
                <Typography variant="h6" color="text.primary" gutterBottom fontWeight={600}>
                    No students found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Students with lessons will appear here.
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
            {/* Celebration banner when all settled */}
            {allSettled && (
                <Box
                    sx={{
                        p: 2,
                        bgcolor: alpha(theme.palette.success.main, 0.08),
                        borderBottom: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                    }}
                >
                    <CelebrationIcon sx={{ color: 'success.main' }} />
                    <Typography variant="body2" fontWeight={600} color="success.main">
                        All students are settled! No outstanding payments.
                    </Typography>
                </Box>
            )}

            <Box sx={{ width: '100%', overflowX: 'auto' }}>
                <Box sx={{ minWidth: 750 }}>
                    <DataGrid<BillingStudent>
                        rows={students}
                        columns={columns}
                        getRowId={(row) => row.studentId}
                        onRowClick={(params) => onRowClick(params.row)}
                        disableRowSelectionOnClick
                        disableColumnMenu
                        slots={{ toolbar: CustomToolbar }}
                        density="compact"
                        autoHeight
                        pageSizeOptions={[10, 25, 50]}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 10, page: 0 } },
                            sorting: {
                                sortModel: [{ field: 'outstandingAmount', sort: 'desc' }],
                            },
                        }}
                        sx={{
                            border: 'none',
                            cursor: 'pointer',
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: alpha(theme.palette.action.hover, 0.5),
                                position: 'sticky',
                                top: 0,
                                zIndex: 1,
                            },
                            '& .MuiDataGrid-cell': {
                                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                            },
                            '& .MuiDataGrid-cell:focus': {
                                outline: 'none',
                            },
                            '& .MuiDataGrid-cell:focus-within': {
                                outline: 'none',
                            },
                            '& .MuiDataGrid-row': {
                                transition: 'background-color 0.15s ease',
                            },
                            '& .MuiDataGrid-row:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.06),
                            },
                            '& .MuiDataGrid-row:focus': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                            },
                        }}
                    />
                </Box>
            </Box>
        </Paper>
    );
};

export default BillingStudentsTable;
