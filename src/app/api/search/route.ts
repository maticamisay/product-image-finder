import { NextRequest, NextResponse } from 'next/server';
import { searchImages, downloadImage, SearchSource } from '@/lib/image-search';
import { getProductById, createImage, getImagesByProduct, deleteImage } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { productId, count = 3, source = 'duckduckgo' } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    const product = getProductById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Clear existing images for this product
    const existingImages = getImagesByProduct(productId);
    for (const img of existingImages) {
      deleteImage(img.id);
    }

    // Search for images
    const searchResults = await searchImages(product.name, count, source as SearchSource);

    if (searchResults.length === 0) {
      return NextResponse.json({ 
        success: true, 
        images: [],
        message: 'No images found for this product'
      });
    }

    // Download and save images
    const savedImages = [];
    
    for (const result of searchResults) {
      const imageId = uuidv4();
      const ext = result.url.match(/\.(jpg|jpeg|png|webp|gif)/i)?.[1] || 'jpg';
      const filename = `${productId}_${imageId}.${ext}`;
      
      const localPath = await downloadImage(result.url, filename);
      
      createImage(imageId, productId, result.url, localPath || undefined);
      
      savedImages.push({
        id: imageId,
        url: result.url,
        localPath,
        selected: true
      });
    }

    return NextResponse.json({ 
      success: true, 
      images: savedImages,
      product: product.name
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Failed to search images' }, { status: 500 });
  }
}

// Search all products that don't have images yet
export async function PUT(request: NextRequest) {
  try {
    const { count = 3, source = 'duckduckgo' } = await request.json();
    const { getAllProducts } = await import('@/lib/db');
    
    const products = getAllProducts();
    const results = [];

    for (const product of products) {
      const existingImages = getImagesByProduct(product.id);
      
      if (existingImages.length === 0) {
        // Search for this product
        const searchResults = await searchImages(product.name, count, source as SearchSource);
        
        for (const result of searchResults) {
          const imageId = uuidv4();
          const ext = result.url.match(/\.(jpg|jpeg|png|webp|gif)/i)?.[1] || 'jpg';
          const filename = `${product.id}_${imageId}.${ext}`;
          
          const localPath = await downloadImage(result.url, filename);
          createImage(imageId, product.id, result.url, localPath || undefined);
        }
        
        results.push({
          product: product.name,
          imagesFound: searchResults.length
        });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: results.length,
      results
    });
  } catch (error) {
    console.error('Bulk search error:', error);
    return NextResponse.json({ error: 'Failed to search images' }, { status: 500 });
  }
}
