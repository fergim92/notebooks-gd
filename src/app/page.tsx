'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useProjects } from '@/hooks/useProjects';
import { useTheme } from '@/hooks/useTheme';
import MarkdownCell from '@/components/MarkdownCell';
import DrawingCell from '@/components/DrawingCell';
import ImageCell from '@/components/ImageCell';
import Sidebar from '@/components/Sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { CellType, MarkdownCell as MarkdownCellType, DrawingCell as DrawingCellType, ImageCell as ImageCellType, PDFCell as PDFCellType } from '@/types/notebook';

// Quick links for footer
interface QuickLink {
  id: string;
  name: string;
  url: string;
  icon?: string;
}

const defaultLinks: QuickLink[] = [
  { id: '1', name: 'Claude', url: 'https://claude.ai', icon: '🤖' },
  { id: '2', name: 'Gemini', url: 'https://gemini.google.com', icon: '✨' },
  { id: '3', name: 'ChatGPT', url: 'https://chat.openai.com', icon: '💬' },
  { id: '4', name: 'Grok', url: 'https://grok.com/', icon: '🦊' },
  { id: '5', name: 'DeepSeek', url: 'https://chat.deepseek.com', icon: '🔍' },
  { id: '6', name: 'Perplexity', url: 'https://perplexity.ai', icon: '🧠' },
  { id: '7', name: 'Wikipedia', url: 'https://wikipedia.org', icon: '📚' },
  { id: '8', name: 'X', url: 'https://x.com', icon: '𝕏' },
];

// Load PDFCell only on client side (pdf.js requires browser APIs)
const PDFCell = dynamic(() => import('@/components/PDFCell'), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center text-muted-foreground">
      Cargando visor de PDF...
    </div>
  ),
});

