'use client';

import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Notebook, Cell, CellType } from '@/types/notebook';

const STORAGE_KEY = 'personal-notebook-data';
const DEFAULT_CANVAS_WIDTH = 800;
const DEFAULT_CANVAS_HEIGHT = 400;

function createCell(type: CellType): Cell {
  const now = Date.now();
  const base = {
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };

  switch (type) {
    case 'markdown':
      return { ...base, type: 'markdown', content: '' };
    case 'drawing':
      return {
        ...base,
        type: 'drawing',
        dataUrl: '',
        width: DEFAULT_CANVAS_WIDTH,
        height: DEFAULT_CANVAS_HEIGHT,
      };
    case 'image':
      return { ...base, type: 'image', dataUrl: '', alt: '' };
  }
}

function createNotebook(): Notebook {
  const now = Date.now();
  return {
    id: uuidv4(),
    title: 'Mi Notebook',
    cells: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function useNotebook() {
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setNotebook(JSON.parse(saved));
      } else {
        setNotebook(createNotebook());
      }
    } catch {
      setNotebook(createNotebook());
    }
    setIsLoading(false);
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    if (notebook && !isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notebook));
    }
  }, [notebook, isLoading]);

  const updateTitle = useCallback((title: string) => {
    setNotebook((prev) =>
      prev ? { ...prev, title, updatedAt: Date.now() } : prev
    );
  }, []);

  const addCell = useCallback((type: CellType, afterId?: string) => {
    setNotebook((prev) => {
      if (!prev) return prev;
      const newCell = createCell(type);
      let cells: Cell[];

      if (afterId) {
        const index = prev.cells.findIndex((c) => c.id === afterId);
        cells = [
          ...prev.cells.slice(0, index + 1),
          newCell,
          ...prev.cells.slice(index + 1),
        ];
      } else {
        cells = [...prev.cells, newCell];
      }

      return { ...prev, cells, updatedAt: Date.now() };
    });
  }, []);

  const updateCell = useCallback((id: string, updates: Record<string, unknown>) => {
    setNotebook((prev) => {
      if (!prev) return prev;
      const cells = prev.cells.map((cell) =>
        cell.id === id ? { ...cell, ...updates, updatedAt: Date.now() } as Cell : cell
      );
      return { ...prev, cells, updatedAt: Date.now() };
    });
  }, []);

  const deleteCell = useCallback((id: string) => {
    setNotebook((prev) => {
      if (!prev) return prev;
      const cells = prev.cells.filter((cell) => cell.id !== id);
      return { ...prev, cells, updatedAt: Date.now() };
    });
  }, []);

  const moveCell = useCallback((id: string, direction: 'up' | 'down') => {
    setNotebook((prev) => {
      if (!prev) return prev;
      const index = prev.cells.findIndex((c) => c.id === id);
      if (index === -1) return prev;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.cells.length) return prev;

      const cells = [...prev.cells];
      [cells[index], cells[newIndex]] = [cells[newIndex], cells[index]];

      return { ...prev, cells, updatedAt: Date.now() };
    });
  }, []);

  const exportNotebook = useCallback(() => {
    if (!notebook) return;
    const blob = new Blob([JSON.stringify(notebook, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${notebook.title.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [notebook]);

  const importNotebook = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as Notebook;
        setNotebook(imported);
      } catch {
        alert('Error al importar el archivo. Asegurate de que sea un archivo JSON valido.');
      }
    };
    reader.readAsText(file);
  }, []);

  const clearNotebook = useCallback(() => {
    if (confirm('Estas seguro de que quieres borrar todo el notebook?')) {
      setNotebook(createNotebook());
    }
  }, []);

  return {
    notebook,
    isLoading,
    updateTitle,
    addCell,
    updateCell,
    deleteCell,
    moveCell,
    exportNotebook,
    importNotebook,
    clearNotebook,
  };
}
