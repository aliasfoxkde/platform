/**
 * Image Viewer — zoom, pan, gallery mode, rotate, flip.
 * Supports drag-and-drop and file picker.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImageItem {
  id: string;
  name: string;
  src: string;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}

// ---------------------------------------------------------------------------
// Image Viewer App
// ---------------------------------------------------------------------------

export default function ImageViewerApp() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showGallery, setShowGallery] = useState(false);
  const [fitMode, setFitMode] = useState<'fit' | 'fill' | 'original'>('fit');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);

  const activeImage = images[activeIndex] ?? null;

  // ---------------------------------------------------------------------------
  // File loading
  // ---------------------------------------------------------------------------

  const loadFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    const newImages: ImageItem[] = fileArray.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      src: URL.createObjectURL(file),
      rotation: 0,
      flipH: false,
      flipV: false,
    }));

    setImages((prev) => [...prev, ...newImages]);
    if (images.length === 0) {
      setActiveIndex(0);
    }
  }, [images.length]);

  // ---------------------------------------------------------------------------
  // Drag and drop
  // ---------------------------------------------------------------------------

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      if (e.dataTransfer.files.length > 0) {
        loadFiles(e.dataTransfer.files);
      }
    },
    [loadFiles],
  );

  // ---------------------------------------------------------------------------
  // Zoom & Pan
  // ---------------------------------------------------------------------------

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(0.1, Math.min(10, prev + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [zoom, pan]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    },
    [isPanning, panStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Reset pan when zoom changes to 1 or image changes
  useEffect(() => {
    if (zoom <= 1) setPan({ x: 0, y: 0 });
  }, [zoom]);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [activeIndex]);

  // ---------------------------------------------------------------------------
  // Transforms
  // ---------------------------------------------------------------------------

  const rotate = useCallback((direction: 'cw' | 'ccw') => {
    setImages((prev) =>
      prev.map((img, i) =>
        i === activeIndex
          ? { ...img, rotation: (img.rotation + (direction === 'cw' ? 90 : -90) + 360) % 360 }
          : img,
      ),
    );
  }, [activeIndex]);

  const flipH = useCallback(() => {
    setImages((prev) =>
      prev.map((img, i) =>
        i === activeIndex ? { ...img, flipH: !img.flipH } : img,
      ),
    );
  }, [activeIndex]);

  const flipV = useCallback(() => {
    setImages((prev) =>
      prev.map((img, i) =>
        i === activeIndex ? { ...img, flipV: !img.flipV } : img,
      ),
    );
  }, [activeIndex]);

  const resetTransforms = useCallback(() => {
    setImages((prev) =>
      prev.map((img, i) =>
        i === activeIndex ? { ...img, rotation: 0, flipH: false, flipV: false } : img,
      ),
    );
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [activeIndex]);

  const removeImage = useCallback(() => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== activeIndex);
      return next;
    });
    setActiveIndex((prev) => Math.max(0, prev >= images.length - 1 ? Math.max(0, images.length - 2) : prev));
  }, [activeIndex, images.length]);

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case 'ArrowLeft':
          setActiveIndex((prev) => Math.max(0, prev - 1));
          break;
        case 'ArrowRight':
          setActiveIndex((prev) => Math.min(images.length - 1, prev + 1));
          break;
        case '+':
        case '=':
          setZoom((prev) => Math.min(10, prev + 0.25));
          break;
        case '-':
          setZoom((prev) => Math.max(0.1, prev - 0.25));
          break;
        case '0':
          setZoom(1);
          setPan({ x: 0, y: 0 });
          break;
        case 'r':
          rotate('cw');
          break;
        case 'g':
          setShowGallery((prev) => !prev);
          break;
        case 'Delete':
          removeImage();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, rotate, removeImage]);

  // ---------------------------------------------------------------------------
  // Compute image style
  // ---------------------------------------------------------------------------

  const getImageStyle = (): React.CSSProperties => {
    if (!activeImage) return {};

    const scaleX = activeImage.flipH ? -1 : 1;
    const scaleY = activeImage.flipV ? -1 : 1;

    let objectFit: React.CSSProperties['objectFit'] = 'contain';
    let width: React.CSSProperties['width'] = '100%';
    let height: React.CSSProperties['height'] = '100%';

    if (fitMode === 'fill') {
      objectFit = 'cover';
    } else if (fitMode === 'original' || zoom !== 1) {
      objectFit = 'none';
      width = 'auto';
      height = 'auto';
    }

    return {
      objectFit,
      width,
      height,
      maxWidth: fitMode === 'original' ? 'none' : '100%',
      maxHeight: fitMode === 'original' ? 'none' : '100%',
      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom * scaleX}, ${zoom * scaleY}) rotate(${activeImage.rotation}deg)`,
      transition: isPanning ? 'none' : 'transform 0.15s ease',
      cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
      imageRendering: zoom > 2 ? 'pixelated' : 'auto',
    };
  };

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (images.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full bg-[hsl(var(--surface))] text-[hsl(var(--text-secondary))] gap-4 select-none"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="w-20 h-20 rounded-2xl bg-[hsl(var(--surface-secondary))] flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15L16 10L5 21" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-[hsl(var(--text))]">Image Viewer</p>
          <p className="text-sm mt-1">Drop images here or click to open</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-[hsl(var(--accent))] text-white rounded-lg text-sm hover:opacity-90 transition-opacity"
        >
          Open Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && loadFiles(e.target.files)}
        />
        <div className="text-xs text-[hsl(var(--text-secondary))]/60 mt-2">
          Keyboard: Arrow keys navigate, +/- zoom, R rotate, G gallery
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main view
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--surface))] text-[hsl(var(--text))]">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[hsl(var(--surface-secondary))] border-b border-[hsl(var(--border))] shrink-0 flex-wrap">
        <ToolBtn onClick={() => fileInputRef.current?.click()} title="Open files">
          <FolderIcon />
        </ToolBtn>

        <div className="w-px h-5 bg-[hsl(var(--border))] mx-1" />

        <ToolBtn onClick={() => setZoom((z) => Math.min(10, z + 0.25))} title="Zoom in (+)">
          <ZoomInIcon />
        </ToolBtn>
        <span className="text-xs text-[hsl(var(--text-secondary))] w-12 text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <ToolBtn onClick={() => setZoom((z) => Math.max(0.1, z - 0.25))} title="Zoom out (-)">
          <ZoomOutIcon />
        </ToolBtn>
        <ToolBtn onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset zoom (0)">
          <ZoomFitIcon />
        </ToolBtn>

        <div className="w-px h-5 bg-[hsl(var(--border))] mx-1" />

        <ToolBtn onClick={() => rotate('cw')} title="Rotate clockwise (R)">
          <RotateCWIcon />
        </ToolBtn>
        <ToolBtn onClick={() => rotate('ccw')} title="Rotate counter-clockwise">
          <RotateCCWIcon />
        </ToolBtn>
        <ToolBtn onClick={flipH} title="Flip horizontal">
          <FlipHIcon />
        </ToolBtn>
        <ToolBtn onClick={flipV} title="Flip vertical">
          <FlipVIcon />
        </ToolBtn>

        <div className="w-px h-5 bg-[hsl(var(--border))] mx-1" />

        <ToolBtn onClick={resetTransforms} title="Reset all transforms">
          <ResetIcon />
        </ToolBtn>
        <ToolBtn onClick={removeImage} title="Delete image (Delete)">
          <TrashIcon />
        </ToolBtn>

        <div className="flex-1" />

        <div className="flex items-center gap-0.5 bg-[hsl(var(--surface))] rounded-md p-0.5 text-xs">
          {(['fit', 'fill', 'original'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFitMode(mode)}
              className={`px-2 py-0.5 rounded transition-colors ${
                fitMode === mode
                  ? 'bg-[hsl(var(--accent))] text-white'
                  : 'text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text))]'
              }`}
            >
              {mode === 'fit' ? 'Fit' : mode === 'fill' ? 'Fill' : '1:1'}
            </button>
          ))}
        </div>

        <ToolBtn onClick={() => setShowGallery((v) => !v)} title="Gallery (G)" active={showGallery}>
          <GalleryIcon />
        </ToolBtn>
      </div>

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Drop zone overlay */}
        <div
          className="absolute inset-0 z-30"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Hidden file input for additional images */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && loadFiles(e.target.files)}
          />
        </div>

        {/* Image container */}
        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center bg-[hsl(var(--muted))]/30 overflow-hidden"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {activeImage && (
            <img
              ref={imageRef}
              src={activeImage.src}
              alt={activeImage.name}
              className="max-w-full max-h-full select-none pointer-events-none"
              style={getImageStyle()}
              draggable={false}
            />
          )}
        </div>

        {/* Gallery sidebar */}
        {showGallery && (
          <div className="absolute top-0 right-0 bottom-0 w-48 bg-[hsl(var(--surface))] border-l border-[hsl(var(--border))] z-20 flex flex-col shadow-lg">
            <div className="px-3 py-2 text-xs font-medium text-[hsl(var(--text-secondary))] border-b border-[hsl(var(--border))]">
              {images.length} image{images.length !== 1 ? 's' : ''}
            </div>
            <div className="flex-1 overflow-y-auto p-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveIndex(i)}
                    className={`relative aspect-square rounded overflow-hidden border-2 transition-colors ${
                      i === activeIndex
                        ? 'border-[hsl(var(--accent))] shadow-md'
                        : 'border-transparent hover:border-[hsl(var(--border))]'
                    }`}
                    title={img.name}
                  >
                    <img
                      src={img.src}
                      alt={img.name}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors z-10 backdrop-blur-sm"
            >
              <ChevronLeftIcon />
            </button>
            <button
              onClick={() => setActiveIndex((i) => Math.min(images.length - 1, i + 1))}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors z-10 backdrop-blur-sm"
            >
              <ChevronRightIcon />
            </button>
          </>
        )}

        {/* Image info overlay */}
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/50 text-white text-xs backdrop-blur-sm z-10">
          {activeIndex + 1} / {images.length} — {activeImage?.name}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

