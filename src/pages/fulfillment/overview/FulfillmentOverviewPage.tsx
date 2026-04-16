import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import { fetchAllFulfillments, type FulfillmentRecord } from '../../../apis/fulfillment/api';

function toApiDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const y = String(date.getFullYear()).slice(2);
  return `${m}/${d}/${y}`;
}

function daysAgo(isoDate: string): number {
  const created = new Date(isoDate);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string): string {
  return iso.replace('T', ' ').slice(0, 19);
}

const UNSHIPPED_STATUSES = new Set(['HOLD', 'PENDING', 'ERROR']);
const FAILED_STATUSES = new Set(['FAILED', 'ERROR', 'RETURNED']);

type ViewTab = 'unshipped' | 'failed';

export function FulfillmentOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allRecords, setAllRecords] = useState<FulfillmentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<ViewTab>('unshipped');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 30);

        const data = await fetchAllFulfillments(toApiDate(start), toApiDate(now));
        setAllRecords(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const unshipped = allRecords.filter(
    (r) => UNSHIPPED_STATUSES.has(r.status.toUpperCase()) && !r.dateShipped
  );

  const allUnshipped = unshipped
    .filter((r) => daysAgo(r.dateCreated) >= 3)
    .sort((a, b) => b.dateCreated.localeCompare(a.dateCreated));

  const sevenPlus = allUnshipped.filter((r) => daysAgo(r.dateCreated) >= 7);
  const threeToSeven = allUnshipped.filter((r) => {
    const age = daysAgo(r.dateCreated);
    return age >= 3 && age < 7;
  });

  const failed = allRecords
    .filter((r) => FAILED_STATUSES.has(r.status.toUpperCase()))
    .sort((a, b) => b.dateCreated.localeCompare(a.dateCreated));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
        <CircularProgress size={24} />
        <Typography color="text.secondary">Loading fulfillment data...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  const renderRow = (r: FulfillmentRecord) => {
    const age = daysAgo(r.dateCreated);
    return (
      <TableRow key={r.fulfillmentId}>
        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
          {r.orderId}
        </TableCell>
        <TableCell>
          <Chip
            label={`${age}d`}
            size="small"
            color={age >= 7 ? 'error' : 'warning'}
          />
        </TableCell>
        <TableCell>{formatDate(r.dateCreated)}</TableCell>
        <TableCell>
          <Chip
            label={r.status}
            size="small"
            color={
              r.status.toUpperCase() === 'HOLD' ? 'warning'
                : FAILED_STATUSES.has(r.status.toUpperCase()) ? 'error'
                : 'info'
            }
          />
        </TableCell>
        <TableCell>{r.company}</TableCell>
        <TableCell>
          {r.items.map((item, i) => (
            <Typography key={i} variant="body2" sx={{ fontSize: '0.8rem' }}>
              {item.qty}x {item.name}
            </Typography>
          ))}
        </TableCell>
        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {r.trackingNumber || '—'}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Box>
      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card
          variant="outlined"
          sx={{
            minWidth: 200,
            flex: 1,
            cursor: 'pointer',
            borderColor: activeTab === 'unshipped' ? 'warning.main' : undefined,
            borderWidth: activeTab === 'unshipped' ? 2 : 1,
          }}
          onClick={() => setActiveTab('unshipped')}
        >
          <CardContent>
            <Typography variant="body2" color="text.secondary">All Unshipped 3+ Days</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
              {allUnshipped.length}
            </Typography>
          </CardContent>
        </Card>
        <Card
          variant="outlined"
          sx={{
            minWidth: 200,
            flex: 1,
            cursor: 'pointer',
            borderColor: activeTab === 'failed' ? 'error.main' : undefined,
            borderWidth: activeTab === 'failed' ? 2 : 1,
          }}
          onClick={() => setActiveTab('failed')}
        >
          <CardContent>
            <Typography variant="body2" color="text.secondary">Failed</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
              {failed.length}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Unshipped view — grouped by age bucket */}
      {activeTab === 'unshipped' && (
        <>
          {allUnshipped.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No unshipped orders 3+ days old</Typography>
            </Paper>
          ) : (
            <>
              {/* 7+ Days group */}
              {sevenPlus.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main' }}>
                      7+ Days
                    </Typography>
                    <Chip label={sevenPlus.length} size="small" color="error" />
                  </Box>
                  <TableContainer component={Paper} variant="outlined" sx={{ borderColor: 'error.main', borderWidth: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Order ID</TableCell>
                          <TableCell>Age</TableCell>
                          <TableCell>Date Created</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Company</TableCell>
                          <TableCell>Items</TableCell>
                          <TableCell>Tracking</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>{sevenPlus.map(renderRow)}</TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* 3 – 7 Days group */}
              {threeToSeven.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
                      3 – 7 Days
                    </Typography>
                    <Chip label={threeToSeven.length} size="small" color="warning" />
                  </Box>
                  <TableContainer component={Paper} variant="outlined" sx={{ borderColor: 'warning.main', borderWidth: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Order ID</TableCell>
                          <TableCell>Age</TableCell>
                          <TableCell>Date Created</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Company</TableCell>
                          <TableCell>Items</TableCell>
                          <TableCell>Tracking</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>{threeToSeven.map(renderRow)}</TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </>
          )}
        </>
      )}

      {/* Failed view */}
      {activeTab === 'failed' && (
        <>
          {failed.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No failed orders</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Age</TableCell>
                    <TableCell>Date Created</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell>Tracking</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{failed.map(renderRow)}</TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Box>
  );
}
