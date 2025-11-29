'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { MiniCell, MiniCellType, MiniMarkdownCell, MiniDrawingCell, MiniImageCell, MiniBackgroundType } from '@/types/notebook';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  cells: MiniCell[];
  onUpdate: (cells: MiniCell[]) => void;
}

// Toolbar colors
const textColors = [
  { color: '#ffffff', label: 'Blanco' },
  { color: '#000000', label: 'Negro' },
  { color: '#ef4444', label: 'Rojo' },
  { color: '#22c55e', label: 'Verde' },
  { color: '#3b82f6', label: 'Azul' },
  { color: '#8b5cf6', label: 'Violeta' },
];

// Mini Markdown Cell Component
function MiniMarkdown({ cell, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  cell: MiniMarkdownCell;
  onUpdate: (content: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [isEditing, setIsEditing] = useState(!cell.content);
  const [content, setContent] = useState(cell.content);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = () => {
    onUpdate(content);
    setIsEditing(false);
  };

  const insertAtCursor = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const textToInsert = selectedText || placeholder;
    const newContent = content.substring(0, start) + before + textToInsert + after + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.setSelectionRange(selectedText ? start + before.length : newCursorPos, selectedText ? start + before.length + selectedText.length : newCursorPos);
    }, 0);
  };

  const insertColoredText = (color: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const textToInsert = selectedText || 'texto';
    const colorSpan = `<span style="color: ${color}">${textToInsert}</span>`;
    const newContent = content.substring(0, start) + colorSpan + content.substring(end);
    setContent(newContent);
    setShowColorPicker(false);
    setTimeout(() => textarea.focus(), 0);
  };

  const insertAtLineStart = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    const newContent = content.substring(0, lineStart) + prefix + content.substring(lineStart);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  return (
    <div className="group/mini relative bg-card border border-border rounded">
      {/* Header */}
      <div className="flex items-center gap-1 px-1 py-0.5 border-b border-border bg-muted/50">
        <span className="text-[10px] font-medium text-muted-foreground uppercase">Md</span>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 opacity-0 group-hover/mini:opacity-100 transition-opacity">
          {!isFirst && (
            <button onClick={onMoveUp} className="p-0.5 text-muted-foreground hover:text-foreground rounded" title="Subir">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            </button>
          )}
          {!isLast && (
            <button onClick={onMoveDown} className="p-0.5 text-muted-foreground hover:text-foreground rounded" title="Bajar">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          )}
          <button onClick={onDelete} className="p-0.5 text-red-400 hover:text-red-600 rounded" title="Eliminar">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-[10px] px-1 text-primary hover:bg-primary/10 rounded">
            Editar
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="p-1">
          {/* Compact Toolbar */}
          <div className="flex flex-wrap items-center gap-0.5 mb-1 pb-1 border-b border-border">
            <button onClick={() => insertAtLineStart('# ')} className="px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted rounded" title="H1">H1</button>
            <button onClick={() => insertAtLineStart('## ')} className="px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted rounded" title="H2">H2</button>
            <button onClick={() => insertAtCursor('**', '**', 'texto')} className="px-1 py-0.5 text-[10px] font-bold text-muted-foreground hover:bg-muted rounded" title="Negrita">B</button>
            <button onClick={() => insertAtCursor('*', '*', 'texto')} className="px-1 py-0.5 text-[10px] italic text-muted-foreground hover:bg-muted rounded" title="Cursiva">I</button>
            <button onClick={() => insertAtCursor('`', '`', 'codigo')} className="px-1 py-0.5 text-[10px] font-mono text-muted-foreground hover:bg-muted rounded" title="Codigo">&lt;&gt;</button>
            <div className="relative">
              <button onClick={() => setShowColorPicker(!showColorPicker)} className="px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted rounded" title="Color">A</button>
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 p-1 bg-card border border-border rounded shadow-lg z-10 flex gap-0.5">
                  {textColors.map((c) => (
                    <button key={c.color} onClick={() => insertColoredText(c.color)} className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: c.color }} title={c.label} />
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => insertAtLineStart('- ')} className="px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted rounded" title="Lista">•</button>
            <button onClick={() => insertAtLineStart('- [ ] ')} className="px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted rounded" title="Checkbox">☐</button>
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setContent(cell.content); setIsEditing(false); } }}
            className="w-full min-h-[60px] p-1 text-xs font-mono border border-border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-y bg-background text-foreground"
            placeholder="Escribe markdown..."
            autoFocus
          />
          <div className="flex justify-end gap-1 mt-1">
            <button onClick={() => { setContent(cell.content); setIsEditing(false); }} className="px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted rounded">Cancelar</button>
            <button onClick={handleSave} className="px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 rounded">Guardar</button>
          </div>
        </div>
      ) : (
        <div className="p-1 prose prose-xs max-w-none cursor-pointer hover:bg-muted/50 min-h-[20px] text-foreground text-xs" onClick={() => setIsEditing(true)}>
          {content ? <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{content}</ReactMarkdown> : <p className="text-muted-foreground italic text-[10px]">Clic para editar...</p>}
        </div>
      )}
    </div>
  );
}

