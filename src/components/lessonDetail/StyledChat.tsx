import { Chat } from '@livekit/components-react';
import { Box, useTheme } from '@mui/material';

export const StyledChat = () => {
    const theme = useTheme();

    return (
        <Box
            sx={{
                height: '100%',
                width: '100%',
                borderTop: `1px solid ${theme.palette.divider}`,
            }}
        >
            <Chat
                style={{ height: '100%', width: '100%' }}
                className="lk-chat-speakshire"
            />
        </Box>
    );
};
