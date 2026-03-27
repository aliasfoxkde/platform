import { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Toolbar, ToolbarButton, EmptyState } from '@/ui/components';
import { Icon } from '@/ui/icons';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PDFState {
  numPages: number;
  currentPage: number;
  scale: number;
  rotation: number;
  fileName: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PDFViewerApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderingRef = useRef(false);

  const [state, setState] = useState<PDFState>({
    numPages: 0,
    currentPage: 1,
    scale: 1.0,
    rotation: 0,
    fileName: '',
  });
  const [error, setError] = useState<string | null>(null);

  // Render current page
  const renderPage = useCallback(
    async (num?: number) => {
      const page = num ?? state.currentPage;
      if (!pdfDocRef.current || !canvasRef.current || renderingRef.current) return;

      renderingRef.current = true;

      try {
        const pdf = pdfDocRef.current;
        const pageObj = await pdf.getPage(page);
        const viewport = pageObj.getViewport({ scale: state.scale, rotation: state.rotation });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
        const renderContext = context as unknown as { setTransform: (m: number[]) => void };
        if (transform) renderContext.setTransform(transform);

        await pageObj.render({ canvasContext: context, viewport } as any);
        setState((s) => ({ ...s, currentPage: page }));
      } catch (err) {
        setError(`Failed to render page: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        renderingRef.current = false;
      }
    },
    [state.currentPage, state.scale, state.rotation],
  );

  // Load PDF file
  const loadPDF = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        pdfDocRef.current = pdf;
        setState((s) => ({
          ...s,
          numPages: pdf.numPages,
          currentPage: 1,
          fileName: file.name,
        }));
      } catch (err) {
        setError(`Failed to load PDF: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [],
  );

  // Re-render on state change
  useEffect(() => {
    if (pdfDocRef.current && state.numPages > 0) {
      renderPage();
    }
  }, [state.currentPage, state.scale, state.rotation, renderPage]);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadPDF(file);
  };

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && file.type === 'application/pdf') {
        loadPDF(file);
      }
    },
    [loadPDF],
  );

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const goToPage = (page: number) => {
    if (page >= 1 && page <= state.numPages) {
      setState((s) => ({ ...s, currentPage: page }));
    }
  };

  const zoomIn = () => setState((s) => ({ ...s, scale: Math.min(s.scale + 0.25, 4) }));
  const zoomOut = () => setState((s) => ({ ...s, scale: Math.max(s.scale - 0.25, 0.25) }));
  const rotate = () => setState((s) => ({ ...s, rotation: (s.rotation + 90) % 360 }));

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-[hsl(var(--background))] text-sm"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Toolbar */}
      {state.numPages > 0 && (
        <Toolbar>
          <ToolbarButton onClick={() => goToPage(state.currentPage - 1)} disabled={state.currentPage <= 1} title="Previous page">
            <Icon name="chevron-left" size={14} />
          </ToolbarButton>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {state.currentPage} / {state.numPages}
          </span>
          <ToolbarButton onClick={() => goToPage(state.currentPage + 1)} disabled={state.currentPage >= state.numPages} title="Next page">
            <Icon name="chevron-right" size={14} />
          </ToolbarButton>

          <div className="mx-1 h-4 w-px bg-[hsl(var(--border))]" />

          <ToolbarButton onClick={zoomOut} title="Zoom out">
            <Icon name="zoom-out" size={14} />
          </ToolbarButton>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {Math.round(state.scale * 100)}%
          </span>
          <ToolbarButton onClick={zoomIn} title="Zoom in">
            <Icon name="zoom-in" size={14} />
          </ToolbarButton>

          <div className="mx-1 h-4 w-px bg-[hsl(var(--border))]" />

          <ToolbarButton onClick={rotate} title="Rotate">
            <Icon name="rotate-cw" size={14} />
          </ToolbarButton>

          <div className="flex-1" />

          {state.fileName && (
            <span className="truncate text-xs text-[hsl(var(--muted-foreground))]" title={state.fileName}>
              {state.fileName}
            </span>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-md bg-[hsl(var(--accent))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--accent-foreground))] hover:opacity-90"
          >
            Open
          </button>
        </Toolbar>
      )}

      {/* Content */}
      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        {error ? (
          <div className="text-center">
            <div className="text-3xl mb-2">⚠️</div>
            <p className="text-xs text-[hsl(var(--destructive))]">{error}</p>
          </div>
        ) : state.numPages > 0 ? (
          <canvas ref={canvasRef} className="shadow-lg" />
        ) : (
          <div
            className="flex h-full w-full cursor-pointer items-center justify-center"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <EmptyState
              icon={<Icon name="file-text" size={28} className="text-[hsl(var(--muted-foreground))]" />}
              title="Open a PDF file"
              description="Drag and drop or click to browse"
            />
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
