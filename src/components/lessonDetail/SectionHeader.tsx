import { Stack, Typography } from "@mui/material";
import { ReactNode } from "react";

const SectionHeader = ({
                           title,
                           icon,
                           action,
                       }: {
    title: string;
    icon?: ReactNode;
    action?: ReactNode;
}) => (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
            {icon}
            <Typography variant="h6">{title}</Typography>
        </Stack>
        {action}
    </Stack>
);

export default SectionHeader;