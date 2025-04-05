import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import {
    Container,
    CircularProgress,
    Typography,
    Grid
} from "@mui/material";
import { fetchStudentById, getLessonById } from "../services/api";

import LessonHero from "../components/lessonDetail/LessonHero";
import LessonPlanSection from "../components/lessonDetail/LessonPlanSection";
import HomeworkSection from "../components/lessonDetail/HomeworkSection";
import PostLessonNotes from "../components/lessonDetail/PostLessonNotes";
import LessonTracking from "../components/lessonDetail/LessonTracking";
import {Lesson} from "../types/Lesson";

const LessonDetailPage = () => {
    const { id } = useParams();
    const location = useLocation();

    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState(location.state?.student || null);

    useEffect(() => {
        const fetchLesson = async () => {
            try {
                const lessonData = await getLessonById(id as string);
                setLesson(lessonData);

                // Fetch student if not already passed from location.state
                if (!student && lessonData?.studentId) {
                    const fetchedStudent = await fetchStudentById(lessonData.studentId);
                    setStudent(fetchedStudent);
                }
            } catch (e) {
                console.error("Failed to fetch lesson", e);
            } finally {
                setLoading(false);
            }
        };

        fetchLesson();
    }, [id, student]);

    if (loading) {
        return <CircularProgress />;
    }

    if (!lesson) {
        return <Typography color="error">Lesson not found</Typography>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
            <Grid container spacing={3}>
                {/* Header */}
                <Grid item xs={12}>
                    <LessonHero
                        lesson={lesson}
                        student={student}
                        onUpdated={(updated) => {
                            setLesson((prev): Lesson | null => {
                                if (!prev) return prev;

                                const safePrev = prev as Lesson;
                                return { ...safePrev, ...updated };
                            });
                        }}
                    />
                </Grid>

                {/* Plan + Homework */}
                <Grid item xs={12} md={6}>
                    <LessonPlanSection lesson={lesson} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <HomeworkSection lesson={lesson} />
                </Grid>

                {/* Notes + Metrics */}
                <Grid item xs={12} md={6}>
                    <PostLessonNotes lesson={lesson} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <LessonTracking lesson={lesson} />
                </Grid>
            </Grid>
        </Container>

    )
};

export default LessonDetailPage;