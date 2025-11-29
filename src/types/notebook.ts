export type CellType = 'markdown' | 'drawing' | 'image' | 'pdf';
export type MiniCellType = 'markdown' | 'drawing' | 'image';

export interface BaseCell {
  id: string;
  type: CellType;
  createdAt: number;
  updatedAt: number;
}

export interface MarkdownCell extends BaseCell {
  type: 'markdown';
  content: string;
}

export interface DrawingCell extends BaseCell {
  type: 'drawing';
  dataUrl: string;
  width: number;
  height: number;
}

export interface ImageCell extends BaseCell {
  type: 'image';
  dataUrl: string;
  alt: string;
}

// Mini cells for PDF notes column
export interface MiniMarkdownCell {
  id: string;
  type: 'markdown';
  content: string;
}

export type MiniBackgroundType = 'blank' | 'grid' | 'lines' | 'dots';

export interface MiniDrawingCell {
  id: string;
  type: 'drawing';
  dataUrl: string;
  height: number;
  background: MiniBackgroundType;
}

export interface MiniImageCell {
  id: string;
  type: 'image';
  dataUrl: string;
  alt: string;
}

export type MiniCell = MiniMarkdownCell | MiniDrawingCell | MiniImageCell;

export interface PDFPage {
  id: string;
  pageNumber: number | null; // null si es página custom agregada
  drawingDataUrl: string; // capa de dibujo sobre el PDF
  notes: string; // legacy - notas en markdown para la columna derecha
  noteCells: MiniCell[]; // nuevo - array de mini celdas
  isCustomPage: boolean; // true si es página insertada por usuario
  customDrawingDataUrl?: string; // dibujo de página custom (sin PDF de fondo)
}

export interface PDFCell extends BaseCell {
  type: 'pdf';
  pdfData: string; // base64 del PDF
  fileName: string;
  pages: PDFPage[];
  totalOriginalPages: number;
}

export type Cell = MarkdownCell | DrawingCell | ImageCell | PDFCell;

export interface Notebook {
  id: string;
  title: string;
  cells: Cell[];
  createdAt: number;
  updatedAt: number;
  projectId?: string; // ID del proyecto al que pertenece
}

export interface Project {
  id: string;
  name: string;
  parentId: string | null; // null = proyecto raíz
  createdAt: number;
  updatedAt: number;
}

export interface ProjectStore {
  projects: Project[];
  notebooks: Notebook[];
  activeNotebookId: string | null;
}
