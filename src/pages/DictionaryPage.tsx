import React, {useMemo, useState} from 'react';
import {
    Box,
    Typography,
    IconButton,
    TextField,
    InputAdornment,
    Stack,
    TablePagination
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import {
    useDictionary,
    useDeleteWord,
    useCreateWord,
    useUpdateWord
} from '../hooks/useVocabulary';
import WordTable from '../components/vocabulary/WordTable';
import CategoryTabs from '../components/vocabulary/CategoryTabs';
import GenerateWordDialog from '../components/vocabulary/GenerateWordDialog';
import ReviewWordDialog from '../components/vocabulary/ReviewWordDialog';
import {VocabularyWord} from '../types';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const DictionaryPage: React.FC = () => {
    const {data: words = []} = useDictionary();
    const deleteWord = useDeleteWord();
    useCreateWord();
    const updateWord = useUpdateWord();
    const [genOpen, setGenOpen] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [selected, setSelected] = useState<VocabularyWord | null>(null);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<'ALL' | string>('ALL');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ------- FILTER + PAGINATE -------
    const filtered = useMemo(
        () =>
            words.filter(w => {
                const matchSearch = w.text.toLowerCase().includes(search.toLowerCase());
                const matchCat = category === 'ALL' ? true : w.partOfSpeech === category;
                return matchSearch && matchCat;
            }),
        [words, search, category]
    );

    const paginated = useMemo(
        () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [filtered, page, rowsPerPage]
    );

    const handleRowClick = (word: VocabularyWord) => {
        setSelected(word);
        setReviewOpen(true);
    };

    const handleReviewSave = (patch: Partial<VocabularyWord>) => {
        if (selected) {
            updateWord.mutate({id: selected.id, dto: patch});
        }
    };

    return (
        <Box p={4}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Dictionary</Typography>
                <IconButton color="primary" size="large" onClick={() => setGenOpen(true)}>
                    <AddIcon fontSize="inherit" />
                </IconButton>
            </Stack>

            {/* Search & Category */}
            <Stack direction={{xs: 'column', sm: 'row'}} spacing={2} mb={2}>
                <TextField
                    placeholder="Search word…"
                    fullWidth
                    size="small"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        )
                    }}
                />
                <CategoryTabs value={category} onChange={setCategory} />
            </Stack>

            <WordTable
                data={paginated}
                onDelete={id => deleteWord.mutate(id)}
                onRowClick={handleRowClick}
            />

            <TablePagination
                component="div"
                count={filtered.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                }}
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            />

            {/* Dialogs */}
            <GenerateWordDialog open={genOpen} onClose={() => setGenOpen(false)}/>

            <ReviewWordDialog
                open={reviewOpen}
                data={selected}
                onSave={handleReviewSave}
                onClose={() => setReviewOpen(false)}
            />
        </Box>
    );
};

export default DictionaryPage;