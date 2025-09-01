import React from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

interface DraggableBlockProps {
  id: string;
  data: { sectionId: string; rowId: string; columnId: string; index: number };
  children: React.ReactNode;
}

const DraggableBlock: React.FC<DraggableBlockProps> = ({ id, data, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, data });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : undefined,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            {children}

            <button
                ref={setActivatorNodeRef}
                {...listeners}
                aria-label="Drag block"
                style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    background: 'transparent',
                    border: 0,
                    cursor: 'grab',
                }}
            >
                <DragIndicatorIcon fontSize="small" />
            </button>
        </div>
    );
};

export default DraggableBlock;
