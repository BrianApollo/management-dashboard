import { useEffect, useState } from 'react';
import { fetchEcommXInvoices } from '../../../apis/invoices/api';
import type { EcommXInvoiceRecord } from './types';

export function useEcommXInvoices() {
  const [invoices, setInvoices] = useState<EcommXInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadingMore(false);
      setError('');
      setInvoices([]);
      let firstPageReceived = false;

      try {
        await fetchEcommXInvoices({
          onPage: (page) => {
            if (cancelled) return;
            if (!firstPageReceived) {
              firstPageReceived = true;
              setLoading(false);
              setLoadingMore(true);
            }
            setInvoices((prev) => {
              const merged = [...prev, ...page];
              merged.sort((a, b) => b.date.localeCompare(a.date));
              return merged;
            });
          },
        });
        if (cancelled) return;
        setLoading(false);
        setLoadingMore(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Unknown error');
        setLoading(false);
        setLoadingMore(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { invoices, loading, loadingMore, error };
}
