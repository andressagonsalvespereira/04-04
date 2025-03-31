
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CreateProductInput, UpdateProductInput } from '@/types/product';
import { useToast } from '@/hooks/use-toast';
import { 
  ProductContextType, 
  ProductProviderProps 
} from './product/productContextTypes';
import { 
  loadProducts, 
  saveProducts, 
  createProduct, 
  updateProductData, 
  deleteProductData, 
  findProductById 
} from './product/productUtils';

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<ProductProviderProps> = ({ children }) => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const loadedProducts = loadProducts();
      setProducts(loadedProducts);
      setLoading(false);
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load products');
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const addProduct = async (productData: CreateProductInput): Promise<Product> => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newProduct = createProduct(productData);
      const updatedProducts = [...products, newProduct];
      
      setProducts(updatedProducts);
      saveProducts(updatedProducts);
      
      toast({
        title: "Success",
        description: "Product added successfully",
      });
      
      return newProduct;
    } catch (err) {
      console.error('Error adding product:', err);
      toast({
        title: "Error",
        description: "Failed to add product",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateProduct = async (productData: UpdateProductInput): Promise<Product> => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { updatedProduct, updatedProducts } = updateProductData(products, productData);
      
      setProducts(updatedProducts);
      saveProducts(updatedProducts);
      
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      
      return updatedProduct;
    } catch (err) {
      console.error('Error updating product:', err);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedProducts = deleteProductData(products, id);
      setProducts(updatedProducts);
      saveProducts(updatedProducts);
      
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
      
      return true;
    } catch (err) {
      console.error('Error deleting product:', err);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
      return false;
    }
  };

  const getProduct = (id: string): Product | undefined => {
    return findProductById(products, id);
  };

  return (
    <ProductContext.Provider value={{ 
      products, 
      loading, 
      error, 
      addProduct, 
      updateProduct, 
      deleteProduct, 
      getProduct 
    }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
