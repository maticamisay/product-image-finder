import { NextRequest, NextResponse } from 'next/server';
import { getAllProducts, deleteProduct, getImagesByProduct } from '@/lib/db';

export async function GET() {
  try {
    const products = getAllProducts();
    
    // Include image counts
    const productsWithImages = products.map(product => {
      const images = getImagesByProduct(product.id);
      const selectedCount = images.filter(img => img.selected === 1).length;
      return {
        ...product,
        imageCount: images.length,
        selectedCount
      };
    });

    return NextResponse.json({ products: productsWithImages });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ error: 'Failed to get products' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    deleteProduct(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
