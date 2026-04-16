import { useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useEcommXInvoices } from './useEcommXInvoices';
import { EcommXInvoiceStats } from './EcommXInvoiceStats';
import { EcommXInvoiceList } from './EcommXInvoiceList';
import { EcommXInvoiceDetail } from './EcommXInvoiceDetail';
import type { EcommXInvoiceRecord } from './types';

export function InvoicesEcommXPage() {
  const { invoices, loading, error } = useEcommXInvoices();
  const [selected, setSelected] = useState<EcommXInvoiceRecord | null>(null);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>EcommX Invoices</Typography>

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress size={24} />
          <Typography color="text.secondary">Loading invoices...</Typography>
        </Box>
      )}

      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      {!loading && !error && (
        <>
          <EcommXInvoiceStats invoices={invoices} />

          {selected ? (
            <EcommXInvoiceDetail invoice={selected} onClose={() => setSelected(null)} />
          ) : (
            <EcommXInvoiceList
              invoices={invoices}
              selectedId={null}
              onSelect={setSelected}
            />
          )}
        </>
      )}
    </Box>
  );
}
