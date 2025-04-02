import React from "react";
import { Box, Typography, Chip, Stack } from "@mui/material";

interface Props {
    lesson: any;
}

const LessonTracking: React.FC<Props> = ({ lesson }) => {
    const satisfactionLabel = (value: string | null | undefined) => {
        switch (value) {
            case "VERY_SATISFIED":
                return "Very satisfied";
            case "SATISFIED":
                return "Satisfied";
            case "NEUTRAL":
                return "Neutral";
            case "DISSATISFIED":
                return "Dissatisfied";
            case "VERY_DISSATISFIED":
                return "Very dissatisfied";
            default:
                return "Not set";
        }
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Tracking & Metrics
            </Typography>

            <Stack spacing={2} direction="column" sx={{ mt: 1 }}>
                <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                        Status
                    </Typography>
                    <Chip label={lesson.status} color="primary" variant="outlined" />
                </Box>

                <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                        Lesson Satisfaction
                    </Typography>
                    <Typography>{satisfactionLabel(lesson.lessonSatisfaction)}</Typography>
                </Box>
            </Stack>
        </Box>
    );
};

export default LessonTracking;