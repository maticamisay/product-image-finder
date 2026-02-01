import { v4 as uuidv4 } from 'uuid';

export interface SearchResult {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
}

export type SearchSource = 'duckduckgo' | 'mercadolibre';

// Cache del token de ML
let mlTokenCache: { token: string; expiresAt: number } | null = null;

/**
 * Obtiene un access token de ML usando client_credentials
 */
async function getMLToken(): Promise<string | null> {
  // Si hay token en cache y no expiró, usarlo
  if (mlTokenCache && Date.now() < mlTokenCache.expiresAt) {
    return mlTokenCache.token;
  }

  const appId = process.env.ML_APP_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;

  if (!appId || !clientSecret) {
    return null;
  }

  try {
    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: appId,
        client_secret: clientSecret,
      }),
    });

    const data = await response.json();

    if (data.access_token) {
      mlTokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + (5 * 60 * 60 * 1000), // 5 horas
      };
      return data.access_token;
    }
  } catch (error) {
    console.error('Error getting ML token:', error);
  }

  return null;
}

/**
 * Busca imágenes de productos en Mercado Libre Argentina
 * Intenta con autenticación primero, luego sin ella
 */
export async function searchMercadoLibre(query: string, count: number = 3): Promise<SearchResult[]> {
  try {
    // Intentar obtener token
    const token = await getMLToken();
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `https://api.mercadolibre.com/sites/MLA/search?q=${encodeURIComponent(query)}&limit=${count}`,
      { headers }
    );

    if (!response.ok) {
      console.error('Mercado Libre API error:', response.status);
      // Fallback a Bing si ML falla
      return searchBing(query, count);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.log('No results from ML, falling back to Bing');
      return searchBing(query, count);
    }

    const results: SearchResult[] = data.results.slice(0, count).map((product: any) => ({
      id: uuidv4(),
      // Convertir thumbnail a alta calidad (-I.jpg -> -O.jpg)
      url: product.thumbnail?.replace('-I.jpg', '-O.jpg') || product.thumbnail,
      thumbnail: product.thumbnail,
      title: product.title || query
    }));

    console.log(`Found ${results.length} images from Mercado Libre for: ${query}`);
    return results;
  } catch (error) {
    console.error('Mercado Libre search error:', error);
    // Fallback a Bing
    return searchBing(query, count);
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

// Primary search using Bing (more reliable for server-side)
async function searchDuckDuckGo(query: string, count: number = 3): Promise<SearchResult[]> {
  // Use Bing as primary since DuckDuckGo blocks server requests
  return await searchBing(query, count);
}

// Dominios problemáticos que bloquean descargas
const BLOCKED_DOMAINS = [
  'shutterstock.com',
  'gettyimages.com',
  'alamy.com',
  'istockphoto.com',
  'dreamstime.com',
  'depositphotos.com',
  '123rf.com',
  'adobe.com',
  'stock.adobe.com',
  'scribd',
  'fbsbx.com',
  'lookaside.fbsbx.com',
];

// Bing image search (scraping)
async function searchBing(query: string, count: number): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1&count=${count * 5}`,
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
      
      // Skip blocked domains
      const isBlocked = BLOCKED_DOMAINS.some(domain => url.includes(domain));
      if (isBlocked) continue;
      
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
    // Intentar con varios User-Agents si falla
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    ];

    let response: Response | null = null;
    
    for (const ua of userAgents) {
      try {
        response = await fetch(url, {
          headers: {
            'User-Agent': ua,
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
            'Referer': 'https://www.google.com/',
          },
          redirect: 'follow',
        });
        
        if (response.ok) break;
      } catch (e) {
        continue;
      }
    }
    
    if (!response || !response.ok) {
      console.log(`Could not download image, saving URL only: ${url}`);
      // No pudimos descargar, pero guardamos la URL para mostrar directo
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    
    // Verificar que sea una imagen válida (al menos 1KB)
    if (buffer.byteLength < 1024) {
      console.log('Image too small, probably invalid');
      return null;
    }
    
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Asegurar que el directorio existe
    const imagesDir = path.join(process.cwd(), 'public', 'images');
    await fs.mkdir(imagesDir, { recursive: true });
    
    const publicPath = path.join(imagesDir, filename);
    await fs.writeFile(publicPath, Buffer.from(buffer));
    
    return `/images/${filename}`;
  } catch (error) {
    console.error('Download error:', error);
    return null;
  }
}
