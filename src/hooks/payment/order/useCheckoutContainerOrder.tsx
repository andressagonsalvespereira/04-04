import { useState, useRef, useEffect } from 'react';
import { Order, CardDetails, PixDetails, PaymentMethod, PaymentStatus, DeviceType } from '@/types/order';
import { useToast } from '@/hooks/use-toast';
import { useOrders } from '@/contexts/order';
import { ProductDetailsType } from '@/components/checkout/ProductDetails';
import { detectDeviceType } from '@/hooks/payment/utils/deviceDetection';
import { logger } from '@/utils/logger';
import { resolveManualStatus } from '@/contexts/order/utils/resolveManualStatus';

interface FormState {
  fullName: string;
  email: string;
  cpf: string;
  phone: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep: string;
  useCustomProcessing?: boolean;
  manualCardStatus?: string;
}

interface UseCheckoutOrderProps {
  formState: FormState;
  productDetails: ProductDetailsType;
  handlePayment: (result: {
    orderId: number;
    status: 'confirmed' | 'pending';
    paymentMethod: PaymentMethod;
    cardDetails?: CardDetails;
    pixDetails?: PixDetails;
    orderJustCreated: boolean;
  }) => void;
}

const globalPaymentsInProgress = new Map<string, boolean>();

export const useCheckoutOrder = ({
  formState,
  productDetails,
  handlePayment
}: UseCheckoutOrderProps) => {
  const { toast } = useToast();
  const { addOrder } = useOrders();
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const orderCreatedRef = useRef<string | null>(null);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isProcessing) {
      timeout = setTimeout(() => {
        setIsProcessing(false);
        processingRef.current = false;
        logger.warn("Resetting processing state after safety timeout");
      }, 30000);
    }
    return () => clearTimeout(timeout);
  }, [isProcessing]);

  const createOrder = async (
    paymentId: string,
    baseStatus: 'pending' | 'confirmed',
    cardDetails?: CardDetails,
    pixDetails?: PixDetails
  ): Promise<Order> => {
    try {
      if (isProcessing || processingRef.current || globalPaymentsInProgress.has(paymentId)) {
        logger.warn("Order already in progress or duplicate");
        throw new Error("Processing in progress. Please wait.");
      }

      if (orderCreatedRef.current === paymentId) {
        logger.warn("Order already created with this payment ID");
        throw new Error("Duplicate payment ID");
      }

      setIsProcessing(true);
      processingRef.current = true;
      globalPaymentsInProgress.set(paymentId, true);

      const customer = {
        name: formState.fullName,
        email: formState.email,
        cpf: formState.cpf,
        phone: formState.phone,
        address: formState.street ? {
          street: formState.street,
          number: formState.number,
          complement: formState.complement,
          neighborhood: formState.neighborhood,
          city: formState.city,
          state: formState.state,
          postalCode: formState.cep.replace(/\D/g, '')
        } : undefined
      };

      const resolved = formState.useCustomProcessing
        ? resolveManualStatus(formState.manualCardStatus)
        : baseStatus.toUpperCase();

      const finalStatus: PaymentStatus =
        resolved === 'CONFIRMED' ? 'PAID'
        : resolved === 'REJECTED' ? 'DENIED'
        : 'PENDING';

      const deviceType: DeviceType = detectDeviceType();

      const newOrder = await addOrder({
        customer,
        productId: productDetails.id,
        productName: productDetails.name,
        productPrice: productDetails.price,
        paymentMethod: cardDetails ? 'CREDIT_CARD' : 'PIX',
        paymentStatus: finalStatus,
        paymentId,
        cardDetails,
        pixDetails,
        orderDate: new Date().toISOString(),
        deviceType,
        isDigitalProduct: productDetails.isDigital
      });

      toast({
        title: 'Pedido criado com sucesso!',
        description: 'Seu pedido foi registrado.',
        variant: 'default',
      });

      orderCreatedRef.current = paymentId;

      handlePayment({
        orderId: newOrder.id!,
        status: finalStatus === 'PAID' ? 'confirmed' : 'pending',
        paymentMethod: newOrder.paymentMethod,
        cardDetails,
        pixDetails,
        orderJustCreated: true,
      });

      return newOrder;
    } catch (error) {
      logger.error("Erro ao criar pedido:", error);
      toast({
        title: 'Erro ao criar pedido',
        description: 'Não foi possível concluir o pedido.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        processingRef.current = false;
        globalPaymentsInProgress.delete(paymentId);
      }, 2000);
    }
  };

  return {
    createOrder,
    isProcessing
  };
};
