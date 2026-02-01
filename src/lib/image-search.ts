import { v4 as uuidv4 } from 'uuid';

export interface SearchResult {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
}

export type SearchSource = 'duckduckgo' | 'mercadolibre';

/**
 * Busca imágenes de productos en Mercado Libre
 * Usa DuckDuckGo con filtro de sitio para obtener imágenes de ML
 * (La API directa de ML requiere autenticación)
 */
export async function searchMercadoLibre(query: string, count: number = 3): Promise<SearchResult[]> {
  // Buscar en DuckDuckGo con el término + "mercado libre" para obtener imágenes de productos ML
  const mlQuery = `${query} mercado libre producto`;
  
  const results = await searchDuckDuckGo(mlQuery, count);
  
  if (results.length > 0) {
    console.log(`Found ${results.length} ML-related images for: ${query}`);
    return results;
  }
  
  // Fallback: búsqueda normal si no encuentra nada
  console.log('No ML images found, falling back to general search');
  return searchDuckDuckGo(query, count);
}

/**
 * Busca imágenes usando la fuente especificada
 */
export async function searchImages(
  query: string, 
  count: number = 3, 
  source: SearchSource = 'duckduckgo'
): Promise<SearchResult[]> {
  if (source === 'mercadolibre') {
    return searchMercadoLibre(query, count);
  }
  return searchDuckDuckGo(query, count);
}

// Primary search using Bing (more reliable for server-side)
async function searchDuckDuckGo(query: string, count: number = 3): Promise<SearchResult[]> {
  // Use Bing as primary since DuckDuckGo blocks server requests
  return await searchBing(query, count);
}

// Bing image search (scraping)
async function searchBing(query: string, count: number): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1&count=${count * 3}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      }
    );
    
    const html = await response.text();
    
    // Extract image URLs from Bing's response
    const imgMatches = html.matchAll(/murl&quot;:&quot;(https?:\/\/[^&]+)&quot;/g);
    const results: SearchResult[] = [];
    const seenUrls = new Set<string>();
    
    for (const match of imgMatches) {
      if (results.length >= count) break;
      
      let url = match[1].replace(/\\u002f/g, '/');
      
      // Skip duplicates
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);
      
      // Only include actual image files
      if (url.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
        results.push({
          id: uuidv4(),
          url: url,
          thumbnail: url,
          title: query
        });
      }
    }
    
    console.log(`Bing search found ${results.length} images for: ${query}`);
    return results;
  } catch (error) {
    console.error('Bing search error:', error);
    return [];
  }
}

// Download image and save locally
export async function downloadImage(url: string, filename: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const publicPath = path.join(process.cwd(), 'public', 'images', filename);
    await fs.writeFile(publicPath, Buffer.from(buffer));
    
    return `/images/${filename}`;
  } catch (error) {
    console.error('Download error:', error);
    return null;
  }
}
