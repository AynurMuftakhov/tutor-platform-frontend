import { TransitionProps } from "@mui/material/transitions";
import { motion } from "framer-motion";
import React from "react";

type MotionDivTransitionProps = TransitionProps & {
    children: React.ReactElement;
};

const forbiddenProps = [
    "exit",
    "enter",
    "appear",
    "mountOnEnter",
    "unmountOnExit",
    "timeout",
    "addEndListener",
    "onEnter",
    "onEntering",
    "onEntered",
    "onExit",
    "onExiting",
    "onExited",
    "in",
    "onDrag", // problematic with framer-motion!
];

const MotionDivTransition = React.forwardRef<HTMLDivElement, MotionDivTransitionProps>(
    ({ children, ...rest }, ref) => {
        // Drop all forbidden props
        const motionProps = Object.fromEntries(
            Object.entries(rest).filter(([key]) => !forbiddenProps.includes(key))
        );

        return (
            <motion.div ref={ref} {...motionProps}>
                {children}
            </motion.div>
        );
    }
);

MotionDivTransition.displayName = "MotionDivTransition";

export default MotionDivTransition;