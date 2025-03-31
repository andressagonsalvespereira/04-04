
import { useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '@/types/product';
import { useToast } from '@/hooks/use-toast';
import { fetchProductsFromAPI } from '../productApi';
import { loadProducts, saveProducts } from '../productUtils';

export const useProductFetching = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const fetchAttemptedRef = useRef(false);

  const fetchProducts = useCallback(async (): Promise<void> => {
    // Prevent multiple fetch attempts when already loading
    if (loading && hasAttemptedFetch) return;
    
    // Evitar múltiplas chamadas da mesma função
    if (fetchAttemptedRef.current) return;
    
    fetchAttemptedRef.current = true;
    setLoading(true);
    setError(null);
    setHasAttemptedFetch(true);
    
    try {
      const formattedProducts = await fetchProductsFromAPI();
      setProducts(formattedProducts);
      
      // Sync local storage with latest data
      saveProducts(formattedProducts);
      setNetworkError(false);
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load products');
      
      // If we have a network error, try to load from local storage as fallback
      try {
        const localProducts = loadProducts();
        setProducts(localProducts);
        setNetworkError(true);
        toast({
          title: "Offline mode",
          description: "Loading products from local storage due to connection failure",
          variant: "destructive",
        });
      } catch (localErr) {
        console.error('Error loading local products:', localErr);
        toast({
          title: "Error",
          description: "Failed to load products, check your connection",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      // Permitir novas tentativas de carregamento apenas através do retryFetchProducts
      fetchAttemptedRef.current = true;
    }
  }, [toast]);

  // Add a retry mechanism with force refresh
  const retryFetchProducts = useCallback(async (): Promise<void> => {
    setNetworkError(false);
    setHasAttemptedFetch(false);
    fetchAttemptedRef.current = false;
    return fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    // Prevenir chamadas duplicadas
    if (!fetchAttemptedRef.current) {
      fetchProducts();
    }
    
    // Cleanup function
    return () => {
      fetchAttemptedRef.current = false;
    };
  }, [fetchProducts]);

  return {
    products,
    setProducts,
    loading,
    error,
    networkError,
    retryFetchProducts
  };
};
