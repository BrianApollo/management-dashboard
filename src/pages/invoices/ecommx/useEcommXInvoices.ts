import { useState, useEffect } from 'react';
import { fetchEcommXInvoices } from '../../../apis/invoices/api';
import type { EcommXInvoiceRecord } from './types';

export function useEcommXInvoices() {
  const [invoices, setInvoices] = useState<EcommXInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchEcommXInvoices();
        data.sort((a, b) => b.date.localeCompare(a.date));
        setInvoices(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { invoices, loading, error };
}
