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
  Chip,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import { fetchAllFulfillments, type FulfillmentRecord } from '../../apis/fulfillment/api';

type StatusGroup = 'HOLD' | 'PENDING' | 'SHIPPED' | 'OTHER';

const STATUS_GROUPS: StatusGroup[] = ['HOLD', 'PENDING', 'SHIPPED', 'OTHER'];

const STATUS_COLORS: Record<StatusGroup, 'warning' | 'info' | 'success' | 'default'> = {
  HOLD: 'warning',
  PENDING: 'info',
  SHIPPED: 'success',
  OTHER: 'default',
};

function classifyStatus(status: string): StatusGroup {
  const s = status.toUpperCase();
  if (s === 'HOLD') return 'HOLD';
  if (s === 'PENDING') return 'PENDING';
  if (s === 'SHIPPED') return 'SHIPPED';
  return 'OTHER';
}

function formatDate(iso: string): string {
  return iso.replace('T', ' ').slice(0, 19);
}

function toApiDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD from input[type=date], convert to MM/DD/YY
  const [y, m, d] = dateStr.split('-');
  return `${m}/${d}/${y.slice(2)}`;
}

function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 3);
  return d.toISOString().slice(0, 10);
}

function defaultEnd(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FulfillmentPage() {
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [grouped, setGrouped] = useState<Record<StatusGroup, FulfillmentRecord[]>>({
    HOLD: [],
    PENDING: [],
    SHIPPED: [],
    OTHER: [],
  });
  const [activeTab, setActiveTab] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  const handleFetch = async () => {
    setLoading(true);
    setError('');
    try {
      const sd = toApiDate(startDate);
      const ed = toApiDate(endDate);

      const allData = await fetchAllFulfillments(sd, ed);
      setTotalResults(allData.length);

      // Sort newest first
      const sorted = allData.sort((a, b) => b.dateCreated.localeCompare(a.dateCreated));

      // Group by status
      const groups: Record<StatusGroup, FulfillmentRecord[]> = {
        HOLD: [],
        PENDING: [],
        SHIPPED: [],
        OTHER: [],
      };
      for (const record of sorted) {
        groups[classifyStatus(record.status)].push(record);
      }
      setGrouped(groups);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const currentGroup = STATUS_GROUPS[activeTab];
  const currentRecords = grouped[currentGroup];

  return (
    <Box>
      {/* Date range controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          size="small"
        />
        <TextField
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          size="small"
        />
        <Button variant="contained" onClick={handleFetch} disabled={loading}>
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Go'}
        </Button>
        {totalResults > 0 && (
          <Typography variant="body2" color="text.secondary">
            {totalResults} total fulfillments
          </Typography>
        )}
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
      )}

      {/* Status tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        {STATUS_GROUPS.map((group) => (
          <Tab
            key={group}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {group}
                <Chip
                  label={grouped[group].length}
                  size="small"
                  color={STATUS_COLORS[group]}
                />
              </Box>
            }
          />
        ))}
      </Tabs>

      {/* Results table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Date Created</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Tracking</TableCell>
              <TableCell>Shipped</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {totalResults === 0 ? 'Select a date range and press Go' : `No ${currentGroup} fulfillments`}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              currentRecords.map((r) => (
                <TableRow key={r.fulfillmentId}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.orderId}</TableCell>
                  <TableCell>{formatDate(r.dateCreated)}</TableCell>
                  <TableCell>
                    <Chip
                      label={r.status}
                      size="small"
                      color={STATUS_COLORS[classifyStatus(r.status)]}
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
                  <TableCell>{r.dateShipped || '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
