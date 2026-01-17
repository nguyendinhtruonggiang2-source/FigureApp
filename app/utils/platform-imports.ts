import { Platform } from 'react-native';

// Conditional imports for Stripe
export const getStripeImports = () => {
  if (Platform.OS === 'web') {
    return require('./stripe-web-fallback');
  } else {
    return require('@stripe/stripe-react-native');
  }
};

export const useStripe = () => {
  if (Platform.OS === 'web') {
    return {
      initPaymentSheet: () => Promise.resolve(),
      presentPaymentSheet: () => Promise.resolve({}),
    };
  } else {
    const stripe = require('@stripe/stripe-react-native');
    return stripe.useStripe?.() || {};
  }
};