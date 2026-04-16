import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
} from '@mui/material';
import type { EcommXInvoiceRecord } from './types';

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  invoices: EcommXInvoiceRecord[];
  selectedId: string | null;
  onSelect: (invoice: EcommXInvoiceRecord) => void;
}

export function EcommXInvoiceList({ invoices, selectedId, onSelect }: Props) {
  if (invoices.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No invoices found</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Invoice #</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Date Range</TableCell>
            <TableCell align="right">Total</TableCell>
            <TableCell align="right">Orders</TableCell>
            <TableCell>Verification</TableCell>
            <TableCell>Payment</TableCell>
            <TableCell>Groups</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invoices.map((inv) => {
            const d = inv.invoice_data;
            const total = d?.step_1_invoice?.total ?? 0;
            const orders = d?.step_3_postage?.total_orders ?? 0;
            const allPass = d?.step_4_verification?.all_pass ?? false;
            const allMatched = d?.step_5_matching?.all_matched ?? false;
            const dateRange = d?.step_1_invoice?.date_range ?? '';
            const groups = d?.step_6_breakdown?.groups;

            const GROUP_COLORS: Record<string, string> = {
              HydroBlast: '#2196f3',
              VitalTac: '#ff9800',
              GhostWing: '#4caf50',
              InfraBeam: '#9c27b0',
            };

            return (
              <TableRow
                key={inv.id}
                hover
                selected={inv.id === selectedId}
                onClick={() => onSelect(inv)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  {inv.invoice_number}
                </TableCell>
                <TableCell>{inv.date}</TableCell>
                <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                  {dateRange}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{fmt(total)}</TableCell>
                <TableCell align="right">{orders}</TableCell>
                <TableCell>
                  <Chip
                    label={allPass && allMatched ? 'Pass' : 'Issues'}
                    size="small"
                    color={allPass && allMatched ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={inv.inv_status || 'Pending'}
                    size="small"
                    color={inv.inv_status === 'Paid' ? 'success' : 'warning'}
                    variant={inv.inv_status === 'Paid' ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>
                  {groups && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {Object.entries(groups).map(([name, g]) => (
                        <Chip
                          key={name}
                          label={`${name} ${fmt(g.avg_cogs)}`}
                          size="small"
                          sx={{
                            bgcolor: GROUP_COLORS[name] ?? '#757575',
                            color: '#fff',
                            fontWeight: 500,
                            fontSize: '0.7rem',
                            height: 22,
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
