export const getLessonStatusColor = (status: string) => {
    switch (status) {
        case "SCHEDULED":
            return "primary";
        case "IN_PROGRESS":
            return "warning";
        case "COMPLETED":
            return "success";
        case "CANCELED":
            return "error";
        default:
            return "default";
    }
};