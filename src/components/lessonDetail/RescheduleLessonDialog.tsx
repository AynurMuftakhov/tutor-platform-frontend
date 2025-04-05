import React, { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from "@mui/material";
import DateTimeInput from "../DateTimeInput";

interface Props {
    open: boolean;
    initialDateTime: string; // ISO string
    onClose: () => void;
    onSubmit: (newDateTime: string) => void;
}

const RescheduleLessonDialog: React.FC<Props> = ({
                                                     open,
                                                     initialDateTime,
                                                     onClose,
                                                     onSubmit
                                                 }) => {
    const [dateTime, setDateTime] = useState<string>(initialDateTime);

    const handleSubmit = () => {
        onSubmit(dateTime);
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Reschedule Lesson</DialogTitle>
            <DialogContent
                sx={{
                    mt: 1,
                    minWidth: { xs: "auto", sm: 400 },
                    px: { xs: 2, sm: 3 },
                }}
            >
                <DateTimeInput
                    label="New Lesson Time"
                    value={dateTime}
                    onChange={setDateTime}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RescheduleLessonDialog;