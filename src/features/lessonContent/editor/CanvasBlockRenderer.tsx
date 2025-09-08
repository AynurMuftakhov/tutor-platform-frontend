import React from 'react';
import type { BlockContentPayload, TextBlockPayload } from '../../../types/lessonContent';
import { BlockView } from '../student/StudentRenderer';
import TextInlineEditor from './TextInlineEditor';

interface Props {
  refId: string;
  type: string;
  content: Record<string, BlockContentPayload>;
  editable?: boolean;
}

const CanvasBlockRenderer: React.FC<Props> = ({ refId, type, content, editable }) => {
  if (editable && type === 'text') {
    const payload = content[refId] as TextBlockPayload | undefined;
    if (!payload) return null;
    return <TextInlineEditor id={refId} html={payload.html || ''} />;
  }
  // Fallback to read-only presenters for all other types
  return <BlockView refId={refId} type={type} content={content} />;
};

export default CanvasBlockRenderer;