function ToolBtn({
  children,
  title,
  onClick,
  active,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-[hsl(var(--surface-secondary))] text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text))] transition-colors cursor-pointer ${
        active ? 'text-[hsl(var(--accent))] bg-[hsl(var(--accent))]/10' : ''
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 3.5H6.5L8 5H14.5V12.5H1.5V3.5Z" />
    </svg>
  );
}

function ZoomInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
      <path d="M5 7H9" />
      <path d="M7 5V9" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
      <path d="M5 7H9" />
    </svg>
  );
}

function ZoomFitIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6V2H6" />
      <path d="M10 2H14V6" />
      <path d="M14 10V14H10" />
      <path d="M6 14H2V10" />
      <rect x="5" y="5" width="6" height="6" rx="1" />
    </svg>
  );
}

function RotateCWIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" />
      <path d="M10 2.5H13.5V6" />
    </svg>
  );
}

function RotateCCWIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 8A5.5 5.5 0 1 1 8 13.5" />
      <path d="M6 13.5H2.5V10" />
    </svg>
  );
}

function FlipHIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2V14" strokeDasharray="2 2" />
      <path d="M4 5L2 8L4 11" />
      <path d="M12 5L14 8L12 11" />
    </svg>
  );
}

function FlipVIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8H14" strokeDasharray="2 2" />
      <path d="M5 4L8 2L11 4" />
      <path d="M5 12L8 14L11 12" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M4 8H12" />
      <path d="M8 4V12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4H13" />
      <path d="M5 4V2.5H11V4" />
      <path d="M4 4L4.5 13H11.5L12 4" />
      <path d="M6.5 6.5V11" />
      <path d="M9.5 6.5V11" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 12L6 8L10 4" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4L10 8L6 12" />
    </svg>
  );
}
