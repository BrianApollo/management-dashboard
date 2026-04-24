import { useState, useEffect } from 'react';
import { fetchMids } from '../../../apis/mids/api';
import type { MidRecord } from './types';

export function useMids() {
  const [mids, setMids] = useState<MidRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchMids();
        setMids(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { mids, loading, error };
}
