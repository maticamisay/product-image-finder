import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { createProduct, clearAllData } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const columnName = formData.get('column') as string || 'nombre';
    const clearExisting = formData.get('clear') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Clear existing data if requested
    if (clearExisting) {
      clearAllData();
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet) as Record<string, unknown>[];

    if (data.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 });
    }

    // Find the column (case-insensitive)
    const headers = Object.keys(data[0]);
    const productColumn = headers.find(
      h => h.toLowerCase() === columnName.toLowerCase()
    ) || headers.find(
      h => h.toLowerCase().includes('nombre') || h.toLowerCase().includes('product') || h.toLowerCase().includes('name')
    );

    if (!productColumn) {
      return NextResponse.json({ 
        error: `Column "${columnName}" not found. Available columns: ${headers.join(', ')}`,
        headers 
      }, { status: 400 });
    }

    const products: { id: string; name: string }[] = [];
    
    for (const row of data) {
      const name = String(row[productColumn] || '').trim();
      if (name) {
        const id = uuidv4();
        createProduct(id, name);
        products.push({ id, name });
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: products.length,
      products,
      columnUsed: productColumn
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}
