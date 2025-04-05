import { Card, CardProps } from "@mui/material";

const CardWrapper = ({ children, ...props }: CardProps) => (
    <Card
        elevation={0}
        sx={{
            borderRadius: 3,
            p: 3,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#fff",
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            transition: "box-shadow 0.2s ease",
            "&:hover": {
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            },
        }}
        {...props}
    >
        {children}
    </Card>
);

export default CardWrapper;