import { v4 as uuidv4 } from 'uuid';

export interface SearchResult {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
}

export type SearchSource = 'duckduckgo' | 'mercadolibre';

/**
 * Busca imágenes en Mercado Libre Argentina
 * Usa la API pública de ML para obtener productos y sus imágenes
 */
export async function searchMercadoLibre(query: string, count: number = 3): Promise<SearchResult[]> {
  try {
    // API pública de Mercado Libre Argentina
    const response = await fetch(
      `https://api.mercadolibre.com/sites/MLA/search?q=${encodeURIComponent(query)}&limit=${count}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('Mercado Libre API error:', response.status);
      return [];
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.log('No results found in Mercado Libre for:', query);
      return [];
    }

    const results: SearchResult[] = [];

    // Para cada producto, obtener sus imágenes
    for (const product of data.results.slice(0, count)) {
      // La imagen principal está en thumbnail, pero podemos obtener mejor calidad
      // reemplazando el tamaño en la URL
      const imageUrl = product.thumbnail?.replace(/-I\.jpg$/, '-O.jpg') || product.thumbnail;
      
      if (imageUrl) {
        results.push({
          id: uuidv4(),
          url: imageUrl,
          thumbnail: product.thumbnail || imageUrl,
          title: product.title || query
        });
      }
    }

    console.log(`Found ${results.length} images from Mercado Libre for: ${query}`);
    return results;
  } catch (error) {
    console.error('Mercado Libre search error:', error);
    return [];
  }
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

// Using DuckDuckGo image search (no API key required)
async function searchDuckDuckGo(query: string, count: number = 3): Promise<SearchResult[]> {
  try {
    // Use DuckDuckGo's image search via their vqd token system
    const tokenResponse = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    const html = await tokenResponse.text();
    const vqdMatch = html.match(/vqd=['"]([^'"]+)['"]/);
    
    if (!vqdMatch) {
      console.error('Could not extract vqd token');
      return await fallbackSearch(query, count);
    }

    const vqd = vqdMatch[1];
    
    const searchResponse = await fetch(
      `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      }
    );

    const data = await searchResponse.json();
    
    if (!data.results || data.results.length === 0) {
      return await fallbackSearch(query, count);
    }

    return data.results.slice(0, count).map((result: { image: string; thumbnail: string; title: string }) => ({
      id: uuidv4(),
      url: result.image,
      thumbnail: result.thumbnail,
      title: result.title
    }));
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return await fallbackSearch(query, count);
  }
}

// Fallback using Bing (scraping, less reliable)
async function fallbackSearch(query: string, count: number): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1&count=${count * 2}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    const html = await response.text();
    
    // Extract image URLs from Bing's response
    const imgMatches = html.matchAll(/murl&quot;:&quot;(https?:\/\/[^&]+)&quot;/g);
    const results: SearchResult[] = [];
    
    for (const match of imgMatches) {
      if (results.length >= count) break;
      
      const url = match[1].replace(/\\u002f/g, '/');
      if (url.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
        results.push({
          id: uuidv4(),
          url: url,
          thumbnail: url,
          title: query
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Fallback search error:', error);
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
