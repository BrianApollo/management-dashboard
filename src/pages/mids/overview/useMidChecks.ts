import { useCallback, useEffect, useState } from 'react';
import { fetchMidChecks } from '../../../apis/mids/api';
import type { MidCheckRecord } from './types';

export function useMidChecks() {
  const [checks, setChecks] = useState<MidCheckRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // `silent` keeps the table mounted while re-fetching, so a manual refresh
  // does not swap the whole panel for a spinner.
  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await fetchMidChecks();
      setChecks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { checks, loading, refreshing, error, refresh };
}
