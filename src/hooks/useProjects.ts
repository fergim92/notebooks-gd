'use client';

import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Project, ProjectStore, Notebook, Cell, CellType } from '@/types/notebook';

const STORAGE_KEY = 'personal-notebook-projects';
const OLD_STORAGE_KEY = 'personal-notebook-data';
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
    case 'pdf':
      return {
        ...base,
        type: 'pdf',
        pdfData: '',
        fileName: '',
        pages: [],
        totalOriginalPages: 0,
      };
  }
}

function createNotebook(projectId?: string): Notebook {
  const now = Date.now();
  return {
    id: uuidv4(),
    title: 'Nuevo Notebook',
    cells: [],
    createdAt: now,
    updatedAt: now,
    projectId,
  };
}

function createProject(name: string, parentId: string | null = null): Project {
  const now = Date.now();
  return {
    id: uuidv4(),
    name,
    parentId,
    createdAt: now,
    updatedAt: now,
  };
}

function createInitialStore(): ProjectStore {
  const notebook = createNotebook();
  return {
    projects: [],
    notebooks: [notebook],
    activeNotebookId: notebook.id,
  };
}

function migrateOldData(): ProjectStore | null {
  try {
    const oldData = localStorage.getItem(OLD_STORAGE_KEY);
    if (oldData) {
      const oldNotebook = JSON.parse(oldData) as Notebook;
      // Asignar projectId como undefined (sin proyecto)
      oldNotebook.projectId = undefined;
      return {
        projects: [],
        notebooks: [oldNotebook],
        activeNotebookId: oldNotebook.id,
      };
    }
  } catch {
    // Ignorar errores de migración
  }
  return null;
}

