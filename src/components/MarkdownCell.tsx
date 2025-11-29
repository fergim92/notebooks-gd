'use client';

import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { MarkdownCell as MarkdownCellType } from '@/types/notebook';

interface Props {
  cell: MarkdownCellType;
  onUpdate: (content: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const textColors = [
  { color: '#ffffff', label: 'Blanco' },
  { color: '#000000', label: 'Negro' },
  { color: '#ef4444', label: 'Rojo' },
  { color: '#f97316', label: 'Naranja' },
  { color: '#eab308', label: 'Amarillo' },
  { color: '#22c55e', label: 'Verde' },
  { color: '#3b82f6', label: 'Azul' },
  { color: '#8b5cf6', label: 'Violeta' },
  { color: '#ec4899', label: 'Rosa' },
];

export default function MarkdownCell({ cell, onUpdate, onDelete, onMoveUp, onMoveDown }: Props) {
  const [isEditing, setIsEditing] = useState(!cell.content);
  const [content, setContent] = useState(cell.content);
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = () => {
    onUpdate(content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setContent(cell.content);
      setIsEditing(false);
    }
    if (e.ctrlKey && e.key === 'Enter') {
      handleSave();
    }
  };

  const insertAtCursor = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const textToInsert = selectedText || placeholder;

    const newContent =
      content.substring(0, start) +
      before + textToInsert + after +
      content.substring(end);

    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.setSelectionRange(
        selectedText ? start + before.length : newCursorPos,
        selectedText ? start + before.length + selectedText.length : newCursorPos
      );
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

    const newContent =
      content.substring(0, start) +
      colorSpan +
      content.substring(end);

    setContent(newContent);
    setShowColorPicker(false);

    setTimeout(() => {
      textarea.focus();
    }, 0);
  };

  const insertAtLineStart = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;

    const newContent =
      content.substring(0, lineStart) +
      prefix +
      content.substring(lineStart);

    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const toolbarButtons = [
    { label: 'H1', title: 'Titulo 1', action: () => insertAtLineStart('# ') },
    { label: 'H2', title: 'Titulo 2', action: () => insertAtLineStart('## ') },
    { label: 'H3', title: 'Titulo 3', action: () => insertAtLineStart('### ') },
    { type: 'separator' },
    {
      label: 'B',
      title: 'Negrita',
      action: () => insertAtCursor('**', '**', 'texto'),
      className: 'font-bold'
    },
    {
      label: 'I',
      title: 'Cursiva',
      action: () => insertAtCursor('*', '*', 'texto'),
      className: 'italic'
    },
    {
      label: 'S',
      title: 'Tachado',
      action: () => insertAtCursor('~~', '~~', 'texto'),
      className: 'line-through'
    },
    {
      label: '<>',
      title: 'Codigo inline',
      action: () => insertAtCursor('`', '`', 'codigo'),
      className: 'font-mono text-xs'
    },
    { type: 'separator' },
    { type: 'colorPicker' },
    { type: 'separator' },
    {
      label: '•',
      title: 'Lista sin orden',
      action: () => insertAtLineStart('- '),
    },
    {
      label: '1.',
      title: 'Lista ordenada',
      action: () => insertAtLineStart('1. '),
    },
    {
      label: '☐',
      title: 'Lista de tareas',
      action: () => insertAtLineStart('- [ ] '),
    },
    { type: 'separator' },
    {
      label: '""',
      title: 'Cita',
      action: () => insertAtLineStart('> '),
    },
    {
      label: '—',
      title: 'Linea horizontal',
      action: () => insertAtCursor('\n---\n', '', ''),
    },
    {
      label: '🔗',
      title: 'Enlace',
      action: () => insertAtCursor('[', '](url)', 'texto'),
    },
    {
      label: '```',
      title: 'Bloque de codigo',
      action: () => insertAtCursor('\n```\n', '\n```\n', 'codigo'),
      className: 'font-mono text-xs'
    },
    {
      label: '📊',
      title: 'Tabla',
      action: () => insertAtCursor('\n| Columna 1 | Columna 2 |\n|-----------|----------|\n| Celda 1   | Celda 2  |\n', '', ''),
    },
  ];

  return (
    <div className="group relative bg-card">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/50">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Markdown</span>
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

      {isEditing ? (
        <div className="p-3">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1 mb-2 pb-2 border-b border-border">
            {toolbarButtons.map((btn, idx) =>
              btn.type === 'separator' ? (
                <div key={idx} className="h-5 w-px bg-border mx-1" />
              ) : btn.type === 'colorPicker' ? (
                <div key={idx} className="relative">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="flex items-center gap-1 px-2 py-1 text-sm text-muted-foreground hover:bg-muted rounded transition-colors"
                    title="Color de texto"
                  >
                    <span className="font-bold">A</span>
                    <div
                      className="w-4 h-1 rounded-sm"
                      style={{ backgroundColor: selectedColor }}
                    />
                  </button>
                  {showColorPicker && (
                    <div className="absolute top-full left-0 mt-1 p-2 bg-card border border-border rounded-lg shadow-lg z-10">
                      <div className="flex gap-1 mb-2">
                        {textColors.map((c) => (
                          <button
                            key={c.color}
                            onClick={() => {
                              setSelectedColor(c.color);
                              insertColoredText(c.color);
                            }}
                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                              selectedColor === c.color ? 'border-blue-500' : 'border-border'
                            }`}
                            style={{ backgroundColor: c.color }}
                            title={c.label}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => setShowColorPicker(false)}
                        className="w-full text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cerrar
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  key={idx}
                  onClick={btn.action}
                  className={`px-2 py-1 text-sm text-muted-foreground hover:bg-muted rounded transition-colors ${btn.className || ''}`}
                  title={btn.title}
                >
                  {btn.label}
                </button>
              )
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[200px] p-3 font-mono text-sm border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y bg-background text-foreground placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Escribe tu Markdown aqui..."
            autoFocus
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-muted-foreground">
              Usa la barra de herramientas o escribe Markdown directamente
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setContent(cell.content);
                  setIsEditing(false);
                }}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
              >
                Guardar (Ctrl+Enter)
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="p-4 prose prose-sm max-w-none cursor-pointer hover:bg-muted/50 min-h-[60px] text-foreground"
          onClick={() => setIsEditing(true)}
        >
          {content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{content}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">Haz clic para editar...</p>
          )}
        </div>
      )}
    </div>
  );
}
