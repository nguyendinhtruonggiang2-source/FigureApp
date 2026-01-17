// STRIPE CONFIGURATION
// Web sẽ không dùng Stripe, mobile dùng test key

export const STRIPE_PUBLISHABLE_KEY = "pk_test_51QY9TfKQ8qB7z6R8vYVhPmN6jXWl5tGpL9sDqFgHrTtZxYcA3";

export const STRIPE_CONFIG = {
  merchantIdentifier: 'merchant.com.figureapp',
  urlScheme: 'figureapp',
  returnUrl: 'figureapp://stripe-redirect',
};

// CURRENCY CONFIG
export const CURRENCY_CONFIG = {
  default: 'vnd',
  symbol: 'đ',
  locale: 'vi-VN',
  
  formatAmount: (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  }
};

// Kiểm tra nếu đang chạy trên web
export const isWeb = () => {
  if (typeof window !== 'undefined') {
    return true;
  }
  return false;
};

// Mock Stripe cho web
export const getStripeConfig = () => {
  if (typeof window !== 'undefined') {
    // Web environment
    return {
      isWeb: true,
      publishableKey: null,
      merchantIdentifier: null,
      supportsCardPayments: false,
      supportsCOD: true,
    };
  } else {
    // Mobile environment
    return {
      isWeb: false,
      publishableKey: STRIPE_PUBLISHABLE_KEY,
      merchantIdentifier: STRIPE_CONFIG.merchantIdentifier,
      supportsCardPayments: true,
      supportsCOD: true,
    };
  }
};