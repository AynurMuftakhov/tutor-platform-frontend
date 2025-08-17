// Registry exports
export * from './registry';

// Block definitions
import { registerBlock } from './registry';
import { TextBlockDef } from './TextBlock';
import { ImageBlockDef } from './ImageBlock';
import { AudioBlockDef } from './AudioBlock';
import { VideoBlockDef } from './VideoBlock';
import { GrammarBlockDef } from './GrammarMaterialBlock';

// Register blocks at module load
registerBlock(TextBlockDef);
registerBlock(ImageBlockDef);
registerBlock(AudioBlockDef);
registerBlock(VideoBlockDef);
registerBlock(GrammarBlockDef);
