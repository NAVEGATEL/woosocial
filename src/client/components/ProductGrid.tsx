import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import PromptGenerator from './PromptGenerator';
import { getCache, setCache } from '../utils/cache';
import { useTheme } from '../hooks/useTheme';

interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: string;
  status: string;
  featured: boolean;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  stock_quantity: number | null;
  stock_status: string;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: number;
    date_created: string;
    date_modified: string;
    src: string;
    name: string;
    alt: string;
  }>;
}

interface ProductGridProps {
  userId: number;
  selectedCategoryId?: number | 'all';
  onCategories?: (categories: Array<{ id: number; name: string }>) => void;
  stockFilter?: 'all' | 'instock' | 'outofstock';
  featureFilter?: 'all' | 'featured' | 'onsale';
  onChangeCategory?: (categoryId: number | 'all') => void;
  onChangeStock?: (stock: 'all' | 'instock' | 'outofstock') => void;
  onChangeFeature?: (feature: 'all' | 'featured' | 'onsale') => void;
}

// Dropdown con transición para filtros
const FilterDropdown = ({
  label,
  valueLabel,
  options,
  onSelect,
  className = 'w-56',
  theme = 'light'
}: {
  label: string;
  valueLabel: string;
  options: Array<{ value: any; label: string }>;
  onSelect: (value: any) => void;
  className?: string;
  theme?: 'light' | 'dark';
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointer = (e: MouseEvent | TouchEvent) => {
      if (!open) return;
      const target = e.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer as any, { passive: true } as any);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer as any);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <span className="text-gray-900 dark:text-gray-400">{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center justify-between px-2 h-8 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <span className="flex items-center gap-2">

          <span className="font-medium text-gray-900 dark:text-white">{valueLabel}</span>
        </span>
        <svg
          className={`h-4 w-4 text-gray-900 dark:text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      <div
        role="listbox"
        className={`absolute z-20 mt-2 w-full origin-top-right rounded-md bg-white dark:bg-gray-700 shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5 focus:outline-none transition-all duration-150 ease-out ${open ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
          }`}
      >
        <ul className="max-h-60 overflow-auto py-1">
          {options.map((opt) => (
            <li key={String(opt.value)}>
              <button
                type="button"
                onClick={() => {
                  onSelect(opt.value);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-white hover:bg-blue-50 dark:hover:bg-gray-600 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                role="option"
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const ProductGrid: React.FC<ProductGridProps> = ({ userId, selectedCategoryId = 'all', onCategories, stockFilter = 'all', featureFilter = 'all', onChangeCategory, onChangeStock, onChangeFeature }) => {
  const { theme } = useTheme();
  const [allProducts, setAllProducts] = useState<WooCommerceProduct[]>([]);
  const [products, setProducts] = useState<WooCommerceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error' | null>(null);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [search, setSearch] = useState('');
  const perPage = 15;

  // Estados para la funcionalidad de prompts
  const [selectedProduct, setSelectedProduct] = useState<WooCommerceProduct | null>(null);
  const [showPromptGenerator, setShowPromptGenerator] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');

  // Estado para controlar la animación de aparición
  const [isAnimating, setIsAnimating] = useState(false);
  const prevShowPromptGeneratorRef = useRef(false);


  // Opciones dinámicas para el filtro Especial
  const especialOptions: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'Todos' },
  ];
  let foundFeatured = false;
  let foundOnSale = false;
  let foundDescuento = false;
  // <-- Actualmente, usas products aquí (ya filtrados), ¡esto es correcto!
  for (const p of products) {
    if (p.featured) foundFeatured = true;
    if (p.on_sale || (p.sale_price && p.regular_price && p.sale_price !== p.regular_price)) foundOnSale = true;
    const nSale = Number(p.sale_price);
    const nRegular = Number(p.regular_price);
    if (!isNaN(nSale) && !isNaN(nRegular) && nSale < nRegular) foundDescuento = true;
  }

  const hayOpcionesEspeciales = especialOptions.length > 1;


  // Cargar TODOS los productos una sola vez (con caché)
  const fetchAllProducts = async () => {
    try {
      setError('');

      // 1) Si ya tenemos productos en memoria y la conexión está ok, reutilizar
      if (connectionStatus === 'connected' && allProducts.length > 0) {
        buildCategories(allProducts);
        applyFilterAndPaginate(allProducts, selectedCategoryId, 1);
        setLoading(false);
        return;
      }

      // Intentar desde caché primero para evitar llamadas innecesarias
      const cacheKey = `wc_all_products_${userId}_v1`;
      const cached = getCache<WooCommerceProduct[]>(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setAllProducts(cached);
        buildCategories(cached);
        applyFilterAndPaginate(cached, selectedCategoryId, 1);
        setConnectionStatus('connected');
        setLoading(false);
        return;
      }

      setLoading(true);
      setConnectionStatus('checking');

      const first = await apiService.getWooCommerceProducts(1, perPage);
      const gathered: WooCommerceProduct[] = [...first.products];
      const pages = first.totalPages || 1;
      for (let p = 2; p <= pages; p++) {
        try {
          const resp = await apiService.getWooCommerceProducts(p, perPage);
          gathered.push(...resp.products);
        } catch (_) {
          // continuar a pesar de errores intermedios
        }
      }
      // Deduplicar por id y ordenar de forma estable para evitar mezclas/flicker
      const byId = new Map<number, WooCommerceProduct>();
      for (const prod of gathered) {
        byId.set(prod.id, prod);
      }
      const deduped = Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true } as any));
      setAllProducts(deduped);
      setConnectionStatus('connected');
      buildCategories(deduped);
      applyFilterAndPaginate(deduped, selectedCategoryId, 1);

      // Guardar en caché por 10 minutos
      setCache(cacheKey, deduped, 10 * 60 * 1000);
    } catch (err: any) {
      setError(err.message || 'Error al cargar productos');
      setAllProducts([]);
      setProducts([]);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const buildCategories = (source: WooCommerceProduct[]) => {
    const categoryMap = new Map<number, string>();
    source.forEach((p) => {
      (p.categories || []).forEach((c) => {
        if (!categoryMap.has(c.id)) categoryMap.set(c.id, c.name);
      });
    });
    const list = Array.from(categoryMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    setCategories(list);
    if (onCategories) onCategories(list);
  };

  const applyFilterAndPaginate = (
    source: WooCommerceProduct[],
    categoryId: number | 'all',
    page: number
  ) => {
    let filtered = categoryId === 'all'
      ? source
      : source.filter((p) => (p.categories || []).some((c) => c.id === categoryId));
    if (stockFilter !== 'all') {
      filtered = filtered.filter((p) => (p.stock_status || '').toLowerCase() === stockFilter);
    }
    if (featureFilter === 'featured') {
      filtered = filtered.filter((p) => !!p.featured);
    } else if (featureFilter === 'onsale') {
      filtered = filtered.filter((p) => p.on_sale === true || (!!p.sale_price && p.sale_price !== '' && p.sale_price !== p.regular_price));
    }

    if (search.trim() !== '') {
      const buscado = search.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').startsWith(
            buscado.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          )
      );
      // Agrega este log:
      console.log('Filtro:', buscado, filtered.length);
    }
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / perPage));
    const start = (page - 1) * perPage;
    const end = start + perPage;
    setProducts(filtered.slice(start, end));
    setTotalProducts(total);
    setTotalPages(pages);
    setCurrentPage(Math.min(page, pages));
  };

  const testConnection = async () => {
    try {
      setConnectionStatus('checking');
      const response = await apiService.testWooCommerceConnection();
      if (response.valid) {
        setConnectionStatus('connected');
        setError('');
        // Re-paginar en cliente sin recargar
        applyFilterAndPaginate(allProducts, selectedCategoryId, currentPage);
      } else {
        setConnectionStatus('error');
        setError('Error de conexión con WooCommerce');
      }
    } catch (err: any) {
      setConnectionStatus('error');
      setError(err.message || 'Error al probar conexión');
    }
  };


  const handleProductSelect = (product: WooCommerceProduct) => {
    setSelectedProduct(product);
    setShowPromptGenerator(true);
  };

  const handlePromptGenerated = (prompt: string) => {
    setGeneratedPrompt(prompt);
  };

  const handleBackToProducts = () => {
    setSelectedProduct(null);
    setShowPromptGenerator(false);
    setGeneratedPrompt('');
    // Resetear animación para que se ejecute al volver
    setIsAnimating(false);
  };


  // Carga inicial
  useEffect(() => {
    fetchAllProducts();
  }, [userId]);

  // Recalcular al cambiar categoría, stock o destacado/oferta
  useEffect(() => {
    applyFilterAndPaginate(allProducts, selectedCategoryId, 1);
  }, [search, selectedCategoryId, stockFilter, featureFilter, allProducts]);

  // Activar animación cuando cambian los productos mostrados
  useEffect(() => {
    setIsAnimating(false);
    // Pequeño delay para que React renderice primero y luego animar
    const timer = setTimeout(() => {
      setIsAnimating(true);
    }, 10);
    return () => clearTimeout(timer);
  }, [products]);

  // Activar animación cuando se vuelve del generador de prompts
  useEffect(() => {
    // Solo ejecutar animación si cambió de true a false (volver del generador)
    if (prevShowPromptGeneratorRef.current && !showPromptGenerator && products.length > 0) {
      setIsAnimating(false);
      // Pequeño delay para que React renderice primero y luego animar
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 10);
      return () => clearTimeout(timer);
    }
    // Actualizar la referencia para la próxima vez
    prevShowPromptGeneratorRef.current = showPromptGenerator;
  }, [showPromptGenerator, products.length]);

  const handlePageChange = (page: number) => {
    setIsAnimating(false);
    applyFilterAndPaginate(allProducts, selectedCategoryId, page);
    setTimeout(() => setIsAnimating(true), 10);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-200 px-4 py-3 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error al cargar productos
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={() => fetchAllProducts()}
                  className="bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-3 py-1 rounded-md text-sm font-medium hover:bg-red-200 dark:hover:bg-red-700"
                >
                  Reintentar
                </button>
                {/* 
                <button
                  onClick={testConnection}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-sm font-medium hover:bg-blue-200"
                >
                  Probar Conexión
                </button>
                */}
              </div>
            </div>
          </div>
        </div>

        {/* Información adicional para errores de conexión */}
        {error.includes('WooCommerce') && (
          <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Problema de conexión con WooCommerce
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Verifica que las credenciales de WooCommerce estén correctas</li>
                    <li>Asegúrate de que la URL de la tienda sea accesible</li>
                    <li>Comprueba que la API de WooCommerce esté habilitada</li>
                    <li>Ve a <a href="/preferencias" className="underline font-medium">Preferencias</a> para configurar la conexión</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Nota: no devolvemos aquí cuando no hay productos

  // Si se está mostrando el generador de prompts
  if (showPromptGenerator && selectedProduct) {
    return (
      <div className="space-y-6">
        {/* Botón para volver a los productos */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToProducts}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-white bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a Productos
          </button>

        </div>

        {/* Generador de prompts */}
        <PromptGenerator
          selectedProduct={selectedProduct}
          onPromptGenerated={handlePromptGenerated}
        />
      </div>
    );
  }



  return (
    <div className="space-y-6">
      {/* Header con información de productos */}
      <div className="flex flex-col xl:flex-row justify-between gap-4 ">


        <div className="flex flex-col mt-4">
          <div className="flex items-center space-x-3 w-[250px]">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Productos de tu Tienda</h2>


            {/* Indicador de estado de conexión */}
            {connectionStatus && (
              <div className="flex items-center space-x-2">
                {connectionStatus === 'checking' && (
                  <div className="flex items-center space-x-1">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-xs text-blue-600">Conectando...</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-400">
            Mostrando {products.length} de {totalProducts} productos
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row sm:items-center  gap-4">
          <div className="min-w-[200px] mt-6 ">
            <input
              id="product-search"
              type="text"
              className="block w-full px-2 h-[32px] border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-900 dark:placeholder-gray-400"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
          {/* Categoría */}
          <FilterDropdown
            theme={theme}
            label="Categoría"
            valueLabel={
              selectedCategoryId === 'all'
                ? 'Todas'
                : (categories.find((c) => c.id === selectedCategoryId)?.name || 'Selecciona')
            }
            options={[
              { value: 'all', label: 'Todas las categorías' },
              ...categories.map((c) => ({ value: c.id, label: c.name }))
            ]}
            onSelect={(val) => {
              const next = val === 'all' ? 'all' : Number(val);
              if (onChangeCategory) onChangeCategory(next);
              applyFilterAndPaginate(allProducts, next, 1);
            }}
            className="w-[170px]"
          />

          {/* Estado */}
          <FilterDropdown
            theme={theme}
            label="Estado"
            valueLabel={
              stockFilter === 'all'
                ? 'Todos'
                : stockFilter === 'instock'
                  ? 'En stock'
                  : 'Agotado'
            }
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'instock', label: 'En stock' },
              { value: 'outofstock', label: 'Agotado' }
            ]}
            onSelect={(val) => {
              const next = val as 'all' | 'instock' | 'outofstock';
              if (onChangeStock) onChangeStock(next);
              applyFilterAndPaginate(allProducts, selectedCategoryId!, 1);
            }}
            className="w-[110px]"
          />

         
        </div>
      </div>

      {/* Grid de productos o vacío */}
      {products.length === 0 ? (
        <div className="text-center py-12 bg-transparent dark:bg-gray-800  border border-gray-200 dark:border-gray-700">
          <svg className="mx-auto h-12 w-12 text-gray-900 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No hay productos</h3>
          <p className="mt-1 text-sm text-gray-900 dark:text-gray-400">
            Ajusta los filtros para ver resultados.
          </p>
        </div>
      ) : (
        <div
          key={`grid-${currentPage}`}
          className="product-grid"
        >
          {products.map((product, index) => (
            <div
              key={product.id}
              className={`bg-transparent border border-gray-100 dark:border dark:border-gray-600 dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg h-full flex flex-col transform-gpu transition-all duration-300 ease-out hover:scale-105 ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ 
                transitionDelay: isAnimating ? `${index * 50}ms` : '0ms' 
              }}
            >
              {/* Imagen del producto */}
              <div className="relative w-full bg-gray-200 overflow-hidden group aspect-[1/1]">
                {product.images && product.images.length > 0 && product.images[0].src ? (
                  <>
                    <img
                      src={`/api/woocommerce/proxy-image?url=${encodeURIComponent(product.images[0].src)}`}
                      alt={product.images[0].alt || product.name}
                      className="absolute inset-0 w-full h-full object-cover transform-gpu transition-transform duration-150"
                      loading="lazy"
                      onError={(e) => {
                        // Si la imagen falla al cargar, mostrar placeholder
                        const img = e.target as any;
                        (img.style as any).display = 'none';
                        img.nextElementSibling?.classList.remove('hidden');
                      }}
                      onLoad={(e) => {
                        // Ocultar placeholder cuando la imagen se carga correctamente
                        const img = e.target as any;
                        img.nextElementSibling?.classList.add('hidden');
                      }}
                    />
                    {/* Indicador de carga */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 pointer-events-none">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </>
                ) : null}

                {/* Placeholder que se muestra si no hay imagen o si falla al cargar */}
                <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 ${product.images && product.images.length > 0 && product.images[0].src ? 'hidden' : ''}`}>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gray-300 rounded-lg flex items-center justify-center">
                      <svg className="h-8 w-8 text-gray-900 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-900 dark:text-gray-400 font-medium">Sin imagen</p>
                  </div>
                </div>
              </div>

              {/* Información del producto */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-1 flex flex-col">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                  {product.name}
                </h3>

                <div className="mt-auto flex flex-col">
                  {/* Precio */}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {product.on_sale && product.sale_price ? (
                        <>
                          <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                            ${product.sale_price}
                          </span>
                          <span className="text-sm text-gray-900 dark:text-gray-400 line-through">
                            ${product.regular_price}
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          ${product.price || product.regular_price}
                        </span>
                      )}
                      {/* Stock */}
                      <div className="mt-2 flex items-center justify-between">
                        <span className={`text-xs font-medium ${product.stock_status === 'instock'
                          ? 'text-green-600 dark:text-green-400'
                          : product.stock_status === 'outofstock'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                          }`}>
                          {product.stock_status === 'instock'
                            ? 'En Stock'
                            : product.stock_status === 'outofstock'
                              ? 'Agotado'
                              : 'Stock Bajo'
                          }
                        </span>
                      </div>
                    </div>

                    {product.on_sale && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                        Oferta
                      </span>
                    )}
                  </div>

                  {/* Categorías */}
                  {product.categories && product.categories.length > 0 && (
                    <div className="mt-2 flex items-center">
                      <div className="flex flex-wrap gap-1">
                        {product.categories.slice(0, 2).map((category) => (
                          <span
                            key={category.id}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
                          >
                            {category.name}
                          </span>
                        ))}
                        {product.categories.length > 2 && (
                          <span className="text-xs text-gray-900 dark:text-gray-400">
                            +{product.categories.length - 2} más
                          </span>
                        )}
                      </div>
                      {product.featured && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 ml-2">
                          Destacado
                        </span>
                      )}
                    </div>
                  )}

                  {/* Botón para generar prompt */}
                  <div className="mt-3">
                    <button
                      onClick={() => handleProductSelect(product)}
                      className="w-full inline-flex items-center justify-center p-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                      Generar Video
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-purple-600 px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Página <span className="font-medium text-gray-900 dark:text-white">{currentPage}</span> de{' '}
                <span className="font-medium text-gray-900 dark:text-white">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 dark:bg-gray-700"
                >
                  <span className="sr-only">Anterior</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Números de página */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold 
                        
                        ${pageNum === currentPage
                          ? 'z-10 bg-purple-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600'
                          : 'text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 focus:z-20 focus:outline-offset-0 bg-gray-100 dark:bg-gray-700'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 dark:bg-gray-700"
                >
                  <span className="sr-only">Siguiente</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;