export function useProjects() {
  const [store, setStore] = useState<ProjectStore | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setStore(JSON.parse(saved));
      } else {
        // Intentar migrar datos antiguos
        const migrated = migrateOldData();
        if (migrated) {
          setStore(migrated);
        } else {
          setStore(createInitialStore());
        }
      }
    } catch {
      setStore(createInitialStore());
    }
    setIsLoading(false);
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    if (store && !isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }
  }, [store, isLoading]);

  // === Getters ===
  const activeNotebook = store?.notebooks.find(n => n.id === store.activeNotebookId) || null;

  const getProjectChildren = useCallback((parentId: string | null) => {
    if (!store) return { projects: [], notebooks: [] };
    return {
      projects: store.projects.filter(p => p.parentId === parentId),
      notebooks: store.notebooks.filter(n =>
        parentId === null ? !n.projectId : n.projectId === parentId
      ),
    };
  }, [store]);

  const getProjectPath = useCallback((projectId: string | null): Project[] => {
    if (!store || !projectId) return [];
    const path: Project[] = [];
    let current = store.projects.find(p => p.id === projectId);
    while (current) {
      path.unshift(current);
      current = current.parentId
        ? store.projects.find(p => p.id === current!.parentId)
        : undefined;
    }
    return path;
  }, [store]);

  // === Project operations ===
  const addProject = useCallback((name: string, parentId: string | null = null) => {
    setStore(prev => {
      if (!prev) return prev;
      const newProject = createProject(name, parentId);
      return {
        ...prev,
        projects: [...prev.projects, newProject],
      };
    });
  }, []);

  const renameProject = useCallback((id: string, name: string) => {
    setStore(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        projects: prev.projects.map(p =>
          p.id === id ? { ...p, name, updatedAt: Date.now() } : p
        ),
      };
    });
  }, []);

  const deleteProject = useCallback((id: string) => {
    setStore(prev => {
      if (!prev) return prev;

      // Obtener todos los IDs de subproyectos recursivamente
      const getAllChildProjectIds = (parentId: string): string[] => {
        const children = prev.projects.filter(p => p.parentId === parentId);
        return children.flatMap(c => [c.id, ...getAllChildProjectIds(c.id)]);
      };

      const projectIdsToDelete = [id, ...getAllChildProjectIds(id)];

      // Mover notebooks huérfanos a la raíz
      const notebooks = prev.notebooks.map(n =>
        n.projectId && projectIdsToDelete.includes(n.projectId)
          ? { ...n, projectId: undefined }
          : n
      );

      return {
        ...prev,
        projects: prev.projects.filter(p => !projectIdsToDelete.includes(p.id)),
        notebooks,
      };
    });
  }, []);

  const moveProject = useCallback((id: string, newParentId: string | null) => {
    setStore(prev => {
      if (!prev) return prev;
      // Evitar mover un proyecto dentro de sí mismo o sus hijos
      const getAllChildProjectIds = (parentId: string): string[] => {
        const children = prev.projects.filter(p => p.parentId === parentId);
        return children.flatMap(c => [c.id, ...getAllChildProjectIds(c.id)]);
      };

      if (newParentId && (newParentId === id || getAllChildProjectIds(id).includes(newParentId))) {
        return prev;
      }

      return {
        ...prev,
        projects: prev.projects.map(p =>
          p.id === id ? { ...p, parentId: newParentId, updatedAt: Date.now() } : p
        ),
      };
    });
  }, []);

  // === Notebook operations ===
  const addNotebook = useCallback((projectId?: string) => {
    setStore(prev => {
      if (!prev) return prev;
      const newNotebook = createNotebook(projectId);
      return {
        ...prev,
        notebooks: [...prev.notebooks, newNotebook],
        activeNotebookId: newNotebook.id,
      };
    });
  }, []);

  const selectNotebook = useCallback((id: string) => {
    setStore(prev => {
      if (!prev) return prev;
      return { ...prev, activeNotebookId: id };
    });
  }, []);

  const deleteNotebook = useCallback((id: string) => {
    setStore(prev => {
      if (!prev) return prev;
      const notebooks = prev.notebooks.filter(n => n.id !== id);

      // Si borramos el notebook activo, seleccionar otro
      let activeNotebookId: string | null = prev.activeNotebookId;
      if (activeNotebookId === id) {
        activeNotebookId = notebooks.length > 0 ? notebooks[0].id : null;
      }

      return { ...prev, notebooks, activeNotebookId };
    });
  }, []);

  const moveNotebook = useCallback((id: string, projectId: string | undefined) => {
    setStore(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        notebooks: prev.notebooks.map(n =>
          n.id === id ? { ...n, projectId, updatedAt: Date.now() } : n
        ),
      };
    });
  }, []);

  const updateNotebookTitle = useCallback((id: string, title: string) => {
    setStore(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        notebooks: prev.notebooks.map(n =>
          n.id === id ? { ...n, title, updatedAt: Date.now() } : n
        ),
      };
    });
  }, []);

  // === Cell operations (delegadas al notebook activo) ===
  const addCell = useCallback((type: CellType, afterId?: string) => {
    setStore(prev => {
      if (!prev || !prev.activeNotebookId) return prev;
      const newCell = createCell(type);

      return {
        ...prev,
        notebooks: prev.notebooks.map(notebook => {
          if (notebook.id !== prev.activeNotebookId) return notebook;

          let cells: Cell[];
          if (afterId) {
            const index = notebook.cells.findIndex(c => c.id === afterId);
            cells = [
              ...notebook.cells.slice(0, index + 1),
              newCell,
              ...notebook.cells.slice(index + 1),
            ];
          } else {
            cells = [...notebook.cells, newCell];
          }

          return { ...notebook, cells, updatedAt: Date.now() };
        }),
      };
    });
  }, []);

  const updateCell = useCallback((cellId: string, updates: Record<string, unknown>) => {
    setStore(prev => {
      if (!prev || !prev.activeNotebookId) return prev;

      return {
        ...prev,
        notebooks: prev.notebooks.map(notebook => {
          if (notebook.id !== prev.activeNotebookId) return notebook;

          const cells = notebook.cells.map(cell =>
            cell.id === cellId ? { ...cell, ...updates, updatedAt: Date.now() } as Cell : cell
          );

          return { ...notebook, cells, updatedAt: Date.now() };
        }),
      };
    });
  }, []);

  const deleteCell = useCallback((cellId: string) => {
    setStore(prev => {
      if (!prev || !prev.activeNotebookId) return prev;

      return {
        ...prev,
        notebooks: prev.notebooks.map(notebook => {
          if (notebook.id !== prev.activeNotebookId) return notebook;

          const cells = notebook.cells.filter(cell => cell.id !== cellId);
          return { ...notebook, cells, updatedAt: Date.now() };
        }),
      };
    });
  }, []);

  const moveCell = useCallback((cellId: string, direction: 'up' | 'down') => {
    setStore(prev => {
      if (!prev || !prev.activeNotebookId) return prev;

      return {
        ...prev,
        notebooks: prev.notebooks.map(notebook => {
          if (notebook.id !== prev.activeNotebookId) return notebook;

          const index = notebook.cells.findIndex(c => c.id === cellId);
          if (index === -1) return notebook;

          const newIndex = direction === 'up' ? index - 1 : index + 1;
          if (newIndex < 0 || newIndex >= notebook.cells.length) return notebook;

          const cells = [...notebook.cells];
          [cells[index], cells[newIndex]] = [cells[newIndex], cells[index]];

          return { ...notebook, cells, updatedAt: Date.now() };
        }),
      };
    });
  }, []);

  // === Import/Export ===
  const exportNotebook = useCallback(() => {
    if (!activeNotebook) return;
    const blob = new Blob([JSON.stringify(activeNotebook, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNotebook.title.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeNotebook]);

  const importNotebook = useCallback((file: File, projectId?: string) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as Notebook;
        imported.id = uuidv4(); // Nuevo ID para evitar conflictos
        imported.projectId = projectId;

        setStore(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            notebooks: [...prev.notebooks, imported],
            activeNotebookId: imported.id,
          };
        });
      } catch {
        alert('Error al importar el archivo. Asegurate de que sea un archivo JSON valido.');
      }
    };
    reader.readAsText(file);
  }, []);

  const clearNotebook = useCallback(() => {
    if (!activeNotebook) return;
    if (confirm('Estas seguro de que quieres borrar todo el contenido del notebook?')) {
      setStore(prev => {
        if (!prev || !prev.activeNotebookId) return prev;

        return {
          ...prev,
          notebooks: prev.notebooks.map(notebook =>
            notebook.id === prev.activeNotebookId
              ? { ...notebook, cells: [], updatedAt: Date.now() }
              : notebook
          ),
        };
      });
    }
  }, [activeNotebook]);

  return {
    // State
    store,
    isLoading,
    activeNotebook,

    // Getters
    getProjectChildren,
    getProjectPath,

    // Project operations
    addProject,
    renameProject,
    deleteProject,
    moveProject,

    // Notebook operations
    addNotebook,
    selectNotebook,
    deleteNotebook,
    moveNotebook,
    updateNotebookTitle,

    // Cell operations
    addCell,
    updateCell,
    deleteCell,
    moveCell,

    // Import/Export
    exportNotebook,
    importNotebook,
    clearNotebook,
  };
}
