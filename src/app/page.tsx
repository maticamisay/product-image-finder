'use client';

import { useState, useEffect, useCallback } from 'react';
import { Upload, Search, Download, Trash2, Check, X, RefreshCw, Image as ImageIcon } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  imageCount: number;
  selectedCount: number;
}

interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  local_path: string | null;
  selected: number;
}

type SearchSource = 'duckduckgo' | 'mercadolibre';

interface SearchStatus {
  productId: string;
  status: 'searching' | 'success' | 'error' | 'no-results';
  count?: number;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchingAll, setSearchingAll] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [searchSource, setSearchSource] = useState<SearchSource>('mercadolibre');
  const [searchingProducts, setSearchingProducts] = useState<Set<string>>(new Set());
  const [searchStatuses, setSearchStatuses] = useState<Map<string, SearchStatus>>(new Map());

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data.products || []);
  }, []);

  const fetchProductImages = useCallback(async (productId: string) => {
    const res = await fetch(`/api/images?productId=${productId}`);
    const data = await res.json();
    setProductImages(data.images || []);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (selectedProduct) {
      fetchProductImages(selectedProduct.id);
    }
  }, [selectedProduct, fetchProductImages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setUploadStatus('Procesando archivo...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('clear', 'true');

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        setUploadStatus(`✓ ${data.count} productos importados (columna: ${data.columnUsed})`);
        fetchProducts();
      } else {
        setUploadStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setUploadStatus('Error al procesar archivo');
    } finally {
      setLoading(false);
    }
  };

  const searchProductImages = async (productId: string) => {
    // Agregar a productos buscando
    setSearchingProducts(prev => new Set(prev).add(productId));
    setSearchStatuses(prev => new Map(prev).set(productId, { productId, status: 'searching' }));
    
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, count: 3, source: searchSource })
      });
      const data = await res.json();
      
      // Actualizar estado según resultado
      const imagesFound = data.images?.length || 0;
      setSearchStatuses(prev => new Map(prev).set(productId, { 
        productId, 
        status: imagesFound > 0 ? 'success' : 'no-results',
        count: imagesFound
      }));
      
      if (selectedProduct?.id === productId) {
        fetchProductImages(productId);
      }
      fetchProducts();
      
      // Limpiar estado después de 3 segundos
      setTimeout(() => {
        setSearchStatuses(prev => {
          const next = new Map(prev);
          next.delete(productId);
          return next;
        });
      }, 3000);
      
    } catch (err) {
      console.error('Search error:', err);
      setSearchStatuses(prev => new Map(prev).set(productId, { productId, status: 'error' }));
      
      setTimeout(() => {
        setSearchStatuses(prev => {
          const next = new Map(prev);
          next.delete(productId);
          return next;
        });
      }, 3000);
    } finally {
      setSearchingProducts(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const searchAllProducts = async () => {
    setSearchingAll(true);
    try {
      const res = await fetch('/api/search', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 3, source: searchSource })
      });
      await res.json();
      fetchProducts();
      if (selectedProduct) {
        fetchProductImages(selectedProduct.id);
      }
    } catch (err) {
      console.error('Search all error:', err);
    } finally {
      setSearchingAll(false);
    }
  };

  const toggleImageSelection = async (imageId: string, currentSelected: boolean) => {
    await fetch('/api/images', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageId, selected: !currentSelected })
    });
    
    if (selectedProduct) {
      fetchProductImages(selectedProduct.id);
      fetchProducts();
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('¿Eliminar este producto y sus imágenes?')) return;
    
    await fetch(`/api/products?id=${productId}`, { method: 'DELETE' });
    
    if (selectedProduct?.id === productId) {
      setSelectedProduct(null);
      setProductImages([]);
    }
    fetchProducts();
  };

  const exportData = async (format: 'json' | 'excel') => {
    if (format === 'excel') {
      window.open('/api/export?format=excel', '_blank');
    } else {
      const res = await fetch('/api/export?format=json');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'productos-imagenes.json';
      a.click();
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <ImageIcon className="w-8 h-8 text-blue-400" />
          Product Image Finder
        </h1>

        {/* Upload Section */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">1. Subir Excel</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-700 transition">
              <Upload className="w-5 h-5" />
              Seleccionar archivo
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleUpload} className="hidden" />
            </label>
            
            {uploadStatus && (
              <span className={`text-sm ${uploadStatus.startsWith('✓') ? 'text-green-400' : uploadStatus.startsWith('Error') ? 'text-red-400' : 'text-gray-400'}`}>
                {uploadStatus}
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Excel debe tener una columna con nombres de productos (busca: nombre, product, name)
          </p>
        </div>

        {/* Actions */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">2. Buscar imágenes</h2>
          
          {/* Search Source Selector */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-gray-400">Fuente:</span>
            <div className="flex rounded-lg overflow-hidden">
              <button
                onClick={() => setSearchSource('mercadolibre')}
                className={`px-4 py-2 text-sm font-medium transition ${
                  searchSource === 'mercadolibre'
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🛒 Mercado Libre
              </button>
              <button
                onClick={() => setSearchSource('duckduckgo')}
                className={`px-4 py-2 text-sm font-medium transition ${
                  searchSource === 'duckduckgo'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🦆 DuckDuckGo
              </button>
            </div>
            <span className="text-sm text-gray-500">
              {searchSource === 'mercadolibre' 
                ? 'Imágenes de productos reales de ML' 
                : 'Búsqueda general de imágenes'}
            </span>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={searchAllProducts}
              disabled={searchingAll || products.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searchingAll ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {searchingAll ? 'Buscando...' : 'Buscar imágenes para todos'}
            </button>
            
            <button
              onClick={() => exportData('excel')}
              disabled={products.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              Exportar Excel
            </button>
            
            <button
              onClick={() => exportData('json')}
              disabled={products.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              Exportar JSON
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products List */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">
              Productos ({products.length})
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {products.map(product => (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`p-3 rounded-lg cursor-pointer transition flex justify-between items-center ${
                    selectedProduct?.id === product.id 
                      ? 'bg-blue-600' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="text-sm text-gray-400">
                      {product.imageCount > 0 
                        ? `${product.selectedCount}/${product.imageCount} seleccionadas`
                        : 'Sin imágenes'}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-2 items-center">
                    {/* Status indicator */}
                    {searchStatuses.get(product.id) && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        searchStatuses.get(product.id)?.status === 'success' 
                          ? 'bg-green-600 text-green-100' 
                          : searchStatuses.get(product.id)?.status === 'no-results'
                          ? 'bg-yellow-600 text-yellow-100'
                          : searchStatuses.get(product.id)?.status === 'error'
                          ? 'bg-red-600 text-red-100'
                          : ''
                      }`}>
                        {searchStatuses.get(product.id)?.status === 'success' 
                          ? `✓ ${searchStatuses.get(product.id)?.count} imgs`
                          : searchStatuses.get(product.id)?.status === 'no-results'
                          ? 'Sin resultados'
                          : searchStatuses.get(product.id)?.status === 'error'
                          ? 'Error'
                          : ''}
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); searchProductImages(product.id); }}
                      disabled={searchingProducts.has(product.id)}
                      className={`p-1.5 rounded transition ${
                        searchingProducts.has(product.id)
                          ? 'bg-blue-600 cursor-wait'
                          : 'bg-gray-600 hover:bg-gray-500'
                      }`}
                      title="Buscar imágenes"
                    >
                      {searchingProducts.has(product.id) 
                        ? <RefreshCw className="w-4 h-4 animate-spin" />
                        : <Search className="w-4 h-4" />
                      }
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteProduct(product.id); }}
                      className="p-1.5 rounded bg-red-600/50 hover:bg-red-600"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {products.length === 0 && (
                <p className="text-gray-400 text-center py-8">
                  Sube un archivo Excel para comenzar
                </p>
              )}
            </div>
          </div>

          {/* Image Preview */}
          <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">
              {selectedProduct 
                ? `Imágenes: ${selectedProduct.name}`
                : 'Selecciona un producto'}
            </h2>
            
            {selectedProduct ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {productImages.map(image => (
                  <div
                    key={image.id}
                    className={`relative rounded-lg overflow-hidden border-2 transition ${
                      image.selected ? 'border-green-500' : 'border-transparent opacity-50'
                    }`}
                  >
                    <img
                      src={image.local_path || image.url}
                      alt=""
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = image.url;
                      }}
                    />
                    <button
                      onClick={() => toggleImageSelection(image.id, image.selected === 1)}
                      className={`absolute top-2 right-2 p-2 rounded-full transition ${
                        image.selected 
                          ? 'bg-green-500 hover:bg-green-600' 
                          : 'bg-gray-600 hover:bg-gray-500'
                      }`}
                    >
                      {image.selected ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
                
                {productImages.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-400">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay imágenes. Haz clic en buscar para encontrar imágenes.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Selecciona un producto de la lista para ver sus imágenes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
