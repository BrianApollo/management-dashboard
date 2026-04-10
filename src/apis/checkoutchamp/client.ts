/**
 * Shared CheckoutChamp proxy configuration.
 */

export const PROXY = import.meta.env.VITE_CHECKOUTCHAMP_PROXY_URL;

export const PROXY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Proxy-Secret': 'your-proxy-secret',
};
