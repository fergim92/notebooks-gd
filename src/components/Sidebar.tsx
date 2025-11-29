'use client';

import { useState, useRef } from 'react';
import { Project, Notebook } from '@/types/notebook';

interface SidebarProps {
  projects: Project[];
  notebooks: Notebook[];
  activeNotebookId: string | null;
  getProjectChildren: (parentId: string | null) => { projects: Project[]; notebooks: Notebook[] };
  onSelectNotebook: (id: string) => void;
  onAddNotebook: (projectId?: string) => void;
  onDeleteNotebook: (id: string) => void;
  onAddProject: (name: string, parentId?: string | null) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onMoveNotebook: (id: string, projectId: string | undefined) => void;
  onImportNotebook: (file: File, projectId?: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface ProjectItemProps {
  project: Project;
  level: number;
  getProjectChildren: (parentId: string | null) => { projects: Project[]; notebooks: Notebook[] };
  onSelectNotebook: (id: string) => void;
  onAddNotebook: (projectId?: string) => void;
  onDeleteNotebook: (id: string) => void;
  onAddProject: (name: string, parentId?: string | null) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onMoveNotebook: (id: string, projectId: string | undefined) => void;
  activeNotebookId: string | null;
}

function ProjectItem({
  project,
  level,
  getProjectChildren,
  onSelectNotebook,
  onAddNotebook,
  onDeleteNotebook,
  onAddProject,
  onRenameProject,
  onDeleteProject,
  onMoveNotebook,
  activeNotebookId,
}: ProjectItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const children = getProjectChildren(project.id);
  const hasChildren = children.projects.length > 0 || children.notebooks.length > 0;

  const handleRename = () => {
    if (editName.trim()) {
      onRenameProject(project.id, editName.trim());
    } else {
      setEditName(project.name);
    }
    setIsEditing(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-blue-100', 'dark:bg-blue-900/30');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-blue-100', 'dark:bg-blue-900/30');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-100', 'dark:bg-blue-900/30');
    const notebookId = e.dataTransfer.getData('notebookId');
    if (notebookId) {
      onMoveNotebook(notebookId, project.id);
    }
  };

  return (
    <div>
      <div
        className="group flex items-center gap-1 py-1 px-2 rounded hover:bg-muted cursor-pointer relative"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0.5 hover:bg-secondary rounded"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-3 w-3 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-yellow-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setEditName(project.name);
                setIsEditing(false);
              }
            }}
            className="flex-1 text-sm bg-card border border-primary rounded px-1 py-0 focus:outline-none text-foreground"
            autoFocus
          />
        ) : (
          <span
            className="flex-1 text-sm text-foreground truncate"
            onDoubleClick={() => {
              setIsEditing(true);
              setEditName(project.name);
            }}
          >
            {project.name}
          </span>
        )}

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-0.5 hover:bg-secondary rounded"
            title="Opciones"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>

        {showMenu && (
          <div
            className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[160px]"
            onMouseLeave={() => setShowMenu(false)}
          >
            <button
              onClick={() => {
                onAddNotebook(project.id);
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-popover-foreground hover:bg-muted"
            >
              + Nuevo Notebook
            </button>
            <button
              onClick={() => {
                const name = prompt('Nombre del subproyecto:');
                if (name) onAddProject(name, project.id);
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-popover-foreground hover:bg-muted"
            >
              + Nueva Subcarpeta
            </button>
            <hr className="my-1 border-border" />
            <button
              onClick={() => {
                setIsEditing(true);
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-popover-foreground hover:bg-muted"
            >
              Renombrar
            </button>
            <button
              onClick={() => {
                if (confirm(`Eliminar el proyecto "${project.name}" y todas sus subcarpetas?`)) {
                  onDeleteProject(project.id);
                }
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div>
          {children.projects.map((childProject) => (
            <ProjectItem
              key={childProject.id}
              project={childProject}
              level={level + 1}
              getProjectChildren={getProjectChildren}
              onSelectNotebook={onSelectNotebook}
              onAddNotebook={onAddNotebook}
              onDeleteNotebook={onDeleteNotebook}
              onAddProject={onAddProject}
              onRenameProject={onRenameProject}
              onDeleteProject={onDeleteProject}
              onMoveNotebook={onMoveNotebook}
              activeNotebookId={activeNotebookId}
            />
          ))}
          {children.notebooks.map((notebook) => (
            <NotebookItem
              key={notebook.id}
              notebook={notebook}
              level={level + 1}
              isActive={notebook.id === activeNotebookId}
              onSelectNotebook={onSelectNotebook}
              onDeleteNotebook={onDeleteNotebook}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotebookItem({
  notebook,
  level,
  isActive,
  onSelectNotebook,
  onDeleteNotebook,
}: {
  notebook: Notebook;
  level: number;
  isActive: boolean;
  onSelectNotebook: (id: string) => void;
  onDeleteNotebook: (id: string) => void;
}) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('notebookId', notebook.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Eliminar el notebook "${notebook.title}"?`)) {
      onDeleteNotebook(notebook.id);
    }
  };

  return (
    <div
      className={`group flex items-center gap-1 py-1 px-2 rounded cursor-pointer ${
        isActive
          ? 'bg-primary/20 text-primary'
          : 'hover:bg-muted'
      }`}
      style={{ paddingLeft: `${level * 12 + 20}px` }}
      onClick={() => onSelectNotebook(notebook.id)}
      draggable
      onDragStart={handleDragStart}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>

      <span className="flex-1 text-sm truncate">{notebook.title}</span>

      {/* Direct delete button - visible on hover */}
      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded flex-shrink-0"
        title="Eliminar notebook"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function Sidebar({
  projects,
  notebooks,
  activeNotebookId,
  getProjectChildren,
  onSelectNotebook,
  onAddNotebook,
  onDeleteNotebook,
  onAddProject,
  onRenameProject,
  onDeleteProject,
  onMoveNotebook,
  onImportNotebook,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootChildren = getProjectChildren(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    const notebookId = e.dataTransfer.getData('notebookId');
    if (notebookId) {
      onMoveNotebook(notebookId, undefined);
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-3">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-sidebar-accent rounded-lg"
          title="Expandir"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sidebar-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border">
        <span className="font-semibold text-sm text-sidebar-foreground">Proyectos</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const name = prompt('Nombre del proyecto:');
              if (name) onAddProject(name, null);
            }}
            className="p-1 hover:bg-sidebar-accent rounded"
            title="Nueva carpeta"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sidebar-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </button>
          <button
            onClick={() => onAddNotebook()}
            className="p-1 hover:bg-sidebar-accent rounded"
            title="Nuevo notebook"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sidebar-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1 hover:bg-sidebar-accent rounded"
            title="Importar notebook"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sidebar-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportNotebook(file);
              e.target.value = '';
            }}
            className="hidden"
          />
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-sidebar-accent rounded"
            title="Colapsar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sidebar-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tree */}
      <div
        className="flex-1 overflow-y-auto py-2"
        onDragOver={handleDragOver}
        onDrop={handleDropOnRoot}
      >
        {/* Root projects */}
        {rootChildren.projects.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            level={0}
            getProjectChildren={getProjectChildren}
            onSelectNotebook={onSelectNotebook}
            onAddNotebook={onAddNotebook}
            onDeleteNotebook={onDeleteNotebook}
            onAddProject={onAddProject}
            onRenameProject={onRenameProject}
            onDeleteProject={onDeleteProject}
            onMoveNotebook={onMoveNotebook}
            activeNotebookId={activeNotebookId}
          />
        ))}

        {/* Root notebooks */}
        {rootChildren.notebooks.map((notebook) => (
          <NotebookItem
            key={notebook.id}
            notebook={notebook}
            level={0}
            isActive={notebook.id === activeNotebookId}
            onSelectNotebook={onSelectNotebook}
            onDeleteNotebook={onDeleteNotebook}
          />
        ))}

        {rootChildren.projects.length === 0 && rootChildren.notebooks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No hay notebooks
          </div>
        )}
      </div>
    </div>
  );
}
