// Adapter to replace webpack's worker-loader import used by agora-rte-sdk.
// The SDK expects `new (defaultExport)()`; we return a Worker instance in the constructor.
// Use Vite-recognized pattern so the worker is fully bundled with dependencies.

export default class AgoraRteWorker {
  constructor() {
    const workerUrl = new URL('./agora-worker-entry.ts', import.meta.url);
    // Use a module worker because our local entry uses ESM `import` to pull upstream code.
    // Vite will bundle the worker and its deps, avoiding bare-import resolution errors.
    // `name` is optional but helps in DevTools.
    // Cast options loosely to avoid TS friction across DOM lib versions.
    return new Worker(workerUrl, { type: 'module', name: 'agora-rte-worker' } as any);
  }
}
