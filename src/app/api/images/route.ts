import { NextRequest, NextResponse } from 'next/server';
import { getImagesByProduct, updateImageSelection, deleteImage } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    const images = getImagesByProduct(productId);
    return NextResponse.json({ images });
  } catch (error) {
    console.error('Get images error:', error);
    return NextResponse.json({ error: 'Failed to get images' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { imageId, selected } = await request.json();

    if (!imageId || typeof selected !== 'boolean') {
      return NextResponse.json({ error: 'Image ID and selected status required' }, { status: 400 });
    }

    updateImageSelection(imageId, selected);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update image error:', error);
    return NextResponse.json({ error: 'Failed to update image' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('id');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID required' }, { status: 400 });
    }

    // Get image info before deleting
    const { getImagesByProduct: _, ...db } = await import('@/lib/db');
    
    // Delete from database
    deleteImage(imageId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete image error:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
