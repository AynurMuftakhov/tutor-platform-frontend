// Empty module shim for browser builds where certain Node/Electron-only deps should be ignored.
// Export a minimal object to satisfy imports without side effects.
const empty: any = {};
export default empty;
export const noop = null as unknown as () => void;
