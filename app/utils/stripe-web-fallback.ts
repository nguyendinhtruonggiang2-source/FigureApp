// Simple web fallback
export const StripeProvider = ({ children }: any) => children;
export const CardField = () => null;
export const useConfirmPayment = () => ({ 
  confirmPayment: async () => ({ error: null }), 
  loading: false 
});