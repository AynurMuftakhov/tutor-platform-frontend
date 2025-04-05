import React from "react";
import { Typography, Chip, Stack } from "@mui/material";
import InsightsIcon from "@mui/icons-material/Insights";
import CardWrapper from "./CardWrapper";
import SectionHeader from "./SectionHeader";

interface Props {
    lesson: any;
}

const LessonTracking: React.FC<Props> = ({ lesson }) => {
    const satisfactionLabel = (value: string | null | undefined) => {
        switch (value) {
            case "VERY_SATISFIED": return "Very satisfied";
            case "SATISFIED": return "Satisfied";
            case "NEUTRAL": return "Neutral";
            case "DISSATISFIED": return "Dissatisfied";
            case "VERY_DISSATISFIED": return "Very dissatisfied";
            default: return "Not set";
        }
    };

    return (
        <CardWrapper>
            <SectionHeader
                title="Tracking & Metrics"
                icon={<InsightsIcon color="primary" />}
            />

            <Stack spacing={2}>
                <div>
                    <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                    <Chip label={lesson.status} color="primary" variant="outlined" />
                </div>
                <div>
                    <Typography variant="subtitle2" color="text.secondary">Lesson Satisfaction</Typography>
                    <Typography>{satisfactionLabel(lesson.lessonSatisfaction)}</Typography>
                </div>
            </Stack>
        </CardWrapper>
    );
};

export default LessonTracking;