import React, { useEffect, useState } from "react";
import { Grid, Typography, CircularProgress, Box } from "@mui/material";
import NextLessonCard from "./NextLessonCard";
import {Lesson} from "../../types/Lesson";
import {getUpcomingLessons} from "../../services/api";
import {useAuth} from "../../context/AuthContext";

const UpcomingLessonsSection: React.FC = () => {
    const [lessons, setLessons] = useState<Lesson[] | null>(null);
    const {user} = useAuth()

    useEffect(() => {
        const fetchLessons = async () => {
            try {
                const studentId = user?.role === "student" ? user?.id : undefined;
                const tutorId = user?.role === "tutor" ? user?.id : undefined;
                const now = new Date();
                const res = await getUpcomingLessons(tutorId as string, studentId as string, now.toISOString());
                setLessons(res);
            } catch (error) {
                console.error("Failed to fetch lessons:", error);
                setLessons([]);
            }
        };
        fetchLessons();
    }, [user]);

    if (lessons === null) {
        return (
            <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
            <Typography variant="h6" fontWeight={600} gutterBottom>
                Next Lessons
            </Typography>
            <Grid container spacing={2}>
                {lessons.length > 0 ? (
                    lessons.slice(0, 2).map((lesson) => (
                        <Grid size={{ xs: 12, sm: 6, md:4 }} key={lesson.id}>
                            <NextLessonCard lesson={lesson} />
                        </Grid>
                    ))
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        No upcoming lessons.
                    </Typography>
                )}
            </Grid>
        </>
    );
};

export default UpcomingLessonsSection;