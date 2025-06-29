// Type definitions for YouTube IFrame Player API
interface YT {
  Player: {
    new (
      elementId: string,
      options: {
        videoId?: string;
        playerVars?: {
          start?: number;
          controls?: number;
          disablekb?: number;
          rel?: number;
          [key: string]: any;
        };
        events?: {
          onReady?: (event: any) => void;
          onStateChange?: (event: YT.OnStateChangeEvent) => void;
          onError?: (event: any) => void;
          [key: string]: any;
        };
      }
    ): YT.Player;
  };
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare namespace YT {
  interface Player {
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    getCurrentTime(): number;
    getDuration(): number;
    getPlayerState(): number;
    destroy(): void;
  }

  interface OnStateChangeEvent {
    data: number;
    target: Player;
  }
}

interface Window {
  YT?: YT;
  onYouTubeIframeAPIReady?: () => void;
}