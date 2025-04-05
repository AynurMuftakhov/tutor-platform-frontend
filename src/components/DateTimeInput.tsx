import React, { useEffect, useState } from "react";
import { Box, Stack, TextField } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

interface DateTimeInputProps {
    label?: string;
    value: string; // ISO string
    onChange: (iso: string) => void;
    error?: boolean;
    helperText?: string;
}

const DateTimeInput: React.FC<DateTimeInputProps> = ({
                                                         label = "Date & Time",
                                                         value,
                                                         onChange,
                                                         error,
                                                         helperText,
                                                     }) => {
    const [timeInput, setTimeInput] = useState("12:00");
    const [localDate, setLocalDate] = useState<dayjs.Dayjs | null>(null);

    useEffect(() => {
        const date = dayjs(value);
        if (date.isValid()) {
            setLocalDate(date);
            setTimeInput(date.format("HH:mm"));
        }
    }, [value]);

    const handleDateChange = (newDate: dayjs.Dayjs | null) => {
        if (!newDate || !newDate.isValid()) return;

        setLocalDate(newDate); // ✅ update local state

        const [hours, minutes] = timeInput.split(":").map(Number);
        const updated = newDate
            .hour(hours || 12)
            .minute(minutes || 0)
            .second(0);

        onChange(updated.toISOString());
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setTimeInput(val);
    };

    const handleTimeBlur = () => {
        const [hours, minutes] = timeInput.split(":").map(Number);

        if (
            isNaN(hours) || isNaN(minutes) ||
            hours < 0 || hours > 23 ||
            minutes < 0 || minutes > 59
        ) {
            return;
        }

        const date = localDate ?? dayjs();
        const updated = date.hour(hours).minute(minutes).second(0);
        onChange(updated.format());
    };

    return (
        <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems="stretch"
            sx={{ mt: 1 }}
        >
            <Box flex={{ sm: 2, xs: undefined }}>
                <DatePicker
                    label="Date"
                    value={localDate}
                    onChange={handleDateChange}
                    slotProps={{
                        textField: {
                            fullWidth: true,
                            error,
                            helperText,
                        },
                    }}
                />
            </Box>
            <Box flex={{ sm: 1, xs: undefined }}>
                <TextField
                    label="Time (HH:mm)"
                    value={timeInput}
                    onChange={handleTimeChange}
                    onBlur={handleTimeBlur}
                    fullWidth
                    error={error}
                    helperText={helperText}
                    placeholder="14:30"
                />
            </Box>
        </Stack>
    );
};

export default DateTimeInput;