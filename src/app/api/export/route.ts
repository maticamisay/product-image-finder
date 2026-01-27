import { NextRequest, NextResponse } from 'next/server';
import { getAllProducts, getSelectedImagesByProduct } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    const products = getAllProducts();
    const exportData = products.map(product => {
      const images = getSelectedImagesByProduct(product.id);
      return {
        id: product.id,
        name: product.name,
        images: images.map(img => ({
          url: img.url,
          localPath: img.local_path
        }))
      };
    });

    if (format === 'json') {
      return NextResponse.json({ products: exportData });
    }

    if (format === 'excel') {
      const rows = exportData.flatMap(product => 
        product.images.map((img, idx) => ({
          'Producto': product.name,
          'Imagen #': idx + 1,
          'URL': img.url,
          'Ruta Local': img.localPath
        }))
      );

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Productos');
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=productos-imagenes.xlsx'
        }
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
