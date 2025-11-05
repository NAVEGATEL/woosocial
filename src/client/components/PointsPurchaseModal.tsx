import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiService } from '../services/api';
import { StripeProduct } from '../types';
import { useTheme } from '../hooks/useTheme';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY || 'pk_test_51RYOX72fABgPqjgkcJlJyrXmJZvNlRh2JeBzEdoTP7Paob9ByFmmvsfnxqz34khNqmt1tryT0hB2Z3Do0UGFERjj00W2P4SVNB');

interface PointsPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (points: number) => void;
}

const CheckoutForm: React.FC<{
  product: StripeProduct;
  onSuccess: (points: number) => void;
  onClose: () => void;
}> = ({ product, onSuccess, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // Crear payment intent
      const { clientSecret } = await apiService.createPaymentIntent({
        productId: product.id,
      });

      // Confirmar pago
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (error) {
        toast.error(error.message || 'Error al procesar el pago');
      } else if (paymentIntent?.status === 'succeeded') {
        // Confirmar pago en el backend
        const result = await apiService.confirmPayment(paymentIntent.id);
        if (result.success) {
          toast.success(result.message);
          onSuccess(result.points);
          onClose();
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} p-4 rounded-lg`}>
        <h3 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{product.name}</h3>
        {product.description && (
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>{product.description}</p>
        )}
        <p className="text-2xl font-bold dark:text-white">${product.price}</p>
      </div>
      
      <div className={`border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'} rounded-lg p-3`}>
        <CardElement />
      </div>
      
      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onClose}
          className={`flex-1 px-4 py-2 border ${theme === 'dark' ? 'border-gray-600 text-white hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'} rounded-md`}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? 'Procesando...' : `Pagar $${product.price}`}
        </button>
      </div>
    </form>
  );
};

const PointsPurchaseModal: React.FC<PointsPurchaseModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<StripeProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await apiService.getStripeProducts();
      if (response.success) {
        setProducts(response.products);
      }
    } catch (error: any) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${theme === 'dark' ? 'bg-[#1e2124]' : 'bg-white'} rounded-lg p-3 w-full max-w-md mx-4 shadow-xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-2">
          <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Comprar Puntos</h2>
          <button
            onClick={onClose}
            className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600`}></div>
          </div>
        ) : selectedProduct ? (
          <Elements stripe={stripePromise}>
            <CheckoutForm
              product={selectedProduct}
              onSuccess={onSuccess}
              onClose={() => setSelectedProduct(null)}
            />
          </Elements>
        ) : (
          <div className="space-y-4">
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Selecciona un paquete de puntos:</p>
            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`border ${theme === 'dark' ? 'border-gray-600 hover:border-purple-300 hover:bg-purple-900' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'} rounded-lg p-2 cursor-pointer transition-colors`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{product.name}</h3>
                      {product.description && (
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>{product.description}</p>
                      )}
                      {/* 
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>{product.points} puntos</p>
                      */}
                    </div>
                    <div className="text-right ml-4">
                      <p className={`text-lg font-bold dark:text-white`}>${product.price}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              className={`w-full px-4 py-2 border ${theme === 'dark' ? 'border-gray-600 text-white hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'} rounded-md`}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PointsPurchaseModal;
