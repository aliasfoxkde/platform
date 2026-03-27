/**
 * Image Viewer — zoom, pan, gallery mode, rotate, flip.
 * Supports drag-and-drop and file picker.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Toolbar, ToolbarButton, EmptyState } from '@/ui/components';
import { Icon } from '@/ui/icons';

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
        <EmptyState
          icon={<Icon name="image" size={40} />}
          title="Image Viewer"
          description="Drop images here or click to open"
          action={
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-[hsl(var(--accent))] text-white rounded-lg text-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              Open Files
            </button>
          }
        />
        <div className="text-xs text-[hsl(var(--text-secondary))]/60 mt-2">
          Keyboard: Arrow keys navigate, +/- zoom, R rotate, G gallery
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && loadFiles(e.target.files)}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main view
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--surface))] text-[hsl(var(--text))]">
      {/* Toolbar */}
      <Toolbar className="flex-wrap">
        <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Open files">
          <Icon name="folder" />
        </ToolbarButton>

        <div className="w-px h-5 bg-[hsl(var(--border))] mx-1" />

        <ToolbarButton onClick={() => setZoom((z) => Math.min(10, z + 0.25))} title="Zoom in (+)">
          <Icon name="zoom-in" />
        </ToolbarButton>
        <span className="text-xs text-[hsl(var(--text-secondary))] w-12 text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <ToolbarButton onClick={() => setZoom((z) => Math.max(0.1, z - 0.25))} title="Zoom out (-)">
          <Icon name="zoom-out" />
        </ToolbarButton>
        <ToolbarButton onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset zoom (0)">
          <Icon name="zoom-fit" />
        </ToolbarButton>

        <div className="w-px h-5 bg-[hsl(var(--border))] mx-1" />

        <ToolbarButton onClick={() => rotate('cw')} title="Rotate clockwise (R)">
          <Icon name="rotate-cw" />
        </ToolbarButton>
        <ToolbarButton onClick={() => rotate('ccw')} title="Rotate counter-clockwise">
          <Icon name="rotate-ccw" />
        </ToolbarButton>
        <ToolbarButton onClick={flipH} title="Flip horizontal">
          <Icon name="flip-h" />
        </ToolbarButton>
        <ToolbarButton onClick={flipV} title="Flip vertical">
          <Icon name="flip-v" />
        </ToolbarButton>

        <div className="w-px h-5 bg-[hsl(var(--border))] mx-1" />

        <ToolbarButton onClick={resetTransforms} title="Reset all transforms">
          <Icon name="refresh" />
        </ToolbarButton>
        <ToolbarButton onClick={removeImage} title="Delete image (Delete)">
          <Icon name="trash" />
        </ToolbarButton>

        <div className="flex-1" />

        <div className="flex items-center gap-0.5 bg-[hsl(var(--surface))] rounded-md p-0.5 text-xs">
          {(['fit', 'fill', 'original'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFitMode(mode)}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                fitMode === mode
                  ? 'bg-[hsl(var(--accent))] text-white'
                  : 'text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text))]'
              }`}
            >
              {mode === 'fit' ? 'Fit' : mode === 'fill' ? 'Fill' : '1:1'}
            </button>
          ))}
        </div>

        <ToolbarButton onClick={() => setShowGallery((v) => !v)} title="Gallery (G)" active={showGallery}>
          <Icon name="gallery" />
        </ToolbarButton>
      </Toolbar>

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
              <Icon name="chevron-left" />
            </button>
            <button
              onClick={() => setActiveIndex((i) => Math.min(images.length - 1, i + 1))}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors z-10 backdrop-blur-sm"
            >
              <Icon name="chevron-right" />
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


