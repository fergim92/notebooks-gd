'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { DrawingCell as DrawingCellType } from '@/types/notebook';

interface Props {
  cell: DrawingCellType;
  onUpdate: (dataUrl: string) => void;
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
type ToolType = 'pen' | 'eraser' | 'line' | 'rect' | 'circle' | 'arrow';

export default function DrawingCell({ cell, onUpdate, onDelete, onMoveUp, onMoveDown }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEditing, setIsEditing] = useState(!cell.dataUrl);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<ToolType>('pen');
  const [fillShape, setFillShape] = useState(false);
  const [background, setBackground] = useState<BackgroundType>('blank');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const lastPoint = useRef<Point | null>(null);
  const shapeStartPoint = useRef<Point | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Theme colors
  const bgColor = isDarkMode ? '#1f2937' : '#ffffff';
  const gridColor = isDarkMode ? '#374151' : '#e5e7eb';
  const eraserColor = bgColor;

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, bgType: BackgroundType, dark: boolean) => {
    const bg = dark ? '#1f2937' : '#ffffff';
    const grid = dark ? '#374151' : '#e5e7eb';
    const gridSize = 20;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    switch (bgType) {
      case 'grid':
        ctx.strokeStyle = grid;
        ctx.lineWidth = 1;
        for (let x = gridSize; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = gridSize; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        break;

      case 'lines':
        ctx.strokeStyle = grid;
        ctx.lineWidth = 1;
        for (let y = gridSize; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        break;

      case 'dots':
        ctx.fillStyle = grid;
        for (let x = gridSize; x < width; x += gridSize) {
          for (let y = gridSize; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
    }
  }, []);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
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
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    }
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const bgCanvas = bgCanvasRef.current;
    if (!canvas || !bgCanvas) return;
    const ctx = canvas.getContext('2d');
    const bgCtx = bgCanvas.getContext('2d');
    if (!ctx || !bgCtx) return;

    // Draw background on background canvas
    drawBackground(bgCtx, bgCanvas.width, bgCanvas.height, background, isDarkMode);

    if (cell.dataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        saveToHistory();
      };
      img.src = cell.dataUrl;
    } else {
      // Copy background to main canvas
      drawBackground(ctx, canvas.width, canvas.height, background, isDarkMode);
      saveToHistory();
    }
  }, [cell.dataUrl, saveToHistory, drawBackground, background, isDarkMode]);

  // Update background when theme or type changes
  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const bgCtx = bgCanvas.getContext('2d');
    if (!bgCtx) return;
    drawBackground(bgCtx, bgCanvas.width, bgCanvas.height, background, isDarkMode);
  }, [background, drawBackground, isDarkMode]);

  // Set default color based on theme
  useEffect(() => {
    if (isDarkMode && color === '#000000') {
      setColor('#ffffff');
    } else if (!isDarkMode && color === '#ffffff') {
      setColor('#000000');
    }
  }, [isDarkMode, color]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
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
    const size = tool === 'eraser' ? brushSize * 8 : brushSize * (0.5 + pressure);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = tool === 'eraser' ? eraserColor : color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const isShapeTool = (t: ToolType) => ['line', 'rect', 'circle', 'arrow'].includes(t);

  const drawShape = (ctx: CanvasRenderingContext2D, start: Point, end: Point, shapeType: ToolType, preview = false) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (fillShape && !preview) {
      ctx.fillStyle = color;
    }

    switch (shapeType) {
      case 'line':
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        break;

      case 'arrow':
        // Draw line
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        // Draw arrowhead
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLength = Math.max(10, brushSize * 4);
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        break;

      case 'rect':
        const rectW = end.x - start.x;
        const rectH = end.y - start.y;
        if (fillShape && !preview) {
          ctx.fillRect(start.x, start.y, rectW, rectH);
        }
        ctx.strokeRect(start.x, start.y, rectW, rectH);
        break;

      case 'circle':
        const radiusX = Math.abs(end.x - start.x) / 2;
        const radiusY = Math.abs(end.y - start.y) / 2;
        const centerX = start.x + (end.x - start.x) / 2;
        const centerY = start.y + (end.y - start.y) / 2;
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        if (fillShape && !preview) {
          ctx.fill();
        }
        ctx.stroke();
        break;
    }
  };

  const clearPreviewCanvas = () => {
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isEditing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const point = getCanvasPoint(e);
    lastPoint.current = point;

    if (isShapeTool(tool)) {
      shapeStartPoint.current = point;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isEditing) return;
    e.preventDefault();

    const currentPoint = getCanvasPoint(e);

    if (isShapeTool(tool)) {
      // Preview shape on preview canvas
      const previewCanvas = previewCanvasRef.current;
      if (!previewCanvas || !shapeStartPoint.current) return;
      const previewCtx = previewCanvas.getContext('2d');
      if (!previewCtx) return;

      clearPreviewCanvas();
      drawShape(previewCtx, shapeStartPoint.current, currentPoint, tool, true);
    } else {
      // Regular drawing
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx || !lastPoint.current) return;

      drawLine(lastPoint.current, currentPoint, ctx);
      lastPoint.current = currentPoint;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    if (isShapeTool(tool) && shapeStartPoint.current) {
      // Draw final shape on main canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const endPoint = getCanvasPoint(e);
          drawShape(ctx, shapeStartPoint.current, endPoint, tool, false);
        }
      }
      clearPreviewCanvas();
      shapeStartPoint.current = null;
    }

    setIsDrawing(false);
    lastPoint.current = null;
    saveToHistory();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onUpdate(dataUrl);
    setIsEditing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawBackground(ctx, canvas.width, canvas.height, background, isDarkMode);
    saveToHistory();
  };

  const handleInsertImage = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height,
          1
        );
        const width = img.width * scale;
        const height = img.height * scale;
        const x = (canvas.width - width) / 2;
        const y = (canvas.height - height) / 2;

        ctx.drawImage(img, x, y, width, height);
        saveToHistory();
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleInsertImage(file);
    }
    e.target.value = '';
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (!isEditing) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          handleInsertImage(file);
        }
        break;
      }
    }
  }, [isEditing]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isEditing) return;
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    }
  }, [isEditing, undo, redo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const colors = isDarkMode
    ? ['#ffffff', '#d1d5db', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899']
    : ['#000000', '#374151', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

  const backgrounds: { type: BackgroundType; label: string; icon: React.ReactNode }[] = [
    {
      type: 'blank',
      label: 'Blanco',
      icon: <div className={`w-4 h-4 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-500' : 'bg-white border-gray-300'}`} />
    },
    {
      type: 'grid',
      label: 'Cuadricula',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
          <line x1="5" y1="0" x2="5" y2="16" />
          <line x1="11" y1="0" x2="11" y2="16" />
          <line x1="0" y1="5" x2="16" y2="5" />
          <line x1="0" y1="11" x2="16" y2="11" />
        </svg>
      )
    },
    {
      type: 'lines',
      label: 'Rayado',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
          <line x1="0" y1="4" x2="16" y2="4" />
          <line x1="0" y1="8" x2="16" y2="8" />
          <line x1="0" y1="12" x2="16" y2="12" />
        </svg>
      )
    },
    {
      type: 'dots',
      label: 'Puntos',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="4" cy="4" r="1" />
          <circle cx="8" cy="4" r="1" />
          <circle cx="12" cy="4" r="1" />
          <circle cx="4" cy="8" r="1" />
          <circle cx="8" cy="8" r="1" />
          <circle cx="12" cy="8" r="1" />
          <circle cx="4" cy="12" r="1" />
          <circle cx="8" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      )
    },
  ];

  return (
    <div className="group relative bg-card">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/50">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dibujo</span>
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
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs px-2 py-1 text-primary hover:bg-primary/10 rounded"
          >
            Editar
          </button>
        )}
      </div>

      {isEditing && (
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

          {/* Shape tools */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTool('line')}
              className={`p-1.5 rounded ${tool === 'line' ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}`}
              title="Linea"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="5" y1="19" x2="19" y2="5" />
              </svg>
            </button>
            <button
              onClick={() => setTool('arrow')}
              className={`p-1.5 rounded ${tool === 'arrow' ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}`}
              title="Flecha"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="5" y1="19" x2="19" y2="5" />
                <polyline points="10,5 19,5 19,14" />
              </svg>
            </button>
            <button
              onClick={() => setTool('rect')}
              className={`p-1.5 rounded ${tool === 'rect' ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}`}
              title="Rectangulo"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="4" y="4" width="16" height="16" rx="1" />
              </svg>
            </button>
            <button
              onClick={() => setTool('circle')}
              className={`p-1.5 rounded ${tool === 'circle' ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}`}
              title="Circulo/Elipse"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <ellipse cx="12" cy="12" rx="9" ry="9" />
              </svg>
            </button>
            {isShapeTool(tool) && (
              <button
                onClick={() => setFillShape(!fillShape)}
                className={`p-1.5 rounded ${fillShape ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' : 'hover:bg-muted'}`}
                title={fillShape ? 'Relleno activado' : 'Sin relleno'}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill={fillShape ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                  <rect x="4" y="4" width="16" height="16" rx="1" />
                </svg>
              </button>
            )}
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Colors */}
          <div className="flex items-center gap-1">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c ? 'border-blue-500 scale-110' : 'border-border'}`}
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
              className="w-20 h-1 accent-blue-600"
            />
            <span className="text-xs text-muted-foreground w-4">{brushSize}</span>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Background selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Fondo:</span>
            {backgrounds.map((bg) => (
              <button
                key={bg.type}
                onClick={() => setBackground(bg.type)}
                className={`p-1.5 rounded ${background === bg.type ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                title={bg.label}
              >
                {bg.icon}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Insert image */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground"
            title="Insertar imagen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="h-6 w-px bg-border" />

          {/* Undo/Redo/Clear */}
          <button
            onClick={undo}
            className="p-1.5 hover:bg-muted rounded"
            title="Deshacer (Ctrl+Z)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={redo}
            className="p-1.5 hover:bg-muted rounded"
            title="Rehacer (Ctrl+Shift+Z)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 hover:bg-muted rounded text-red-500"
            title="Limpiar todo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="p-3">
        <div className="relative">
          {/* Background canvas (for reference grid) */}
          <canvas
            ref={bgCanvasRef}
            width={cell.width}
            height={cell.height}
            className="absolute inset-0 w-full border border-border rounded-lg pointer-events-none"
          />
          {/* Main drawing canvas */}
          <canvas
            ref={canvasRef}
            width={cell.width}
            height={cell.height}
            className={`relative w-full border border-border rounded-lg ${isEditing ? 'cursor-crosshair' : 'cursor-pointer'}`}
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onClick={() => !isEditing && setIsEditing(true)}
          />
          {/* Preview canvas (for shape preview) */}
          <canvas
            ref={previewCanvasRef}
            width={cell.width}
            height={cell.height}
            className="absolute inset-0 w-full pointer-events-none"
          />
        </div>
        {isEditing && (
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-muted-foreground">
              Tableta grafica soportada. Pega imagenes con Ctrl+V.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
              >
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
