// Búsqueda de Mercado Libre desde el cliente (browser)
// Esto evita el bloqueo por IP que tiene ML para servidores/datacenters

export interface MLProduct {
  id: string;
  title: string;
  thumbnail: string;
  price: number;
  permalink: string;
}

export interface MLSearchResult {
  success: boolean;
  products: MLProduct[];
  error?: string;
}

/**
 * Busca productos en Mercado Libre Argentina
 * DEBE ejecutarse desde el navegador (client-side)
 */
export async function searchMercadoLibre(query: string, limit: number = 3): Promise<MLSearchResult> {
  try {
    const response = await fetch(
      `https://api.mercadolibre.com/sites/MLA/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 403) {
        return {
          success: false,
          products: [],
          error: 'Mercado Libre bloqueó la solicitud. Intenta recargar la página.',
        };
      }
      return {
        success: false,
        products: [],
        error: `Error HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return {
        success: true,
        products: [],
      };
    }

    const products: MLProduct[] = data.results.map((item: any) => ({
      id: item.id,
      title: item.title,
      // Convertir thumbnail a alta calidad (-I.jpg -> -O.jpg)
      thumbnail: item.thumbnail?.replace('-I.jpg', '-O.jpg') || item.thumbnail,
      price: item.price,
      permalink: item.permalink,
    }));

    return {
      success: true,
      products,
    };
  } catch (error) {
    console.error('ML search error:', error);
    return {
      success: false,
      products: [],
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene las imágenes de un producto específico de ML
 */
export async function getProductImages(productId: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://api.mercadolibre.com/items/${productId}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    
    // Obtener todas las imágenes del producto en alta calidad
    if (data.pictures && Array.isArray(data.pictures)) {
      return data.pictures.map((pic: any) => 
        pic.secure_url || pic.url
      ).filter(Boolean);
    }

    return data.thumbnail ? [data.thumbnail.replace('-I.jpg', '-O.jpg')] : [];
  } catch (error) {
    console.error('Error getting product images:', error);
    return [];
  }
}
