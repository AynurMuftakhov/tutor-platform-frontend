import React from 'react';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ImageIcon from '@mui/icons-material/Image';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import SmartDisplayIcon from '@mui/icons-material/SmartDisplay';
import QuizIcon from '@mui/icons-material/Quiz';
import type { BlockContentPayload, TextBlockPayload, ImageBlockPayload, AudioBlockPayload, VideoBlockPayload, GrammarMaterialBlockPayload } from '../../../types/lessonContent';

export type BlockType = 'text' | 'image' | 'audio' | 'video' | 'grammarMaterial';

export interface BlockDefinition<T extends BlockContentPayload = BlockContentPayload> {
  icon: React.ReactNode;
  label: string;
  schemaId?: string;
  defaultContent: () => Omit<T, 'id'>; // id will be assigned when inserted
  EditorComponent: React.ComponentType<{ id: string }>;
  StudentComponent: React.ComponentType<{ id: string }>;
}

const registry = new Map<BlockType, BlockDefinition>();

export function register<T extends BlockContentPayload>(type: BlockType, def: BlockDefinition<T>) {
  registry.set(type, def as BlockDefinition);
}

export function get(type: BlockType): BlockDefinition | undefined {
  return registry.get(type);
}

export function all(): Array<{ type: BlockType; def: BlockDefinition }> {
  return Array.from(registry.entries()).map(([type, def]) => ({ type, def }));
}

// Minimal placeholder components for now
const PlaceholderEditor: React.FC<{ id: string; label?: string }> = ({ label }) => (
  <span style={{ fontSize: 12, color: 'var(--mui-palette-text-secondary)' }}>{label || 'Editor placeholder'}</span>
);
const PlaceholderStudent: React.FC<{ id: string; label?: string }> = ({ label }) => (
  <span style={{ fontSize: 12, color: 'var(--mui-palette-text-secondary)' }}>{label || 'Student placeholder'}</span>
);

// Pre-register blocks
register<TextBlockPayload>('text', {
  icon: <TextFieldsIcon fontSize="small" />,
  label: 'Text',
  schemaId: 'text.v1.json',
  defaultContent: () => ({ html: '<p>Start writing…</p>' }),
  EditorComponent: (props) => <PlaceholderEditor {...props} label="Text (editor)" />,
  StudentComponent: (props) => <PlaceholderStudent {...props} label="Text (student)" />,
});

register<ImageBlockPayload>('image', {
  icon: <ImageIcon fontSize="small" />,
  label: 'Image',
  schemaId: 'image.v1.json',
  defaultContent: () => ({ url: '', alt: '', caption: '' }),
  EditorComponent: (props) => <PlaceholderEditor {...props} label="Image (editor)" />,
  StudentComponent: (props) => <PlaceholderStudent {...props} label="Image (student)" />,
});

register<AudioBlockPayload>('audio', {
  icon: <AudiotrackIcon fontSize="small" />,
  label: 'Audio',
  schemaId: 'audio.v1.json',
  defaultContent: () => ({ materialId: '', autoplay: false }),
  EditorComponent: (props) => <PlaceholderEditor {...props} label="Audio (editor)" />,
  StudentComponent: (props) => <PlaceholderStudent {...props} label="Audio (student)" />,
});

register<VideoBlockPayload>('video', {
  icon: <SmartDisplayIcon fontSize="small" />,
  label: 'Video',
  schemaId: 'video.v1.json',
  defaultContent: () => ({ materialId: '' }),
  EditorComponent: (props) => <PlaceholderEditor {...props} label="Video (editor)" />,
  StudentComponent: (props) => <PlaceholderStudent {...props} label="Video (student)" />,
});

register<GrammarMaterialBlockPayload>('grammarMaterial', {
  icon: <QuizIcon fontSize="small" />,
  label: 'Grammar',
  schemaId: 'grammarMaterial.v1.json',
  defaultContent: () => ({ materialId: '', mode: 'all', shuffle: false }),
  EditorComponent: (props) => <PlaceholderEditor {...props} label="Grammar (editor)" />,
  StudentComponent: (props) => <PlaceholderStudent {...props} label="Grammar (student)" />,
});

export const BlockRegistry = { register, get, all };
