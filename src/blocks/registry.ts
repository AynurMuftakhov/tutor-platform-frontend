import React from 'react';

export type BlockType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'GRAMMAR';

export interface BlockEditorProps<T = any> {
  nodeId: string;
  content: T;
  onChange: (next: T) => void;
}

export interface BlockStudentProps<T = any> {
  content: T;
}

export interface BlockDefinition<T = any> {
  type: BlockType;
  icon: React.ReactNode;
  label: string;
  description?: string;
  defaultContent: T;
  defaultSize: { w: number; h: number };
  EditorComponent: React.ComponentType<BlockEditorProps<T>>;
  StudentComponent: React.ComponentType<BlockStudentProps<T>>;
  ajvSchema: any;
}

const registry = new Map<BlockType, BlockDefinition<any>>();

export const registerBlock = (def: BlockDefinition<any>) => {
  registry.set(def.type, def);
};

export const getBlock = (type: BlockType): BlockDefinition<any> | undefined => registry.get(type);

export const listBlocks = (): BlockDefinition<any>[] => Array.from(registry.values());
