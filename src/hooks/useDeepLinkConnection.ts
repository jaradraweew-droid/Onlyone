import { useEffect, useState } from 'react';

export function useDeepLinkConnection() {
  const [deepLinkCode, setDeepLinkCode] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('connect');

    if (code) {
      setDeepLinkCode(code);
      
      // Clean up the URL so it doesn't trigger again on refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  const clearDeepLink = () => setDeepLinkCode(null);

  return { deepLinkCode, clearDeepLink };
}
