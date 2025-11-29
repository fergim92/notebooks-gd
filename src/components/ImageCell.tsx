'use client';

import { useState, useRef } from 'react';
import { ImageCell as ImageCellType } from '@/types/notebook';

interface Props {
  cell: ImageCellType;
  onUpdate: (dataUrl: string, alt: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export default function ImageCell({ cell, onUpdate, onDelete, onMoveUp, onMoveDown }: Props) {
  const [isEditing, setIsEditing] = useState(!cell.dataUrl);
  const [alt, setAlt] = useState(cell.alt);
  const [preview, setPreview] = useState(cell.dataUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          handleFileSelect(file);
        }
        break;
      }
    }
  };

  const handleSave = () => {
    if (preview) {
      onUpdate(preview, alt);
      setIsEditing(false);
    }
  };

  return (
    <div className="group relative bg-card">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/50">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Imagen</span>
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
        {!isEditing && cell.dataUrl && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs px-2 py-1 text-primary hover:bg-primary/10 rounded"
          >
            Cambiar
          </button>
        )}
      </div>

      <div className="p-3" onPaste={handlePaste}>
        {isEditing ? (
          <div className="space-y-3">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-border hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <div className="space-y-3">
                  <img
                    src={preview}
                    alt={alt || 'Preview'}
                    className="max-h-64 mx-auto rounded-lg"
                  />
                  <p className="text-sm text-muted-foreground">
                    Haz clic o arrastra otra imagen para cambiar
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 mx-auto text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-muted-foreground">
                    Arrastra una imagen aqui, haz clic para seleccionar, o pega desde el portapapeles
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Soporta JPG, PNG, GIF, WebP
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Texto alternativo (opcional)
              </label>
              <input
                type="text"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Descripcion de la imagen..."
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setPreview(cell.dataUrl);
                  setAlt(cell.alt);
                  setIsEditing(false);
                }}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!preview}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
            </div>
          </div>
        ) : cell.dataUrl ? (
          <div
            className="cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setIsEditing(true)}
          >
            <img
              src={cell.dataUrl}
              alt={cell.alt || 'Imagen'}
              className="max-w-full h-auto rounded-lg mx-auto"
            />
            {cell.alt && (
              <p className="text-sm text-muted-foreground text-center mt-2 italic">{cell.alt}</p>
            )}
          </div>
        ) : (
          <div
            className="py-8 text-center text-muted-foreground cursor-pointer hover:bg-muted/50 rounded-lg"
            onClick={() => setIsEditing(true)}
          >
            <p>Haz clic para agregar una imagen</p>
          </div>
        )}
      </div>
    </div>
  );
}
