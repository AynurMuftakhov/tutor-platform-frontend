import { useEffect, useRef, useState } from 'react';

export function useMicLevel(stream?: MediaStream) {
  const [level, setLevel] = useState(0);
  const raf = useRef<number>();

  useEffect(() => {
    if (!stream) return;
    const AudioCtx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    const data = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      setLevel(Math.min(1, rms * 3));
      raf.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      try { source.disconnect(); } catch (err) { /* ignore cleanup error */ }
      try { analyser.disconnect(); } catch (err) { /* ignore cleanup error */ }
      try { ctx.close(); } catch (err) { /* ignore cleanup error */ }
    };
  }, [stream]);

  return level;
}