// Mini Drawing Cell Component
type MiniToolType = 'pen' | 'eraser' | 'line' | 'rect' | 'circle' | 'arrow';

function MiniDrawing({ cell, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  cell: MiniDrawingCell;
  onUpdate: (dataUrl: string, height: number, background: MiniBackgroundType) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEditing, setIsEditing] = useState(!cell.dataUrl);
  const [isResizing, setIsResizing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [tool, setTool] = useState<MiniToolType>('pen');
  const [fillShape, setFillShape] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(cell.height || 150);
  const [background, setBackground] = useState<MiniBackgroundType>(cell.background || 'blank');
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const shapeStartPoint = useRef<{ x: number; y: number } | null>(null);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);

  const CANVAS_WIDTH = 400;
  const colors = ['#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#8b5cf6'];
  const isShapeTool = (t: MiniToolType) => ['line', 'rect', 'circle', 'arrow'].includes(t);

  // Draw background pattern
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, bgType: MiniBackgroundType) => {
    const gridSize = 20;
    const gridColor = '#e5e7eb';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = gridColor;
    ctx.fillStyle = gridColor;
    ctx.lineWidth = 1;

    switch (bgType) {
      case 'grid':
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
        for (let y = gridSize; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        break;
      case 'dots':
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

  // Initialize canvases
  useEffect(() => {
    const canvas = canvasRef.current;
    const bgCanvas = bgCanvasRef.current;
    if (!canvas || !bgCanvas) return;
    const ctx = canvas.getContext('2d');
    const bgCtx = bgCanvas.getContext('2d');
    if (!ctx || !bgCtx) return;

    // Draw background
    drawBackground(bgCtx, CANVAS_WIDTH, canvasHeight, background);

    if (cell.dataUrl) {
      const img = new Image();
      img.onload = () => {
        drawBackground(ctx, CANVAS_WIDTH, canvasHeight, background);
        ctx.drawImage(img, 0, 0);
      };
      img.src = cell.dataUrl;
    } else {
      drawBackground(ctx, CANVAS_WIDTH, canvasHeight, background);
    }
  }, [cell.dataUrl, isEditing, canvasHeight, background, drawBackground]);

  // Update background when it changes
  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const bgCtx = bgCanvas.getContext('2d');
    if (!bgCtx) return;
    drawBackground(bgCtx, CANVAS_WIDTH, canvasHeight, background);
  }, [background, canvasHeight, drawBackground]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
  };

  const drawShape = (ctx: CanvasRenderingContext2D, start: { x: number; y: number }, end: { x: number; y: number }, shapeType: MiniToolType, preview = false) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    if (fillShape && !preview) ctx.fillStyle = color;

    switch (shapeType) {
      case 'line':
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        break;
      case 'arrow':
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = Math.max(8, brushSize * 3);
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        break;
      case 'rect':
        if (fillShape && !preview) ctx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
        break;
      case 'circle':
        const rx = Math.abs(end.x - start.x) / 2, ry = Math.abs(end.y - start.y) / 2;
        const cx = start.x + (end.x - start.x) / 2, cy = start.y + (end.y - start.y) / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (fillShape && !preview) ctx.fill();
        ctx.stroke();
        break;
    }
  };

  const clearPreview = () => {
    const ctx = previewCanvasRef.current?.getContext('2d');
    if (ctx && previewCanvasRef.current) ctx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isEditing) return;
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const point = getCanvasPoint(e);
    lastPoint.current = point;
    if (isShapeTool(tool)) shapeStartPoint.current = point;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isEditing) return;
    const currentPoint = getCanvasPoint(e);

    if (isShapeTool(tool)) {
      const previewCtx = previewCanvasRef.current?.getContext('2d');
      if (previewCtx && shapeStartPoint.current) {
        clearPreview();
        drawShape(previewCtx, shapeStartPoint.current, currentPoint, tool, true);
      }
    } else {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && lastPoint.current) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(currentPoint.x, currentPoint.y);
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
        ctx.lineWidth = tool === 'eraser' ? brushSize * 8 : brushSize;
        ctx.lineCap = 'round';
        ctx.stroke();
        lastPoint.current = currentPoint;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (isShapeTool(tool) && shapeStartPoint.current) {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) drawShape(ctx, shapeStartPoint.current, getCanvasPoint(e), tool, false);
      clearPreview();
      shapeStartPoint.current = null;
    }
    setIsDrawing(false);
    lastPoint.current = null;
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    onUpdate(canvasRef.current.toDataURL('image/png'), canvasHeight, background);
    setIsEditing(false);
  };

  const handleClear = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      drawBackground(ctx, CANVAS_WIDTH, canvasHeight, background);
    }
  };

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = canvasHeight;
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizeStartY.current;
      const newHeight = Math.max(100, Math.min(600, resizeStartHeight.current + deltaY));
      setCanvasHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const backgrounds: { type: MiniBackgroundType; icon: React.ReactNode }[] = [
    { type: 'blank', icon: <div className="w-3 h-3 rounded border border-border bg-white" /> },
    { type: 'grid', icon: <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1"><line x1="5" y1="0" x2="5" y2="16" /><line x1="11" y1="0" x2="11" y2="16" /><line x1="0" y1="5" x2="16" y2="5" /><line x1="0" y1="11" x2="16" y2="11" /></svg> },
    { type: 'lines', icon: <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1"><line x1="0" y1="4" x2="16" y2="4" /><line x1="0" y1="8" x2="16" y2="8" /><line x1="0" y1="12" x2="16" y2="12" /></svg> },
    { type: 'dots', icon: <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><circle cx="4" cy="4" r="1" /><circle cx="8" cy="4" r="1" /><circle cx="12" cy="4" r="1" /><circle cx="4" cy="8" r="1" /><circle cx="8" cy="8" r="1" /><circle cx="12" cy="8" r="1" /></svg> },
  ];

  return (
    <div className="group/mini relative bg-card border border-border rounded">
      <div className="flex items-center gap-1 px-1 py-0.5 border-b border-border bg-muted/50">
        <span className="text-[10px] font-medium text-muted-foreground uppercase">Dibujo</span>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 opacity-0 group-hover/mini:opacity-100 transition-opacity">
          {!isFirst && <button onClick={onMoveUp} className="p-0.5 text-muted-foreground hover:text-foreground rounded"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></button>}
          {!isLast && <button onClick={onMoveDown} className="p-0.5 text-muted-foreground hover:text-foreground rounded"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>}
          <button onClick={onDelete} className="p-0.5 text-red-400 hover:text-red-600 rounded"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        {!isEditing && <button onClick={() => setIsEditing(true)} className="text-[10px] px-1 text-primary hover:bg-primary/10 rounded">Editar</button>}
      </div>

      <div className="p-1">
        {isEditing && (
          <div className="flex flex-wrap items-center gap-1 mb-1">
            {/* Tools */}
            <button onClick={() => setTool('pen')} className={`p-0.5 rounded ${tool === 'pen' ? 'bg-primary/20 text-primary' : ''}`} title="Lapiz">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button onClick={() => setTool('eraser')} className={`p-0.5 rounded ${tool === 'eraser' ? 'bg-primary/20 text-primary' : ''}`} title="Goma">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M10 11v6m4-6v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" /></svg>
            </button>
            <button onClick={() => setTool('line')} className={`p-0.5 rounded ${tool === 'line' ? 'bg-primary/20 text-primary' : ''}`} title="Linea">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="5" y1="19" x2="19" y2="5" /></svg>
            </button>
            <button onClick={() => setTool('arrow')} className={`p-0.5 rounded ${tool === 'arrow' ? 'bg-primary/20 text-primary' : ''}`} title="Flecha">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="5" y1="19" x2="19" y2="5" /><polyline points="10,5 19,5 19,14" /></svg>
            </button>
            <button onClick={() => setTool('rect')} className={`p-0.5 rounded ${tool === 'rect' ? 'bg-primary/20 text-primary' : ''}`} title="Rectangulo">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="4" y="4" width="16" height="16" rx="1" /></svg>
            </button>
            <button onClick={() => setTool('circle')} className={`p-0.5 rounded ${tool === 'circle' ? 'bg-primary/20 text-primary' : ''}`} title="Circulo">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><ellipse cx="12" cy="12" rx="9" ry="9" /></svg>
            </button>
            {isShapeTool(tool) && (
              <button onClick={() => setFillShape(!fillShape)} className={`p-0.5 rounded ${fillShape ? 'bg-green-100 text-green-600' : ''}`} title="Relleno">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill={fillShape ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}><rect x="4" y="4" width="16" height="16" rx="1" /></svg>
              </button>
            )}
            <div className="w-px h-3 bg-border mx-0.5" />
            {/* Background selector */}
            {backgrounds.map((bg) => (
              <button
                key={bg.type}
                onClick={() => setBackground(bg.type)}
                className={`p-0.5 rounded ${background === bg.type ? 'bg-primary/20 text-primary' : ''}`}
                title={bg.type === 'blank' ? 'Blanco' : bg.type === 'grid' ? 'Cuadricula' : bg.type === 'lines' ? 'Lineas' : 'Puntos'}
              >
                {bg.icon}
              </button>
            ))}
            <div className="w-px h-3 bg-border mx-0.5" />
            {/* Colors */}
            {colors.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`w-3 h-3 rounded-full border ${color === c ? 'border-primary scale-125' : 'border-border'}`} style={{ backgroundColor: c }} />
            ))}
            <input type="range" min="1" max="10" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-10 h-1 accent-primary" />
            <button onClick={handleClear} className="p-0.5 text-red-400 hover:text-red-600 rounded text-[10px]">X</button>
          </div>
        )}
        <div ref={containerRef} className="relative">
          {/* Background canvas */}
          <canvas
            ref={bgCanvasRef}
            width={CANVAS_WIDTH}
            height={canvasHeight}
            className="absolute inset-0 w-full pointer-events-none rounded"
            style={{ height: `${canvasHeight * (containerRef.current?.offsetWidth || 300) / CANVAS_WIDTH}px` }}
          />
          {/* Main drawing canvas */}
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={canvasHeight}
            className={`relative w-full border border-border rounded ${isEditing ? 'cursor-crosshair' : 'cursor-pointer'}`}
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onClick={() => !isEditing && setIsEditing(true)}
          />
          {/* Preview canvas */}
          <canvas
            ref={previewCanvasRef}
            width={CANVAS_WIDTH}
            height={canvasHeight}
            className="absolute inset-0 w-full pointer-events-none"
          />
        </div>
        {/* Resize handle */}
        {isEditing && (
          <div
            className="h-2 bg-border hover:bg-primary cursor-ns-resize rounded-b flex items-center justify-center"
            onMouseDown={handleResizeStart}
            title="Arrastra para cambiar altura"
          >
            <div className="w-8 h-0.5 bg-muted-foreground/50 rounded" />
          </div>
        )}
        {isEditing && (
          <div className="flex justify-end gap-1 mt-1">
            <button onClick={() => setIsEditing(false)} className="px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted rounded">Cancelar</button>
            <button onClick={handleSave} className="px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 rounded">Guardar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Mini Image Cell Component
function MiniImage({ cell, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  cell: MiniImageCell;
  onUpdate: (dataUrl: string, alt: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [isEditing, setIsEditing] = useState(!cell.dataUrl);
  const [preview, setPreview] = useState(cell.dataUrl);
  const [alt, setAlt] = useState(cell.alt);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (preview) {
      onUpdate(preview, alt);
      setIsEditing(false);
    }
  };

  return (
    <div className="group/mini relative bg-card border border-border rounded">
      <div className="flex items-center gap-1 px-1 py-0.5 border-b border-border bg-muted/50">
        <span className="text-[10px] font-medium text-muted-foreground uppercase">Img</span>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 opacity-0 group-hover/mini:opacity-100 transition-opacity">
          {!isFirst && <button onClick={onMoveUp} className="p-0.5 text-muted-foreground hover:text-foreground rounded"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></button>}
          {!isLast && <button onClick={onMoveDown} className="p-0.5 text-muted-foreground hover:text-foreground rounded"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>}
          <button onClick={onDelete} className="p-0.5 text-red-400 hover:text-red-600 rounded"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        {!isEditing && cell.dataUrl && <button onClick={() => setIsEditing(true)} className="text-[10px] px-1 text-primary hover:bg-primary/10 rounded">Cambiar</button>}
      </div>

      <div className="p-1">
        {isEditing ? (
          <div className="space-y-1">
            <div
              className={`border border-dashed rounded p-2 text-center cursor-pointer ${isDragging ? 'border-primary bg-primary/10' : 'border-border'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) handleFileSelect(file); }}
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt={alt || 'Preview'} className="max-h-24 mx-auto rounded" />
              ) : (
                <p className="text-[10px] text-muted-foreground">Arrastra o haz clic</p>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }} className="hidden" />
            </div>
            <input type="text" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Alt..." className="w-full px-1 py-0.5 text-[10px] border border-border rounded bg-background text-foreground" />
            <div className="flex justify-end gap-1">
              <button onClick={() => { setPreview(cell.dataUrl); setAlt(cell.alt); setIsEditing(false); }} className="px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted rounded">Cancelar</button>
              <button onClick={handleSave} disabled={!preview} className="px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 rounded disabled:opacity-50">Guardar</button>
            </div>
          </div>
        ) : cell.dataUrl ? (
          <div className="cursor-pointer" onClick={() => setIsEditing(true)}>
            <img src={cell.dataUrl} alt={cell.alt || 'Imagen'} className="max-w-full h-auto rounded mx-auto" />
            {cell.alt && <p className="text-[10px] text-muted-foreground text-center italic">{cell.alt}</p>}
          </div>
        ) : (
          <div className="py-2 text-center text-[10px] text-muted-foreground cursor-pointer hover:bg-muted/50 rounded" onClick={() => setIsEditing(true)}>
            Clic para agregar imagen
          </div>
        )}
      </div>
    </div>
  );
}

// Main MiniNotebook Component
export default function MiniNotebook({ cells, onUpdate }: Props) {
  const addCell = (type: MiniCellType) => {
    const newCell: MiniCell = type === 'markdown'
      ? { id: uuidv4(), type: 'markdown', content: '' }
      : type === 'drawing'
      ? { id: uuidv4(), type: 'drawing', dataUrl: '', height: 150, background: 'blank' }
      : { id: uuidv4(), type: 'image', dataUrl: '', alt: '' };
    onUpdate([...cells, newCell]);
  };

  const updateCell = (id: string, updates: Partial<MiniCell>) => {
    onUpdate(cells.map(c => c.id === id ? { ...c, ...updates } as MiniCell : c));
  };

  const deleteCell = (id: string) => {
    onUpdate(cells.filter(c => c.id !== id));
  };

  const moveCell = (id: string, direction: 'up' | 'down') => {
    const index = cells.findIndex(c => c.id === id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === cells.length - 1)) return;
    const newCells = [...cells];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newCells[index], newCells[swapIndex]] = [newCells[swapIndex], newCells[index]];
    onUpdate(newCells);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Add cell buttons */}
      <div className="flex items-center gap-1 mb-1 flex-shrink-0">
        <button onClick={() => addCell('markdown')} className="px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/10 rounded border border-blue-200 dark:border-blue-800">+Md</button>
        <button onClick={() => addCell('drawing')} className="px-1.5 py-0.5 text-[10px] text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded border border-green-200 dark:border-green-800">+Dibujo</button>
        <button onClick={() => addCell('image')} className="px-1.5 py-0.5 text-[10px] text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded border border-purple-200 dark:border-purple-800">+Img</button>
      </div>

      {/* Cells with minimal spacing */}
      <div className="space-y-0.5">
        {cells.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic text-center py-4">
            Agrega notas usando los botones de arriba
          </p>
        ) : (
          cells.map((cell, index) => (
            <div key={cell.id}>
              {cell.type === 'markdown' && (
                <MiniMarkdown
                  cell={cell}
                  onUpdate={(content) => updateCell(cell.id, { content })}
                  onDelete={() => deleteCell(cell.id)}
                  onMoveUp={() => moveCell(cell.id, 'up')}
                  onMoveDown={() => moveCell(cell.id, 'down')}
                  isFirst={index === 0}
                  isLast={index === cells.length - 1}
                />
              )}
              {cell.type === 'drawing' && (
                <MiniDrawing
                  cell={cell}
                  onUpdate={(dataUrl, height, background) => updateCell(cell.id, { dataUrl, height, background })}
                  onDelete={() => deleteCell(cell.id)}
                  onMoveUp={() => moveCell(cell.id, 'up')}
                  onMoveDown={() => moveCell(cell.id, 'down')}
                  isFirst={index === 0}
                  isLast={index === cells.length - 1}
                />
              )}
              {cell.type === 'image' && (
                <MiniImage
                  cell={cell as MiniImageCell}
                  onUpdate={(dataUrl, alt) => updateCell(cell.id, { dataUrl, alt })}
                  onDelete={() => deleteCell(cell.id)}
                  onMoveUp={() => moveCell(cell.id, 'up')}
                  onMoveDown={() => moveCell(cell.id, 'down')}
                  isFirst={index === 0}
                  isLast={index === cells.length - 1}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
