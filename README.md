# Product Image Finder

Herramienta para buscar y gestionar imágenes de productos a partir de un listado Excel.

## Funcionalidades

- **Importar Excel**: Sube un archivo Excel con nombres de productos
- **Búsqueda automática**: Busca 3 imágenes por producto usando DuckDuckGo
- **Previsualización**: Interfaz web para ver todas las imágenes encontradas
- **Selección**: Elige qué imágenes quieres conservar para cada producto
- **Exportar**: Descarga un Excel o JSON con los productos y sus imágenes seleccionadas

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
```

## Uso

```bash
npm run dev
```

Abrir http://localhost:3000

## Flujo de trabajo

1. **Subir Excel** - El archivo debe tener una columna con nombres de productos (busca automáticamente columnas llamadas "nombre", "product" o "name")

2. **Buscar imágenes** - Puedes buscar para todos los productos a la vez o uno por uno

3. **Seleccionar** - Haz clic en las imágenes para seleccionar/deseleccionar

4. **Exportar** - Descarga el resultado en Excel o JSON para usar en Middas

## Estructura del Excel

El Excel de entrada solo necesita una columna con nombres de productos:

| Nombre |
|--------|
| Coca Cola 500ml |
| Pan Bimbo |
| Leche La Serenísima |

## API Endpoints

- `POST /api/upload` - Subir Excel
- `GET /api/products` - Listar productos
- `POST /api/search` - Buscar imágenes para un producto
- `PUT /api/search` - Buscar imágenes para todos
- `GET /api/images?productId=X` - Ver imágenes de un producto
- `PATCH /api/images` - Cambiar selección de imagen
- `GET /api/export?format=json|excel` - Exportar datos

## Datos

- Base de datos SQLite: `data/products.db`
- Imágenes descargadas: `public/images/`
