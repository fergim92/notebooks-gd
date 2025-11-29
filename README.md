# Notebooks GD

Aplicacion de cuadernos digitales para tomar notas con soporte para Markdown, dibujos y PDFs.

## Caracteristicas

- **Celdas de Markdown**: Escribe notas con formato usando Markdown con soporte para GFM (GitHub Flavored Markdown)
- **Celdas de Dibujo**: Dibuja con lapiz, formas (lineas, flechas, rectangulos, circulos), goma de borrar gruesa y fondos personalizables (cuadricula, lineas, puntos)
- **Celdas de Imagen**: Arrastra, pega o selecciona imagenes
- **Visor de PDF**: Carga PDFs, dibuja sobre las paginas y toma notas en una columna lateral con mini-celdas
- **Proyectos**: Organiza tus cuadernos en proyectos y subproyectos
- **Modo oscuro/claro**: Soporte completo para ambos temas
- **Almacenamiento local**: Los datos se guardan en localStorage del navegador

## Requisitos

- Node.js 18+
- npm o yarn

## Instalacion

1. Clonar el repositorio:
```bash
git clone git@github.com:fergim92/notebooks-gd.git
cd notebooks-gd
```

2. Instalar dependencias:
```bash
npm install
```

3. Ejecutar en modo desarrollo:
```bash
npm run dev
```

4. Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## Build para produccion

```bash
npm run build
npm start
```

## Tecnologias

- [Next.js 16](https://nextjs.org/) - Framework React
- [React 19](https://react.dev/) - Biblioteca UI
- [TypeScript](https://www.typescriptlang.org/) - Tipado estatico
- [Tailwind CSS 4](https://tailwindcss.com/) - Estilos
- [shadcn/ui](https://ui.shadcn.com/) - Componentes UI
- [react-pdf](https://react-pdf.org/) - Renderizado de PDFs
- [react-markdown](https://github.com/remarkjs/react-markdown) - Renderizado de Markdown

## Estructura del proyecto

```
src/
├── app/              # App Router de Next.js
│   ├── globals.css   # Estilos globales y tema
│   ├── layout.tsx    # Layout principal
│   └── page.tsx      # Pagina principal
├── components/       # Componentes React
│   ├── DrawingCell.tsx
│   ├── ImageCell.tsx
│   ├── MarkdownCell.tsx
│   ├── MiniNotebook.tsx
│   ├── PDFCell.tsx
│   └── Sidebar.tsx
├── lib/              # Utilidades
└── types/            # Tipos TypeScript
    └── notebook.ts
```

## Licencia

MIT
