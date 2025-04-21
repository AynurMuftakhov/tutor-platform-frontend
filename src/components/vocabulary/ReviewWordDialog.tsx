import React, {useEffect, useState} from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography
} from '@mui/material';
import {VocabularyWord} from '../../types';

const ReviewWordDialog: React.FC<{
    open: boolean;
    data: VocabularyWord | null;
    onSave: (patch: Partial<VocabularyWord>) => void;
    onClose: () => void;
}> = ({open, data, onSave, onClose}) => {
    const [values, setValues] = useState<Partial<VocabularyWord>>({});
    useEffect(() => setValues(data ?? {}), [data]);

    if (!data) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{overflowWrap: 'anywhere'}}>
                Review “{data.text}”
            </DialogTitle>
            <DialogContent dividers sx={{display: 'grid', gap: 2}}>
                <TextField
                    label="Definition"
                    multiline
                    value={values.definitionEn ?? data.definitionEn}
                    onChange={e => setValues({...values, definitionEn: e.target.value})}
                />
                <TextField
                    label="Translation (ru)"
                    value={values.translation ?? data.translation}
                    onChange={e => setValues({...values, translation: e.target.value})}
                />
                <TextField
                    label="Part of speech"
                    value={values.partOfSpeech ?? data.partOfSpeech ?? ''}
                    onChange={e => setValues({...values, partOfSpeech: e.target.value})}
                />
                <TextField
                    label="Synonyms (comma‑separated)"
                    value={(values.synonymsEn ?? data.synonymsEn).join(', ')}
                    onChange={e =>
                        setValues({
                            ...values,
                            synonymsEn: e.target.value.split(',').map(s => s.trim())
                        })
                    }
                />
                <Typography variant="caption">
                    Phonetic: <b>{data.phonetic ?? '—'}</b>
                </Typography>
                {data.audioUrl && (
                    <audio controls src={data.audioUrl} style={{width: '100%'}} />
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={() => {
                        onSave(values);
                        onClose();
                    }}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ReviewWordDialog;