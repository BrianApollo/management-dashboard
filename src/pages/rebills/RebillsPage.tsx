import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Card,
  CardContent,
} from '@mui/material';
import { getAuthToken } from '../../core/data/airtable-client';

interface SlimRecord {
  price: string;
  cycle: number;
  merchant: string;
  merchantId: string;
}

interface PageResponse {
  totalResults: number;
  totalPages: number;
  page: number;
  data: SlimRecord[];
}

function toApiDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${m}/${d}/${y.slice(2)}`;
}

function defaultStart(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultEnd(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(part: number, total: number): string {
  if (total === 0) return '0%';
  return ((part / total) * 100).toFixed(1) + '%';
}

async function fetchPage(startDate: string, endDate: string, page: number): Promise<PageResponse> {
  const token = getAuthToken();
  const res = await fetch('/api/checkoutchamp/purchases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'same-origin',
    body: JSON.stringify({ startDate, endDate, page }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return (await res.json()) as PageResponse;
}

interface MidRow { merchant: string; count: number; value: number }
interface CycleRow { cycle: number; count: number; value: number }
interface PriceRow { price: number; count: number; value: number }

function aggregate(records: SlimRecord[]) {
  let totalValue = 0;
  const midMap = new Map<string, MidRow>();
  const cycleMap = new Map<number, CycleRow>();
  const priceMap = new Map<string, PriceRow>();

  for (const r of records) {
    const p = parseFloat(r.price || '0');
    totalValue += p;

    const mk = r.merchantId || 'unknown';
    const me = midMap.get(mk);
    if (me) { me.count++; me.value += p; }
    else { midMap.set(mk, { merchant: r.merchant, count: 1, value: p }); }

    const c = r.cycle ?? 0;
    const ce = cycleMap.get(c);
    if (ce) { ce.count++; ce.value += p; }
    else { cycleMap.set(c, { cycle: c, count: 1, value: p }); }

    const pk = p.toFixed(2);
    const pe = priceMap.get(pk);
    if (pe) { pe.count++; pe.value += p; }
    else { priceMap.set(pk, { price: p, count: 1, value: p }); }
  }

  return {
    totalValue,
    byMid: Array.from(midMap.values()).sort((a, b) => b.value - a.value),
    byCycle: Array.from(cycleMap.values()).sort((a, b) => a.cycle - b.cycle),
    byPrice: Array.from(priceMap.values()).sort((a, b) => b.value - a.value),
  };
}

export function RebillsPage() {
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');
  const [records, setRecords] = useState<SlimRecord[]>([]);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  const handleFetch = async () => {
    setLoading(true);
    setError('');
    setRecords([]);
    setLog([]);
    setProgress({ current: 0, total: 0 });

    try {
      const sd = toApiDate(startDate);
      const ed = toApiDate(endDate);

      // Page 1 to get total
      addLog(`Fetching page 1 to get total...`);
      const first = await fetchPage(sd, ed, 1);
      const totalPages = first.totalPages;
      addLog(`Page 1: ${first.data.length} records. Total: ${first.totalResults} across ${totalPages} pages.`);
      setProgress({ current: 1, total: totalPages });

      // Fire all remaining pages in parallel
      const pageNums = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      addLog(`Firing ${pageNums.length} requests in parallel...`);

      const results = await Promise.allSettled(
        pageNums.map((p) => fetchPage(sd, ed, p).then((r) => ({ page: p, data: r.data })))
      );

      let done = 1;
      const allData: SlimRecord[] = [...first.data];
      const failedPages: number[] = [];

      for (const r of results) {
        done++;
        if (r.status === 'fulfilled') {
          allData.push(...r.value.data);
          addLog(`Page ${r.value.page}: ${r.value.data.length} records OK`);
        } else {
          const failedPage = pageNums[results.indexOf(r)];
          failedPages.push(failedPage);
          addLog(`Page ${failedPage}: FAILED - ${r.reason}`);
        }
        setProgress({ current: done, total: totalPages });
      }

      // Retry failed pages one by one
      if (failedPages.length > 0) {
        addLog(`Retrying ${failedPages.length} failed pages...`);
        for (const p of failedPages) {
          try {
            const retry = await fetchPage(sd, ed, p);
            allData.push(...retry.data);
            addLog(`Page ${p} retry: ${retry.data.length} records OK`);
          } catch (retryErr) {
            const rmsg = retryErr instanceof Error ? retryErr.message : 'Unknown';
            addLog(`Page ${p} retry: FAILED AGAIN - ${rmsg}. Skipping.`);
          }
        }
      }

      addLog(`Done. Total records collected: ${allData.length} / ${first.totalResults}`);
      setRecords(allData);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      addLog(`FATAL ERROR: ${msg}`);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const totalRebills = records.length;
  const stats = aggregate(records);
  const totalValue = stats.totalValue;
  const avgValue = totalRebills > 0 ? totalValue / totalRebills : 0;

  return (
    <Box>
      {/* Date range */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Start Date" type="date" value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }} size="small"
        />
        <TextField
          label="End Date" type="date" value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }} size="small"
        />
        <Button variant="contained" onClick={handleFetch} disabled={loading}>Go</Button>
      </Box>

      {/* Progress */}
      {loading && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Loading page {progress.current} of {progress.total}...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
            </Typography>
          </Box>
          <LinearProgress
            variant={progress.total > 0 ? 'determinate' : 'indeterminate'}
            value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0}
          />
        </Box>
      )}

      {/* Fetch log */}
      {log.length > 0 && (
        <Paper
          variant="outlined"
          sx={{
            mb: 2,
            p: 1.5,
            maxHeight: 200,
            overflow: 'auto',
            bgcolor: '#f5f5f5',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            lineHeight: 1.6,
          }}
        >
          {log.map((line, i) => (
            <Box key={i} sx={{ color: line.includes('FAILED') ? 'error.main' : line.includes('OK') ? 'success.main' : 'text.secondary' }}>
              {line}
            </Box>
          ))}
        </Paper>
      )}

      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      {/* Summary cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card variant="outlined" sx={{ minWidth: 180, flex: 1 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">Total Rebills</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{totalRebills.toLocaleString()}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ minWidth: 180, flex: 1 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">Total Value</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{fmt(totalValue)}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ minWidth: 180, flex: 1 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">Avg Value / Rebill</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{fmt(avgValue)}</Typography>
          </CardContent>
        </Card>
      </Box>

      {!totalRebills && !loading && (
        <Typography color="text.secondary">Select a date range and press Go</Typography>
      )}

      {totalRebills > 0 && (
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Left column */}
          <Box sx={{ flex: 1, minWidth: 400 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>By MID</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Merchant</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell align="right">% of Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.byMid.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell>{m.merchant}</TableCell>
                      <TableCell align="right">{m.count.toLocaleString()}</TableCell>
                      <TableCell align="right">{fmt(m.value)}</TableCell>
                      <TableCell align="right">{pct(m.value, totalValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>By Price Point</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Price</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell align="right">Total Value</TableCell>
                    <TableCell align="right">% of Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.byPrice.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>{fmt(p.price)}</TableCell>
                      <TableCell align="right">{p.count.toLocaleString()}</TableCell>
                      <TableCell align="right">{fmt(p.value)}</TableCell>
                      <TableCell align="right">{pct(p.value, totalValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Right column */}
          <Box sx={{ flex: 1, minWidth: 300 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>By Cycle Number</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Cycle #</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell align="right">% of Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.byCycle.map((c) => (
                    <TableRow key={c.cycle}>
                      <TableCell>{c.cycle}</TableCell>
                      <TableCell align="right">{c.count.toLocaleString()}</TableCell>
                      <TableCell align="right">{fmt(c.value)}</TableCell>
                      <TableCell align="right">{pct(c.value, totalValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      )}
    </Box>
  );
}
