import { Box, Card, CardContent, Typography } from '@mui/material';
import type { EcommXInvoiceRecord } from './types';

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  invoices: EcommXInvoiceRecord[];
}

export function EcommXInvoiceStats({ invoices }: Props) {
  const totalInvoices = invoices.length;
  const totalValue = invoices.reduce((s, inv) => s + (inv.invoice_data?.step_1_invoice?.total ?? 0), 0);
  const totalOrders = invoices.reduce((s, inv) => s + (inv.invoice_data?.step_3_postage?.total_orders ?? 0), 0);
  const paidCount = invoices.filter((inv) => inv.inv_status === 'Paid').length;

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
      <Card variant="outlined" sx={{ minWidth: 160, flex: 1 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">Invoices</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{totalInvoices}</Typography>
        </CardContent>
      </Card>
      <Card variant="outlined" sx={{ minWidth: 160, flex: 1 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">Total Value</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{fmt(totalValue)}</Typography>
        </CardContent>
      </Card>
      <Card variant="outlined" sx={{ minWidth: 160, flex: 1 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">Total Orders</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{totalOrders.toLocaleString()}</Typography>
        </CardContent>
      </Card>
      <Card variant="outlined" sx={{ minWidth: 160, flex: 1 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">Paid</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
            {paidCount} / {totalInvoices}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
