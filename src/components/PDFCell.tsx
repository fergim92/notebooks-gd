'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { PDFCell as PDFCellType, PDFPage, MiniCell } from '@/types/notebook';
import { v4 as uuidv4 } from 'uuid';
import MiniNotebook from './MiniNotebook';

// Types for PDF.js - imported dynamically
type PDFDocumentProxy = {
  numPages: number;
  getPage: (num: number) => Promise<PDFPageProxy>;
};

type PDFPageProxy = {
  getViewport: (params: { scale: number }) => { width: number; height: number };
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void>; cancel: () => void };
};

interface Props {
  cell: PDFCellType;
  onUpdate: (cell: Partial<PDFCellType>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

interface Point {
  x: number;
  y: number;
  pressure: number;
}

type BackgroundType = 'blank' | 'grid' | 'lines' | 'dots';

export default function PDFCell({ cell, onUpdate, onDelete, onMoveUp, onMoveDown }: Props) {
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const pdfjsLibRef = useRef<typeof import('pdfjs-dist') | null>(null);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEditingDrawing, setIsEditingDrawing] = useState(false);
  const [color, setColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'highlighter'>('pen');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 1000 });
  const [showAddPageMenu, setShowAddPageMenu] = useState(false);
  const [customPageBackground, setCustomPageBackground] = useState<BackgroundType>('lines');
  const [isPdfLoaded, setIsPdfLoaded] = useState(false);
  const [notesWidth, setNotesWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const lastPoint = useRef<Point | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);

  const currentPage = cell.pages[currentPageIndex];

  // Load PDF.js dynamically
  useEffect(() => {
    const loadPdfJs = async () => {
      if (typeof window === 'undefined') return;

      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      pdfjsLibRef.current = pdfjs;
      setIsPdfLoaded(true);
    };

    loadPdfJs();
  }, []);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Load PDF when cell data changes
  useEffect(() => {
    if (!cell.pdfData || !isPdfLoaded || !pdfjsLibRef.current) return;

    const loadPdf = async () => {
      try {
        const pdfData = atob(cell.pdfData.split(',')[1]);
        const pdfArray = new Uint8Array(pdfData.length);
        for (let i = 0; i < pdfData.length; i++) {
          pdfArray[i] = pdfData.charCodeAt(i);
        }

        const doc = await pdfjsLibRef.current!.getDocument({ data: pdfArray }).promise;
        setPdfDoc(doc as unknown as PDFDocumentProxy);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };

    loadPdf();
  }, [cell.pdfData, isPdfLoaded]);

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !currentPage) return;

