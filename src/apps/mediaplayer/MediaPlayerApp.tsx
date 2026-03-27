/**
 * Media Player — audio/video playback with playlist, controls, and file picker.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { ToolbarButton, Toolbar, EmptyState } from '@/ui/components';
import { Icon } from '@/ui/icons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Track {
  id: string;
  name: string;
  type: 'audio' | 'video';
  src: string;
  duration: number;
  file?: File;
}

type RepeatMode = 'none' | 'one' | 'all';
type SortField = 'name' | 'type' | 'duration';

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Media Player App
// ---------------------------------------------------------------------------

export default function MediaPlayerApp() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('none');
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [visualizerMode, setVisualizerMode] = useState(false);

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTrack = tracks.find((t) => t.id === activeTrackId) ?? null;
  const isVideo = activeTrack?.type === 'video';

  // ---------------------------------------------------------------------------
  // Sorted / filtered playlist
  // ---------------------------------------------------------------------------

  const sortedTracks = [...tracks].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'type': cmp = a.type.localeCompare(b.type); break;
      case 'duration': cmp = a.duration - b.duration; break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const filteredTracks = searchQuery
    ? sortedTracks.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : sortedTracks;

  // ---------------------------------------------------------------------------
  // File loading
  // ---------------------------------------------------------------------------

  const loadFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) =>
      f.type.startsWith('audio/') || f.type.startsWith('video/'),
    );
    if (fileArray.length === 0) return;

    const newTracks: Track[] = fileArray.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^/.]+$/, ''),
      type: file.type.startsWith('video/') ? 'video' as const : 'audio' as const,
      src: URL.createObjectURL(file),
      duration: 0,
      file,
    }));

    setTracks((prev) => [...prev, ...newTracks]);
    if (!activeTrackId && newTracks.length > 0) {
      setActiveTrackId(newTracks[0].id);
    }
  }, [activeTrackId]);

  // ---------------------------------------------------------------------------
  // Playback controls
  // ---------------------------------------------------------------------------

  const playTrack = useCallback(
    (trackId?: string) => {
      const id = trackId ?? activeTrackId;
      if (!id) return;
      setActiveTrackId(id);
      setIsPlaying(true);
      // mediaRef play is handled by useEffect
    },
    [activeTrackId],
  );

  const togglePlay = useCallback(() => {
    if (!activeTrackId && tracks.length > 0) {
      playTrack(tracks[0].id);
      return;
    }
    setIsPlaying((prev) => !prev);
  }, [activeTrackId, tracks, playTrack]);

  const seek = useCallback((time: number) => {
    setCurrentTime(time);
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
    }
  }, []);

  const changeVolume = useCallback((v: number) => {
    setVolume(v);
    setIsMuted(v === 0);
    if (mediaRef.current) {
      mediaRef.current.volume = v;
      mediaRef.current.muted = v === 0;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (mediaRef.current) mediaRef.current.muted = next;
      return next;
    });
  }, []);

  const skipNext = useCallback(() => {
    if (tracks.length === 0) return;
    const idx = tracks.findIndex((t) => t.id === activeTrackId);
    if (shuffle) {
      const rand = Math.floor(Math.random() * tracks.length);
      playTrack(tracks[rand].id);
    } else if (idx < tracks.length - 1) {
      playTrack(tracks[idx + 1].id);
    } else if (repeat === 'all') {
      playTrack(tracks[0].id);
    } else {
      setIsPlaying(false);
    }
  }, [tracks, activeTrackId, shuffle, repeat, playTrack]);

  const skipPrev = useCallback(() => {
    if (tracks.length === 0) return;
    // If more than 3 seconds in, restart track
    if (currentTime > 3) {
      seek(0);
      return;
    }
    const idx = tracks.findIndex((t) => t.id === activeTrackId);
    if (idx > 0) {
      playTrack(tracks[idx - 1].id);
    } else if (repeat === 'all') {
      playTrack(tracks[tracks.length - 1].id);
    } else {
      seek(0);
    }
  }, [tracks, activeTrackId, currentTime, repeat, playTrack, seek]);

  const removeTrack = useCallback(
    (trackId: string) => {
      setTracks((prev) => {
        const next = prev.filter((t) => t.id !== trackId);
        if (trackId === activeTrackId) {
          if (next.length > 0) {
            const idx = prev.findIndex((t) => t.id === trackId);
            const newIdx = Math.min(idx, next.length - 1);
            playTrack(next[newIdx].id);
          } else {
            setActiveTrackId(null);
            setIsPlaying(false);
          }
        }
        return next;
      });
    },
    [activeTrackId, playTrack],
  );

  const clearPlaylist = useCallback(() => {
    setIsPlaying(false);
    setActiveTrackId(null);
    setCurrentTime(0);
    setDuration(0);
    setTracks([]);
  }, []);

  // ---------------------------------------------------------------------------
  // Media element sync
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !activeTrack) return;

    media.src = activeTrack.src;
    media.load();

    if (isPlaying) {
      media.play().catch(() => setIsPlaying(false));
    } else {
      media.pause();
    }
  }, [activeTrackId, activeTrack]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    if (isPlaying) {
      media.play().catch(() => setIsPlaying(false));
    } else {
      media.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.volume = volume;
    media.muted = isMuted;
  }, [volume, isMuted]);

  // Track ended → next
  const handleEnded = useCallback(() => {
    if (repeat === 'one') {
      seek(0);
      setIsPlaying(true);
    } else {
      skipNext();
    }
  }, [repeat, skipNext, seek]);

  const handleTimeUpdate = useCallback(() => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (mediaRef.current) {
      const dur = mediaRef.current.duration;
      setDuration(dur);
      // Update track duration
      if (activeTrackId) {
        setTracks((prev) =>
          prev.map((t) => (t.id === activeTrackId ? { ...t, duration: dur } : t)),
        );
      }
    }
  }, [activeTrackId]);

  // ---------------------------------------------------------------------------
  // Audio visualizer
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!visualizerMode || !isPlaying || !mediaRef.current) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    const media = mediaRef.current;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const audioCtx = audioContextRef.current;

    if (!sourceRef.current) {
      try {
        sourceRef.current = audioCtx.createMediaElementSource(media);
        analyserRef.current = audioCtx.createAnalyser();
        analyserRef.current.fftSize = 256;
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioCtx.destination);
      } catch {
        // Already connected
      }
    }

    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        const hue = (i / bufferLength) * 280;

        ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.8)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    draw();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [visualizerMode, isPlaying]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          seek(Math.min(duration, currentTime + 5));
          break;
        case 'ArrowLeft':
          seek(Math.max(0, currentTime - 5));
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(Math.min(1, volume + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(Math.max(0, volume - 0.05));
          break;
        case 'n':
          skipNext();
          break;
        case 'p':
          skipPrev();
          break;
        case 'm':
          toggleMute();
          break;
        case 'l':
          setShowPlaylist((v) => !v);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, seek, currentTime, duration, volume, skipNext, skipPrev, toggleMute, changeVolume]);

  // ---------------------------------------------------------------------------
  // Drag and drop
  // ---------------------------------------------------------------------------

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        loadFiles(e.dataTransfer.files);
      }
    },
    [loadFiles],
  );

  // ---------------------------------------------------------------------------
  // Repeat mode cycle
  // ---------------------------------------------------------------------------

  const cycleRepeat = useCallback(() => {
    setRepeat((prev) => {
      if (prev === 'none') return 'all';
      if (prev === 'all') return 'one';
      return 'none';
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (tracks.length === 0) {
    return (
      <div
        className="h-full bg-[hsl(var(--surface))]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <EmptyState
          icon={<Icon name="play" size={40} />}
          title="Media Player"
          description="Drop audio or video files here"
          action={
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-[hsl(var(--accent))] text-white rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              Open Files
            </button>
          }
          className="h-full"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && loadFiles(e.target.files)}
        />
        <div className="text-xs text-[hsl(var(--text-secondary))]/60 text-center mt-2 pb-4">
          Space: play/pause, Arrows: seek/volume, N/P: skip, M: mute
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main view
  // ---------------------------------------------------------------------------

  return (
    <div
      className="flex flex-col h-full bg-[hsl(var(--surface))] text-[hsl(var(--text))]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && loadFiles(e.target.files)}
      />

      {/* Visualization / Video area */}
      <div className="relative flex-1 bg-black min-h-0 overflow-hidden">
        {/* Audio visualizer (shown for audio tracks when enabled) */}
        {visualizerMode && !isVideo && (
          <canvas
            ref={canvasRef}
            width={800}
            height={200}
            className="w-full h-full object-contain"
          />
        )}

        {/* Video element */}
        {isVideo ? (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            className="w-full h-full object-contain bg-black"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            playsInline
          />
        ) : (
          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
          />
        )}

        {/* Now playing overlay for audio */}
        {!isVideo && !visualizerMode && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {isPlaying ? (
                <div className="flex items-end justify-center gap-1 h-16 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 bg-[hsl(var(--accent))] rounded-t animate-equalizer"
                      style={{
                        animationDelay: `${i * 0.15}s`,
                        height: '100%',
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--surface-secondary))] flex items-center justify-center mb-4 mx-auto">
                  <Icon name="play" size={32} />
                </div>
              )}
              <p className="text-white text-lg font-medium truncate max-w-xs">{activeTrack?.name}</p>
              <p className="text-white/60 text-sm">Now playing</p>
            </div>
          </div>
        )}
      </div>

      {/* Seek bar */}
      <div className="px-4 pt-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[hsl(var(--text-secondary))] tabular-nums w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            className="flex-1 h-1.5 accent-[hsl(var(--accent))] cursor-pointer"
            step={0.1}
          />
          <span className="text-xs text-[hsl(var(--text-secondary))] tabular-nums w-10">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <Toolbar className="justify-center gap-2 bg-transparent border-b-0">
        <ToolbarButton onClick={() => setShuffle((v) => !v)} title="Shuffle" active={shuffle}>
          <Icon name="shuffle" />
        </ToolbarButton>

        <ToolbarButton onClick={skipPrev} title="Previous (P)">
          <Icon name="skip-prev" />
        </ToolbarButton>

        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-[hsl(var(--accent))] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? <Icon name="pause" size={20} /> : <Icon name="play" size={20} />}
        </button>

        <ToolbarButton onClick={skipNext} title="Next (N)">
          <Icon name="skip-next" />
        </ToolbarButton>

        <ToolbarButton onClick={cycleRepeat} title={`Repeat: ${repeat}`} active={repeat !== 'none'}>
          <Icon name={repeat === 'one' ? 'repeat-one' : 'repeat'} />
        </ToolbarButton>
      </Toolbar>

      {/* Bottom bar: volume + playlist toggle */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--surface-secondary))] border-t border-[hsl(var(--border))] shrink-0">
        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{activeTrack?.name ?? 'No track selected'}</p>
          <p className="text-xs text-[hsl(var(--text-secondary))]">
            {activeTrack ? `${tracks.findIndex((t) => t.id === activeTrackId) + 1} of ${tracks.length}` : 'Add files to start'}
          </p>
        </div>

        {/* Visualizer toggle (audio only) */}
        {!isVideo && (
          <ToolbarButton onClick={() => setVisualizerMode((v) => !v)} title="Visualizer" active={visualizerMode}>
            <Icon name="visualizer" />
          </ToolbarButton>
        )}

        {/* Volume */}
        <div className="flex items-center gap-1.5">
          <button onClick={toggleMute} className="p-1 text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text))] transition-colors" title="Mute (M)">
            {isMuted || volume === 0 ? <Icon name="volume-mute" /> : volume < 0.5 ? <Icon name="volume-low" /> : <Icon name="volume" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            className="w-20 h-1 accent-[hsl(var(--accent))] cursor-pointer"
          />
        </div>

        {/* Playlist toggle */}
        <ToolbarButton onClick={() => setShowPlaylist((v) => !v)} title="Playlist (L)" active={showPlaylist}>
          <Icon name="menu" />
        </ToolbarButton>
      </div>

      {/* Playlist panel */}
      {showPlaylist && (
        <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--surface-secondary))] max-h-[40%] flex flex-col shrink-0">
          {/* Playlist header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[hsl(var(--border))]">
            <input
              type="text"
              placeholder="Search tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-2 py-1 text-sm rounded bg-[hsl(var(--surface))] border border-[hsl(var(--border))] text-[hsl(var(--text))] placeholder-[hsl(var(--text-secondary))] focus:outline-none focus:border-[hsl(var(--accent))]"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 text-xs text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/10 rounded transition-colors"
            >
              + Add
            </button>
            <button
              onClick={clearPlaylist}
              className="px-2 py-1 text-xs text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 rounded transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Track list */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {filteredTracks.length === 0 ? (
              <p className="text-sm text-[hsl(var(--text-secondary))] text-center py-4">
                {searchQuery ? 'No matches' : 'No tracks'}
              </p>
            ) : (
              <ul className="divide-y divide-[hsl(var(--border))]">
                {filteredTracks.map((track) => (
                  <li
                    key={track.id}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer group transition-colors ${
                      track.id === activeTrackId
                        ? 'bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]'
                        : 'hover:bg-[hsl(var(--surface))]/80'
                    }`}
                    onClick={() => playTrack(track.id)}
                    onDoubleClick={() => { setActiveTrackId(track.id); setIsPlaying(true); }}
                  >
                    <span className="w-5 text-center shrink-0">
                      {track.id === activeTrackId && isPlaying ? (
                        <span className="inline-block w-2 h-3 bg-[hsl(var(--accent))] rounded-sm animate-pulse" />
                      ) : (
                        <span className="text-xs text-[hsl(var(--text-secondary))]">
                          <Icon name={track.type === 'video' ? 'video' : 'music'} size="xs" />
                        </span>
                      )}
                    </span>
                    <span className="flex-1 text-sm truncate">{track.name}</span>
                    <span className="text-xs text-[hsl(var(--text-secondary))] tabular-nums shrink-0">
                      {formatDuration(track.duration)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }}
                      className="opacity-0 group-hover:opacity-100 text-xs text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--destructive))] transition-all px-1"
                    >
                      x
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
