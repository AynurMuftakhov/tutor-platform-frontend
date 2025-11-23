import React from 'react';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ImageIcon from '@mui/icons-material/Image';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import SmartDisplayIcon from '@mui/icons-material/SmartDisplay';
import QuizIcon from '@mui/icons-material/Quiz';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import type {
  BlockContentPayload,
  TextBlockPayload,
  ImageBlockPayload,
  AudioBlockPayload,
  VideoBlockPayload,
  GrammarMaterialBlockPayload,
  ListeningTaskBlockPayload,
} from '../../../types/lessonContent';

export type BlockType = 'text' | 'image' | 'audio' | 'video' | 'grammarMaterial' | 'listeningTask';

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

// Minimal placeholder components for now (no JSX)
const PlaceholderEditor: React.FC<{ id: string; label?: string }> = ({ label }) =>
  React.createElement(
    'span',
    { style: { fontSize: 12, color: 'var(--mui-palette-text-secondary)' } },
    label || 'Editor placeholder',
  );

const PlaceholderStudent: React.FC<{ id: string; label?: string }> = ({ label }) =>
  React.createElement(
    'span',
    { style: { fontSize: 12, color: 'var(--mui-palette-text-secondary)' } },
    label || 'Student placeholder',
  );

// Pre-register blocks (no JSX)
register<TextBlockPayload>('text', {
  icon: React.createElement(TextFieldsIcon, { fontSize: 'small' }),
  label: 'Text',
  schemaId: 'text.v1.json',
  defaultContent: () => ({ html: '<p>Start writing…</p>' }),
  EditorComponent: (props) => React.createElement(PlaceholderEditor, { ...props, label: 'Text (editor)' }),
  StudentComponent: (props) => React.createElement(PlaceholderStudent, { ...props, label: 'Text (student)' }),
});

register<ImageBlockPayload>('image', {
  icon: React.createElement(ImageIcon, { fontSize: 'small' }),
  label: 'Image',
  schemaId: 'image.v1.json',
  defaultContent: () => ({ url: '', alt: '', caption: '' }),
  EditorComponent: (props) => React.createElement(PlaceholderEditor, { ...props, label: 'Image (editor)' }),
  StudentComponent: (props) => React.createElement(PlaceholderStudent, { ...props, label: 'Image (student)' }),
});

register<AudioBlockPayload>('audio', {
  icon: React.createElement(AudiotrackIcon, { fontSize: 'small' }),
  label: 'Audio',
  schemaId: 'audio.v1.json',
  defaultContent: () => ({ materialId: '', autoplay: false }),
  EditorComponent: (props) => React.createElement(PlaceholderEditor, { ...props, label: 'Audio (editor)' }),
  StudentComponent: (props) => React.createElement(PlaceholderStudent, { ...props, label: 'Audio (student)' }),
});

register<VideoBlockPayload>('video', {
  icon: React.createElement(SmartDisplayIcon, { fontSize: 'small' }),
  label: 'Video',
  schemaId: 'video.v1.json',
  defaultContent: () => ({ materialId: '' }),
  EditorComponent: (props) => React.createElement(PlaceholderEditor, { ...props, label: 'Video (editor)' }),
  StudentComponent: (props) => React.createElement(PlaceholderStudent, { ...props, label: 'Video (student)' }),
});

register<GrammarMaterialBlockPayload>('grammarMaterial', {
  icon: React.createElement(QuizIcon, { fontSize: 'small' }),
  label: 'Grammar',
  schemaId: 'grammarMaterial.v1.json',
  defaultContent: () => ({ materialId: '', mode: 'all', shuffle: false }),
  EditorComponent: (props) => React.createElement(PlaceholderEditor, { ...props, label: 'Grammar (editor)' }),
  StudentComponent: (props) => React.createElement(PlaceholderStudent, { ...props, label: 'Grammar (student)' }),
});

register<ListeningTaskBlockPayload>('listeningTask', {
  icon: React.createElement(HeadphonesIcon, { fontSize: 'small' }),
  label: 'Listening task',
  schemaId: 'listeningTask.v1.json',
  defaultContent: () => ({ materialId: '', taskId: '', showTranscript: false, showFocusWords: true }),
  EditorComponent: (props) => React.createElement(PlaceholderEditor, { ...props, label: 'Listening task (editor)' }),
  StudentComponent: (props) => React.createElement(PlaceholderStudent, { ...props, label: 'Listening task (student)' }),
});

export const BlockRegistry = { register, get, all };
