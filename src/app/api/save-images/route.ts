import { NextRequest, NextResponse } from 'next/server';
import { createImage, getProductById, getImagesByProduct, deleteImage } from '@/lib/db';
import { downloadImage } from '@/lib/image-search';
import { v4 as uuidv4 } from 'uuid';

// Endpoint para guardar imágenes que vienen del cliente (ML client-side search)
export async function POST(request: NextRequest) {
  try {
    const { productId, images } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'Images array required' }, { status: 400 });
    }

    const product = getProductById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Limpiar imágenes existentes
    const existingImages = getImagesByProduct(productId);
    for (const img of existingImages) {
      deleteImage(img.id);
    }

    // Guardar nuevas imágenes
    const savedImages = [];

    for (const imageUrl of images) {
      const imageId = uuidv4();
      const ext = imageUrl.match(/\.(jpg|jpeg|png|webp|gif)/i)?.[1] || 'jpg';
      const filename = `${productId}_${imageId}.${ext}`;

      // Descargar la imagen
      const localPath = await downloadImage(imageUrl, filename);

      // Guardar en DB
      createImage(imageId, productId, imageUrl, localPath || undefined);

      savedImages.push({
        id: imageId,
        url: imageUrl,
        localPath,
        selected: true,
      });
    }

    return NextResponse.json({
      success: true,
      images: savedImages,
      product: product.name,
    });
  } catch (error) {
    console.error('Save images error:', error);
    return NextResponse.json({ error: 'Failed to save images' }, { status: 500 });
  }
}