export default function Home() {
  const {
    store,
    isLoading,
    activeNotebook,
    getProjectChildren,
    addProject,
    renameProject,
    deleteProject,
    addNotebook,
    selectNotebook,
    deleteNotebook,
    moveNotebook,
    updateNotebookTitle,
    addCell,
    updateCell,
    deleteCell,
    moveCell,
    exportNotebook,
    importNotebook,
    clearNotebook,
  } = useProjects();

  const { theme, toggleTheme, mounted } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(defaultLinks);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkIcon, setNewLinkIcon] = useState('🔗');

  // Load custom links from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('quickLinks');
    if (saved) {
      setQuickLinks(JSON.parse(saved));
    }
  }, []);

  // Save links to localStorage
  const saveLinks = (links: QuickLink[]) => {
    setQuickLinks(links);
    localStorage.setItem('quickLinks', JSON.stringify(links));
  };

  const addLink = () => {
    if (!newLinkName || !newLinkUrl) return;
    const newLink: QuickLink = {
      id: Date.now().toString(),
      name: newLinkName,
      url: newLinkUrl.startsWith('http') ? newLinkUrl : `https://${newLinkUrl}`,
      icon: newLinkIcon || '🔗',
    };
    saveLinks([...quickLinks, newLink]);
    setNewLinkName('');
    setNewLinkUrl('');
    setNewLinkIcon('🔗');
    setShowAddLink(false);
  };

  const removeLink = (id: string) => {
    saveLinks(quickLinks.filter(l => l.id !== id));
  };

  const resetLinks = () => {
    saveLinks(defaultLinks);
  };

  if (isLoading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!store) {
    return null;
  }

  const handleAddCell = (type: CellType, afterId?: string) => {
    addCell(type, afterId);
  };

  const AddCellButtons = ({ afterId }: { afterId?: string; isFirst?: boolean }) => (
    <div className="flex items-center justify-center gap-1 opacity-0 hover:opacity-100 transition-opacity py-0.5">
      <button
        onClick={() => handleAddCell('markdown', afterId)}
        className="px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
      >
        +Md
      </button>
      <span className="text-border">|</span>
      <button
        onClick={() => handleAddCell('drawing', afterId)}
        className="px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
      >
        +Dibujo
      </button>
      <span className="text-border">|</span>
      <button
        onClick={() => handleAddCell('image', afterId)}
        className="px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
      >
        +Img
      </button>
      <span className="text-border">|</span>
      <button
        onClick={() => handleAddCell('pdf', afterId)}
        className="px-2 py-0.5 text-xs text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
      >
        +PDF
      </button>
    </div>
  );

  return (
    <div className="h-screen flex bg-background transition-colors">
      {/* Sidebar */}
      <Sidebar
        projects={store.projects}
        notebooks={store.notebooks}
        activeNotebookId={store.activeNotebookId}
        getProjectChildren={getProjectChildren}
        onSelectNotebook={selectNotebook}
        onAddNotebook={addNotebook}
        onDeleteNotebook={deleteNotebook}
        onAddProject={addProject}
        onRenameProject={renameProject}
        onDeleteProject={deleteProject}
        onMoveNotebook={moveNotebook}
        onImportNotebook={importNotebook}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Compact toolbar */}
        {activeNotebook && (
          <div className="flex items-center gap-2 px-2 py-1 bg-background border-b border-border">
            <input
              type="text"
              value={activeNotebook.title}
              onChange={(e) => updateNotebookTitle(activeNotebook.id, e.target.value)}
              className="flex-1 text-sm font-medium text-foreground bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-ring rounded px-1"
            />
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exportNotebook} title="Exportar">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={clearNotebook} title="Borrar contenido">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </Button>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto px-2 pt-0 pb-1">
          {!activeNotebook ? (
            <div className="text-center py-16">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h2 className="text-xl font-semibold text-muted-foreground mb-2">
                Selecciona un notebook
              </h2>
              <p className="text-muted-foreground/70 mb-6">
                Elige un notebook del panel lateral o crea uno nuevo
              </p>
              <button
                onClick={() => addNotebook()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Nuevo Notebook
              </button>
            </div>
          ) : activeNotebook.cells.length === 0 ? (
            <div className="text-center py-16">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h2 className="text-xl font-semibold text-muted-foreground mb-2">
                Tu notebook esta vacio
              </h2>
              <p className="text-muted-foreground/70 mb-6">
                Comienza agregando una celda de Markdown, dibujo o imagen
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={() => handleAddCell('markdown')}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Markdown
                </button>
                <button
                  onClick={() => handleAddCell('drawing')}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  + Dibujo
                </button>
                <button
                  onClick={() => handleAddCell('image')}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  + Imagen
                </button>
                <button
                  onClick={() => handleAddCell('pdf')}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  + PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <AddCellButtons isFirst />
              <div className="space-y-2">
                {activeNotebook.cells.map((cell) => (
                  <div key={cell.id} className="rounded-lg overflow-hidden shadow-sm border border-border">
                    {cell.type === 'markdown' && (
                      <MarkdownCell
                        cell={cell as MarkdownCellType}
                        onUpdate={(content) => updateCell(cell.id, { content })}
                        onDelete={() => deleteCell(cell.id)}
                        onMoveUp={() => moveCell(cell.id, 'up')}
                        onMoveDown={() => moveCell(cell.id, 'down')}
                      />
                    )}
                    {cell.type === 'drawing' && (
                      <DrawingCell
                        cell={cell as DrawingCellType}
                        onUpdate={(dataUrl) => updateCell(cell.id, { dataUrl })}
                        onDelete={() => deleteCell(cell.id)}
                        onMoveUp={() => moveCell(cell.id, 'up')}
                        onMoveDown={() => moveCell(cell.id, 'down')}
                      />
                    )}
                    {cell.type === 'image' && (
                      <ImageCell
                        cell={cell as ImageCellType}
                        onUpdate={(dataUrl, alt) => updateCell(cell.id, { dataUrl, alt })}
                        onDelete={() => deleteCell(cell.id)}
                        onMoveUp={() => moveCell(cell.id, 'up')}
                        onMoveDown={() => moveCell(cell.id, 'down')}
                      />
                    )}
                    {cell.type === 'pdf' && (
                      <PDFCell
                        cell={cell as PDFCellType}
                        onUpdate={(updates) => updateCell(cell.id, updates)}
                        onDelete={() => deleteCell(cell.id)}
                        onMoveUp={() => moveCell(cell.id, 'up')}
                        onMoveDown={() => moveCell(cell.id, 'down')}
                      />
                    )}
                  </div>
                ))}
              </div>
              <AddCellButtons afterId={activeNotebook.cells[activeNotebook.cells.length - 1]?.id} />
            </div>
          )}
        </main>

        {/* Quick Links Footer */}
        <footer className="border-t border-border bg-card px-2 py-1">
          <div className="flex items-center gap-1 overflow-x-auto">
            {/* Quick links */}
            {quickLinks.map((link) => (
              <div key={link.id} className="group/link relative flex-shrink-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-0.5 text-xs text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors"
                  title={link.name}
                >
                  <span>{link.icon}</span>
                  <span className="hidden sm:inline">{link.name}</span>
                </a>
                <button
                  onClick={() => removeLink(link.id)}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full text-[8px] leading-none opacity-0 group-hover/link:opacity-100 transition-opacity flex items-center justify-center"
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
            ))}

            {/* Separator */}
            <div className="w-px h-4 bg-border mx-1 flex-shrink-0" />

            {/* Add link button */}
            {showAddLink ? (
              <div className="flex items-center gap-1 flex-shrink-0">
                <input
                  type="text"
                  value={newLinkIcon}
                  onChange={(e) => setNewLinkIcon(e.target.value)}
                  className="w-6 px-1 py-0.5 text-xs border border-border rounded bg-card text-center text-foreground"
                  placeholder="🔗"
                  maxLength={2}
                />
                <input
                  type="text"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                  className="w-16 px-1 py-0.5 text-xs border border-border rounded bg-card text-foreground"
                  placeholder="Nombre"
                />
                <input
                  type="text"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="w-24 px-1 py-0.5 text-xs border border-border rounded bg-card text-foreground"
                  placeholder="URL"
                  onKeyDown={(e) => e.key === 'Enter' && addLink()}
                />
                <button
                  onClick={addLink}
                  className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  +
                </button>
                <button
                  onClick={() => setShowAddLink(false)}
                  className="px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddLink(true)}
                className="flex-shrink-0 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                title="Agregar link"
              >
                + Link
              </button>
            )}

            {/* Reset button */}
            <button
              onClick={resetLinks}
              className="flex-shrink-0 px-1 py-0.5 text-[10px] text-muted-foreground hover:text-foreground rounded"
              title="Restaurar links por defecto"
            >
              ↺
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
