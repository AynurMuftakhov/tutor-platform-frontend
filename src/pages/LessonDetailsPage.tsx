import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import {Container, CircularProgress, Typography, Divider} from "@mui/material";
import { getLessonById } from "../services/api";
import LessonBasicInfo from "../components/lessonDetail/LessonBasicInfo";
import LessonPlanSection from "../components/lessonDetail/LessonPlanSection";
import HomeworkSection from "../components/lessonDetail/HomeworkSection";
import PostLessonNotes from "../components/lessonDetail/PostLessonNotes";
import LessonTracking from "../components/lessonDetail/LessonTracking";

const LessonDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();

    const [lesson, setLesson] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    const passedStudent = location.state?.student;

    useEffect(() => {
        const fetchLesson = async () => {
            try {
                const lessonData = await getLessonById(id as string);
                setLesson(lessonData);
            } catch (e) {
                console.error("Failed to fetch lesson", e);
            } finally {
                setLoading(false);
            }
        };

        fetchLesson();
    }, [id]);

    if (loading) {
        return <CircularProgress />;
    }

    if (!lesson) {
        return <Typography color="error">Lesson not found</Typography>;
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>
                Lesson Details
            </Typography>

            <LessonBasicInfo lesson={lesson} student={passedStudent} />

            <Divider sx={{ my: 3 }} />
            <LessonPlanSection lesson={lesson} />

            <Divider sx={{ my: 3 }} />
            <HomeworkSection lesson={lesson} />

            <Divider sx={{ my: 3 }} />
            <PostLessonNotes lesson={lesson} />

            <Divider sx={{ my: 3 }} />
            <LessonTracking lesson={lesson} />
        </Container>
    );
};

export default LessonDetailPage;