    const renderPage = async () => {
      const pdfCanvas = pdfCanvasRef.current;
      const drawingCanvas = drawingCanvasRef.current;
      if (!pdfCanvas || !drawingCanvas) return;

      const pdfCtx = pdfCanvas.getContext('2d');
      const drawingCtx = drawingCanvas.getContext('2d');
      if (!pdfCtx || !drawingCtx) return;

      // Cancel any previous render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      if (currentPage.isCustomPage) {
        // Custom page - draw background
        const bg = isDarkMode ? '#1f2937' : '#ffffff';
        const grid = isDarkMode ? '#374151' : '#e5e7eb';
        const gridSize = 20;

        pdfCtx.fillStyle = bg;
        pdfCtx.fillRect(0, 0, pdfCanvas.width, pdfCanvas.height);

        switch (customPageBackground) {
          case 'grid':
            pdfCtx.strokeStyle = grid;
            pdfCtx.lineWidth = 1;
            for (let x = gridSize; x < pdfCanvas.width; x += gridSize) {
              pdfCtx.beginPath();
              pdfCtx.moveTo(x, 0);
              pdfCtx.lineTo(x, pdfCanvas.height);
              pdfCtx.stroke();
            }
            for (let y = gridSize; y < pdfCanvas.height; y += gridSize) {
              pdfCtx.beginPath();
              pdfCtx.moveTo(0, y);
              pdfCtx.lineTo(pdfCanvas.width, y);
              pdfCtx.stroke();
            }
            break;
          case 'lines':
            pdfCtx.strokeStyle = grid;
            pdfCtx.lineWidth = 1;
            for (let y = gridSize; y < pdfCanvas.height; y += gridSize) {
              pdfCtx.beginPath();
              pdfCtx.moveTo(0, y);
              pdfCtx.lineTo(pdfCanvas.width, y);
              pdfCtx.stroke();
            }
            break;
          case 'dots':
            pdfCtx.fillStyle = grid;
            for (let x = gridSize; x < pdfCanvas.width; x += gridSize) {
              for (let y = gridSize; y < pdfCanvas.height; y += gridSize) {
                pdfCtx.beginPath();
                pdfCtx.arc(x, y, 1.5, 0, Math.PI * 2);
                pdfCtx.fill();
              }
            }
            break;
        }

        // Load custom drawing if exists
        if (currentPage.customDrawingDataUrl) {
          const img = new Image();
          img.onload = () => {
            drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            drawingCtx.drawImage(img, 0, 0);
            saveToHistory();
          };
          img.src = currentPage.customDrawingDataUrl;
        } else {
          drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
          saveToHistory();
        }
      } else if (currentPage.pageNumber !== null) {
        // PDF page
        try {
          const page = await pdfDoc.getPage(currentPage.pageNumber);
          const scale = pdfCanvas.width / page.getViewport({ scale: 1 }).width;
          const viewport = page.getViewport({ scale });

          setCanvasSize({ width: viewport.width, height: viewport.height });
          pdfCanvas.width = viewport.width;
          pdfCanvas.height = viewport.height;
          drawingCanvas.width = viewport.width;
          drawingCanvas.height = viewport.height;

          const renderTask = page.render({
            canvasContext: pdfCtx,
            viewport,
          });

          renderTaskRef.current = renderTask;

          await renderTask.promise;

          // Load drawing overlay if exists
          if (currentPage.drawingDataUrl) {
            const img = new Image();
            img.onload = () => {
              drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
              drawingCtx.drawImage(img, 0, 0);
              saveToHistory();
            };
            img.src = currentPage.drawingDataUrl;
          } else {
            drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            saveToHistory();
          }
        } catch (error) {
          // Ignore cancelled render errors
          if ((error as Error).name !== 'RenderingCancelledException') {
            console.error('Error rendering page:', error);
          }
        }
      }
    };

    renderPage();

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, currentPageIndex, currentPage, isDarkMode, customPageBackground]);

  // Handle resize events
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      // Min 200px, max 600px for notes column
      setNotesWidth(Math.min(600, Math.max(200, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const saveToHistory = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(imageData);
    historyIndexRef.current = historyRef.current.length - 1;

    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    }
  }, []);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = drawingCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: e.pressure || 0.5,
    };
  };

  const drawLine = (from: Point, to: Point, ctx: CanvasRenderingContext2D) => {
    const pressure = (from.pressure + to.pressure) / 2;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = brushSize * 3;
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize * 4;
      ctx.globalAlpha = 0.3;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize * (0.5 + pressure);
      ctx.globalAlpha = 1;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isEditingDrawing) return;
    e.preventDefault();
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    lastPoint.current = getCanvasPoint(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isEditingDrawing) return;
    e.preventDefault();

    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPoint.current) return;

    const currentPoint = getCanvasPoint(e);
    drawLine(lastPoint.current, currentPoint, ctx);
    lastPoint.current = currentPoint;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    lastPoint.current = null;
    saveToHistory();
  };

  const handleSaveDrawing = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas || !currentPage) return;

    const dataUrl = canvas.toDataURL('image/png');
    const updatedPages = [...cell.pages];

    if (currentPage.isCustomPage) {
      updatedPages[currentPageIndex] = {
        ...currentPage,
        customDrawingDataUrl: dataUrl,
      };
    } else {
      updatedPages[currentPageIndex] = {
        ...currentPage,
        drawingDataUrl: dataUrl,
      };
    }

    onUpdate({ pages: updatedPages });
    setIsEditingDrawing(false);
  };

  const handleUpdateNoteCells = (noteCells: MiniCell[]) => {
    if (!currentPage) return;

    const updatedPages = [...cell.pages];
    updatedPages[currentPageIndex] = {
      ...currentPage,
      noteCells,
    };

    onUpdate({ pages: updatedPages });
  };

  const handleClearDrawing = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf' || !pdfjsLibRef.current) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const pdfData = event.target?.result as string;

      try {
        const pdfBinary = atob(pdfData.split(',')[1]);
        const pdfArray = new Uint8Array(pdfBinary.length);
        for (let i = 0; i < pdfBinary.length; i++) {
          pdfArray[i] = pdfBinary.charCodeAt(i);
        }

        const doc = await pdfjsLibRef.current!.getDocument({ data: pdfArray }).promise;
        const numPages = doc.numPages;

        const pages: PDFPage[] = [];
        for (let i = 1; i <= numPages; i++) {
          pages.push({
            id: uuidv4(),
            pageNumber: i,
            drawingDataUrl: '',
            notes: '',
            noteCells: [],
            isCustomPage: false,
          });
        }

        onUpdate({
          pdfData,
          fileName: file.name,
          pages,
          totalOriginalPages: numPages,
        });

        setPdfDoc(doc as unknown as PDFDocumentProxy);
        setCurrentPageIndex(0);
      } catch (error) {
        console.error('Error processing PDF:', error);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const addPageAfterCurrent = (type: 'blank' | 'grid' | 'lines' | 'dots') => {
    const newPage: PDFPage = {
      id: uuidv4(),
      pageNumber: null,
      drawingDataUrl: '',
      notes: '',
      noteCells: [],
      isCustomPage: true,
      customDrawingDataUrl: '',
    };

    const updatedPages = [...cell.pages];
    updatedPages.splice(currentPageIndex + 1, 0, newPage);

    onUpdate({ pages: updatedPages });
    setCurrentPageIndex(currentPageIndex + 1);
    setCustomPageBackground(type);
    setShowAddPageMenu(false);
  };

  const deletePage = () => {
    if (cell.pages.length <= 1) return;

    const updatedPages = cell.pages.filter((_, index) => index !== currentPageIndex);
    onUpdate({ pages: updatedPages });

    if (currentPageIndex >= updatedPages.length) {
      setCurrentPageIndex(updatedPages.length - 1);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isEditingDrawing) return;
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    }
  }, [isEditingDrawing, undo, redo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#000000', '#ffffff'];

  // If no PDF loaded, show upload interface
  if (!cell.pdfData) {
    return (
      <div className="group relative bg-card">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PDF</span>
          <div className="flex-1" />
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onMoveUp} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded" title="Mover arriba">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button onClick={onMoveDown} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded" title="Mover abajo">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button onClick={onDelete} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Eliminar">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <div
          className="p-8 border-2 border-dashed border-border rounded-lg m-3 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-muted-foreground mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-muted-foreground mb-1">Haz clic para subir un PDF</p>
          <p className="text-xs text-muted-foreground">o arrastra y suelta aqui</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="group relative bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/50">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PDF</span>
        <span className="text-xs text-muted-foreground truncate max-w-xs">{cell.fileName}</span>
        <div className="flex-1" />

        {/* Move/Delete buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onMoveUp} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded" title="Mover arriba">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button onClick={onMoveDown} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded" title="Mover abajo">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button onClick={onDelete} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Eliminar">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
            disabled={currentPageIndex === 0}
            className="p-1 hover:bg-muted rounded disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-xs text-muted-foreground">
            {currentPageIndex + 1} / {cell.pages.length}
          </span>
          <button
            onClick={() => setCurrentPageIndex(Math.min(cell.pages.length - 1, currentPageIndex + 1))}
            disabled={currentPageIndex === cell.pages.length - 1}
            className="p-1 hover:bg-muted rounded disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Add page menu */}
        <div className="relative">
          <button
            onClick={() => setShowAddPageMenu(!showAddPageMenu)}
            className="p-1 hover:bg-muted rounded text-green-600 dark:text-green-400"
            title="Agregar pagina"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {showAddPageMenu && (
            <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-10 py-1 min-w-[160px]">
              <p className="px-3 py-1 text-xs text-muted-foreground font-medium">Agregar pagina:</p>
              <button onClick={() => addPageAfterCurrent('blank')} className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-border bg-card" />
                En blanco
              </button>
              <button onClick={() => addPageAfterCurrent('grid')} className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
                  <line x1="5" y1="0" x2="5" y2="16" />
                  <line x1="11" y1="0" x2="11" y2="16" />
                  <line x1="0" y1="5" x2="16" y2="5" />
                  <line x1="0" y1="11" x2="16" y2="11" />
                </svg>
                Cuadricula
              </button>
              <button onClick={() => addPageAfterCurrent('lines')} className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
                  <line x1="0" y1="4" x2="16" y2="4" />
                  <line x1="0" y1="8" x2="16" y2="8" />
                  <line x1="0" y1="12" x2="16" y2="12" />
                </svg>
                Rayado
              </button>
              <button onClick={() => addPageAfterCurrent('dots')} className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="4" cy="4" r="1" />
                  <circle cx="8" cy="4" r="1" />
                  <circle cx="12" cy="4" r="1" />
                  <circle cx="4" cy="8" r="1" />
                  <circle cx="8" cy="8" r="1" />
                  <circle cx="12" cy="8" r="1" />
                </svg>
                Puntos
              </button>
            </div>
          )}
        </div>

        {/* Delete current page */}
        {currentPage?.isCustomPage && (
          <button
            onClick={deletePage}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
            title="Eliminar pagina"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Drawing toolbar */}
      {isEditingDrawing && (
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-b border-border bg-muted/50">
          {/* Tools */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTool('pen')}
              className={`p-1.5 rounded ${tool === 'pen' ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}`}
              title="Lapiz"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => setTool('highlighter')}
              className={`p-1.5 rounded ${tool === 'highlighter' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400' : 'hover:bg-muted'}`}
              title="Resaltador"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`p-1.5 rounded ${tool === 'eraser' ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}`}
              title="Borrador"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M10 11v6m4-6v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
              </svg>
            </button>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Colors */}
          <div className="flex items-center gap-1">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c ? 'border-primary scale-110' : 'border-border'}`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Brush size */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Grosor:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20 h-1 accent-primary"
            />
            <span className="text-xs text-muted-foreground w-4">{brushSize}</span>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Undo/Redo/Clear */}
          <button onClick={undo} className="p-1.5 hover:bg-muted rounded" title="Deshacer (Ctrl+Z)">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button onClick={redo} className="p-1.5 hover:bg-muted rounded" title="Rehacer (Ctrl+Shift+Z)">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
          <button onClick={handleClearDrawing} className="p-1.5 hover:bg-muted rounded text-red-500" title="Limpiar anotaciones">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Main content - Two columns with resizable divider */}
      <div ref={containerRef} className={`flex ${isResizing ? 'select-none' : ''}`}>
        {/* Left column - PDF with drawing overlay */}
        <div className="flex-1 p-1 min-w-0 overflow-hidden">
          <div className="relative w-fit max-w-full mx-auto">
            {/* PDF canvas */}
            <canvas
              ref={pdfCanvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="max-w-full h-auto border border-border rounded block"
            />
            {/* Drawing overlay canvas */}
            <canvas
              ref={drawingCanvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className={`absolute top-0 left-0 max-w-full h-auto border border-transparent rounded ${isEditingDrawing ? 'cursor-crosshair' : 'cursor-pointer'}`}
              style={{ touchAction: 'none', width: '100%', height: '100%' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onClick={() => !isEditingDrawing && setIsEditingDrawing(true)}
            />
          </div>

          {/* Drawing actions */}
          <div className="flex justify-between items-center mt-1">
            {!isEditingDrawing ? (
              <button
                onClick={() => setIsEditingDrawing(true)}
                className="text-xs px-2 py-1 text-primary hover:bg-primary/10 rounded"
              >
                Anotar sobre PDF
              </button>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Dibuja sobre el PDF. Ctrl+Z para deshacer.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditingDrawing(false)}
                    className="px-3 py-1 text-sm text-muted-foreground hover:bg-muted rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveDrawing}
                    className="px-3 py-1 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded"
                  >
                    Guardar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Resizable divider */}
        <div
          className="w-1 bg-border hover:bg-primary cursor-col-resize transition-colors flex-shrink-0"
          onMouseDown={handleResizeStart}
          title="Arrastra para ajustar ancho"
        />

        {/* Right column - Mini Notebook */}
        <div className="p-1 flex flex-col flex-shrink-0 overflow-hidden" style={{ width: notesWidth, maxHeight: canvasSize.height + 50 }}>
          <h4 className="text-xs font-medium text-foreground mb-1 flex-shrink-0">Notas</h4>
          <div
            className="flex-1 min-h-0 overflow-y-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            <MiniNotebook
              cells={currentPage?.noteCells || []}
              onUpdate={handleUpdateNoteCells}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
