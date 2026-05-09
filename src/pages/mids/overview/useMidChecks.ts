import { useEffect, useState } from 'react';
import { fetchMidChecks } from '../../../apis/mids/api';
import type { MidCheckRecord } from './types';

export function useMidChecks() {
  const [checks, setChecks] = useState<MidCheckRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchMidChecks();
        setChecks(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { checks, loading, error };
}
