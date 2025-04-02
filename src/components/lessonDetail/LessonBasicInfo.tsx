import React from "react";
import { Box, Chip, Grid, Typography, Link } from "@mui/material";
import dayjs from "dayjs";
import { getLessonStatusColor } from "./utils";
import {Student} from "../../pages/MyStudentsPage";

interface Props {
    lesson: any;
    student?: Student;
}

const LessonBasicInfo: React.FC<Props> = ({ lesson, student }) => {
    const dateFormatted = dayjs(lesson.dateTime).format("DD MMM YYYY, HH:mm");
    const statusColor = getLessonStatusColor(lesson.status);

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Basic Information
            </Typography>

            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Date & Time
                    </Typography>
                    <Typography>{dateFormatted}</Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Duration
                    </Typography>
                    <Typography>{lesson.duration} minutes</Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Student
                    </Typography>
                    <Typography>{student?.name || "Unknown Student"}</Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Location / Format
                    </Typography>
                    {lesson.location?.startsWith("http") ? (
                        <Link href={lesson.location} target="_blank" rel="noopener">
                            {lesson.location}
                        </Link>
                    ) : (
                        <Typography>{lesson.location || "—"}</Typography>
                    )}
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Status
                    </Typography>
                    <Chip label={lesson.status} color={statusColor} variant="outlined" />
                </Grid>
            </Grid>
        </Box>
    );
};

export default LessonBasicInfo;