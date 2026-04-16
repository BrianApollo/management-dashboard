import { Box, Typography, Divider, Paper } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import type { InvoiceData, SkuComparison } from './types';

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusDot({ pass }: { pass: boolean | null }) {
  if (pass === null) return <RemoveCircleOutlineIcon sx={{ fontSize: 18, color: 'text.disabled' }} />;
  return pass
    ? <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
    : <CancelIcon sx={{ fontSize: 18, color: 'error.main' }} />;
}

interface Props {
  data: InvoiceData;
  invoiceNumber: string;
  date: string;
}

export function EcommXInvoiceView({ data, invoiceNumber, date }: Props) {
  const step1 = data.step_1_invoice;
  const step4 = data.step_4_verification;
  const step5b = data.step_5b_sku_comparison;

  const shownSkus = new Set<string>();

  const lineStyle = {
    display: 'grid',
    gridTemplateColumns: '28px 1fr 90px 90px 100px 1fr',
    alignItems: 'center',
    py: 1.25,
    px: 2,
    borderBottom: '1px solid',
    borderColor: 'divider',
    gap: 1,
    '&:hover': { bgcolor: 'action.hover' },
  };

  const headerStyle = {
    ...lineStyle,
    py: 1,
    bgcolor: 'grey.50',
    borderBottom: '2px solid',
    borderColor: 'divider',
    '&:hover': {},
  };

  const headerText = {
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: 'text.secondary',
  };

  const getVerification = (sku: string): { pass: boolean | null; note: string } => {
    const skuData = step5b?.per_sku?.[sku] as SkuComparison | undefined;
    const firstForSku = !shownSkus.has(sku);
    if (firstForSku && sku) shownSkus.add(sku);

    if (skuData && firstForSku) {
      return {
        pass: skuData.status === 'OK',
        note: `CC orig=${skuData.original_order}, fulf=${skuData.fulfillment}, inv=${skuData.invoice} — ${skuData.status}`,
      };
    } else if (skuData) {
      return { pass: skuData.status === 'OK', note: `(included in ${sku} above)` };
    }
    return { pass: null, note: '' };
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        maxWidth: 900,
        mx: 'auto',
        overflow: 'hidden',
        borderRadius: 2,
      }}
    >
      {/* Invoice Header */}
      <Box sx={{ p: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography sx={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'text.primary', lineHeight: 1 }}>
              INVOICE
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: 1 }}>
              Apollo Global Enterprises LLC
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Invoice Date</Typography>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{date}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>Invoice Number</Typography>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>#{invoiceNumber}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>Reference</Typography>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{step1.date_range}</Typography>
          </Box>
        </Box>

        <Divider />
      </Box>

      {/* Column Headers */}
      <Box sx={headerStyle}>
        <Box />
        <Typography sx={headerText}>Description</Typography>
        <Typography sx={{ ...headerText, textAlign: 'right' }}>Quantity</Typography>
        <Typography sx={{ ...headerText, textAlign: 'right' }}>Unit Price</Typography>
        <Typography sx={{ ...headerText, textAlign: 'right' }}>Amount USD</Typography>
        <Typography sx={{ ...headerText, pl: 1 }}>Verification</Typography>
      </Box>

      {/* Product Lines */}
      {Object.entries(step1.products).map(([name, p]) => {
        const v = getVerification(p.sku);
        return (
          <Box key={name} sx={lineStyle}>
            <StatusDot pass={v.pass} />
            <Box>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>{name}</Typography>
              <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
                {step1.date_range}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.8125rem', textAlign: 'right' }}>{fmt(p.qty)}</Typography>
            <Typography sx={{ fontSize: '0.8125rem', textAlign: 'right' }}>{fmt(p.unit_price)}</Typography>
            <Typography sx={{ fontSize: '0.8125rem', textAlign: 'right', fontWeight: 500 }}>{fmt(p.total)}</Typography>
            <Typography sx={{ fontSize: '0.6875rem', color: v.pass === false ? 'error.main' : 'text.secondary', pl: 1 }}>
              {v.note}
            </Typography>
          </Box>
        );
      })}

      {/* Postage */}
      <Box sx={lineStyle}>
        <StatusDot pass={step4?.postage?.pass ?? null} />
        <Box>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>Postage</Typography>
          <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>{step1.date_range}</Typography>
        </Box>
        <Typography sx={{ fontSize: '0.8125rem', textAlign: 'right' }}>1.00</Typography>
        <Typography sx={{ fontSize: '0.8125rem', textAlign: 'right' }}>{fmt(step1.postage)}</Typography>
        <Typography sx={{ fontSize: '0.8125rem', textAlign: 'right', fontWeight: 500 }}>{fmt(step1.postage)}</Typography>
        <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', pl: 1 }}>
          Sum of {step4?.orders?.postage_file ?? '—'} postage rows = {fmt(step4?.postage?.postage_file ?? 0)}
        </Typography>
      </Box>

      {/* 1st SKU */}
      <Box sx={lineStyle}>
        <StatusDot pass={step4?.orders?.pass ?? null} />
        <Box>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>1st SKU</Typography>
          <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>{step1.date_range}</Typography>
        </Box>
        <Typography sx={{ fontSize: '0.8125rem', textAlign: 'right' }}>{fmt(step1.sku1.qty)}</Typography>
        <Typography sx={{ fontSize: '0.8125rem', textAlign: 'right' }}>{fmt(step1.sku1.price)}</Typography>
        <Typography sx={{ fontSize: '0.8125rem', textAlign: 'right', fontWeight: 500 }}>{fmt(step1.sku1.total)}</Typography>
        <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', pl: 1 }}>
          Postage file has {step4?.orders?.postage_file ?? '—'} orders
        </Typography>
      </Box>

      {/* 2nd SKU */}
      <Box sx={lineStyle}>
        <StatusDot pass={step5b?.sku2_check ? Math.abs(step5b.sku2_check.diff) <= 10 : null} />
        <Box>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>2nd SKU</Typography>
          <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>{step1.date_range}</Typography>
        </Box>
        <Typography sx={{ fontSize: '0.8125rem', textAlign: 'right' }}>{fmt(step1.sku2.qty)}</Typography>
        <Typography sx={{ fontSize: '0.8125rem', textAlign: 'right' }}>{fmt(step1.sku2.price)}</Typography>
        <Typography sx={{ fontSize: '0.8125rem', textAlign: 'right', fontWeight: 500 }}>{fmt(step1.sku2.total)}</Typography>
        <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', pl: 1 }}>
          {step5b?.sku2_check ? `CC calc=${step5b.sku2_check.cc_calculated}, diff=${step5b.sku2_check.diff}` : ''}
        </Typography>
      </Box>

      {/* Returns */}
      {step1.returns && step1.returns.qty > 0 && (
        <Box sx={lineStyle}>
          <StatusDot pass={null} />
          <Box>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>Returns To Sender</Typography>
            <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>{step1.date_range}</Typography>
          </Box>
          <Typography sx={{ fontSize: '0.8125rem', textAlign: 'right' }}>{fmt(step1.returns.qty)}</Typography>
          <Typography sx={{ fontSize: '0.8125rem', textAlign: 'right' }}>{fmt(step1.returns.price)}</Typography>
          <Typography sx={{ fontSize: '0.8125rem', textAlign: 'right', fontWeight: 500 }}>{fmt(step1.returns.total)}</Typography>
          <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', pl: 1 }}>
            Cannot verify independently
          </Typography>
        </Box>
      )}

      {/* Totals */}
      <Box sx={{ px: 2, py: 1.5, borderTop: '2px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', minWidth: 80, textAlign: 'right' }}>Subtotal</Typography>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, minWidth: 100, textAlign: 'right' }}>{fmt(step1.total)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <StatusDot pass={step4?.grand_total?.pass ?? null} />
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, minWidth: 80, textAlign: 'right' }}>TOTAL USD</Typography>
          </Box>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, minWidth: 100, textAlign: 'right' }}>{fmt(step1.total)}</Typography>
        </Box>
        {step4?.grand_total && (
          <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', textAlign: 'right', mt: 0.5 }}>
            Sum of all lines = ${fmt(step4.grand_total.calculated)}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
