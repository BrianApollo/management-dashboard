import { useState } from 'react';
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
  Tabs,
  Tab,
  IconButton,
  Divider,
  Link,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import TableRowsIcon from '@mui/icons-material/TableRows';
import DescriptionIcon from '@mui/icons-material/Description';
import type { EcommXInvoiceRecord, SkuComparison } from './types';
import { EcommXInvoiceView } from './EcommXInvoiceView';

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusIcon({ pass }: { pass: boolean | null }) {
  if (pass === null) return <RemoveCircleOutlineIcon fontSize="small" sx={{ color: 'text.disabled' }} />;
  return pass
    ? <CheckCircleIcon fontSize="small" sx={{ color: 'success.main' }} />
    : <CancelIcon fontSize="small" sx={{ color: 'error.main' }} />;
}

function SkuStatusChip({ status }: { status: string }) {
  const color = status === 'OK' ? 'success' : status === 'OVER' ? 'error' : 'warning';
  return <Chip label={status} size="small" color={color} />;
}

interface Props {
  invoice: EcommXInvoiceRecord;
  onClose: () => void;
}

export function EcommXInvoiceDetail({ invoice, onClose }: Props) {
  const [tab, setTab] = useState(0);
  const [breakdownView, setBreakdownView] = useState<'table' | 'invoice'>('invoice');
  const d = invoice.invoice_data;

  if (!d) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Invoice #{invoice.invoice_number}</Typography>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Box>
        <Typography color="text.secondary">No invoice data available</Typography>
      </Paper>
    );
  }

  const step1 = d.step_1_invoice;
  const step4 = d.step_4_verification;
  const step5 = d.step_5_matching;
  const step5b = d.step_5b_sku_comparison;
  const step6 = d.step_6_breakdown;

  // If critical steps are missing, bail out gracefully
  if (!step1) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Invoice #{invoice.invoice_number}</Typography>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Box>
        <Typography color="text.secondary">Invoice data is incomplete (missing step_1_invoice)</Typography>
      </Paper>
    );
  }

  // Track which SKUs we've already shown (for deduplication note)
  const shownSkus = new Set<string>();

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Invoice #{invoice.invoice_number}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {step1.date_range} &middot; {invoice.date}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={invoice.inv_status || 'Pending'}
            color={invoice.inv_status === 'Paid' ? 'success' : 'warning'}
          />
          {invoice.invoice_pdf?.[0] && (
            <Link href={invoice.invoice_pdf[0].url} target="_blank" underline="hover" sx={{ fontSize: '0.8rem' }}>
              PDF
            </Link>
          )}
          {invoice.postage_file_matched?.[0] && (
            <Link href={invoice.postage_file_matched[0].url} target="_blank" underline="hover" sx={{ fontSize: '0.8rem' }}>
              Annotated
            </Link>
          )}
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Invoice Breakdown" />
          <Tab label="SKU Comparison" />
          <Tab label="Group Breakdown" />
          <Tab label="Units Per Order" />
        </Tabs>
        {tab === 0 && (
          <ToggleButtonGroup
            value={breakdownView}
            exclusive
            onChange={(_, v) => { if (v) setBreakdownView(v); }}
            size="small"
          >
            <ToggleButton value="invoice"><DescriptionIcon sx={{ fontSize: 18 }} /></ToggleButton>
            <ToggleButton value="table"><TableRowsIcon sx={{ fontSize: 18 }} /></ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      {/* Tab 0: Invoice Breakdown — Invoice View */}
      {tab === 0 && breakdownView === 'invoice' && (
        <EcommXInvoiceView data={d} invoiceNumber={invoice.invoice_number} date={invoice.date} />
      )}

      {/* Tab 0: Invoice Breakdown — Table View */}
      {tab === 0 && breakdownView === 'table' && step4 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={30}></TableCell>
                <TableCell>Item</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Unit Price</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Verification</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Products */}
              {Object.entries(step1.products).map(([name, p]) => {
                const skuData = step5b?.per_sku?.[p.sku];
                const firstForSku = !shownSkus.has(p.sku);
                if (firstForSku) shownSkus.add(p.sku);

                let note = '';
                let pass: boolean | null = null;
                if (skuData && firstForSku) {
                  pass = skuData.status === 'OK';
                  note = `CC orig=${skuData.original_order}, fulf=${skuData.fulfillment}, inv=${skuData.invoice} — ${skuData.status}`;
                } else if (skuData) {
                  pass = skuData.status === 'OK';
                  note = `(included in ${p.sku} above)`;
                }

                return (
                  <TableRow key={name}>
                    <TableCell><StatusIcon pass={pass} /></TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{name}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.sku} &middot; {p.group}</Typography>
                    </TableCell>
                    <TableCell align="right">{p.qty}</TableCell>
                    <TableCell align="right">{fmt(p.unit_price)}</TableCell>
                    <TableCell align="right">{fmt(p.total)}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{note}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Postage */}
              <TableRow>
                <TableCell><StatusIcon pass={step4.postage.pass} /></TableCell>
                <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>Postage</Typography></TableCell>
                <TableCell align="right">{step4.orders.postage_file}</TableCell>
                <TableCell align="right">—</TableCell>
                <TableCell align="right">{fmt(step1.postage)}</TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    Sum of {step4.orders.postage_file} postage rows = {fmt(step4.postage.postage_file)}
                  </Typography>
                </TableCell>
              </TableRow>

              {/* 1st SKU */}
              <TableRow>
                <TableCell><StatusIcon pass={step4.orders.pass} /></TableCell>
                <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>1st SKU (Packing)</Typography></TableCell>
                <TableCell align="right">{step1.sku1.qty}</TableCell>
                <TableCell align="right">{fmt(step1.sku1.price)}</TableCell>
                <TableCell align="right">{fmt(step1.sku1.total)}</TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    Postage file has {step4.orders.postage_file} orders
                  </Typography>
                </TableCell>
              </TableRow>

              {/* 2nd SKU */}
              <TableRow>
                <TableCell>
                  <StatusIcon pass={step5b?.sku2_check ? Math.abs(step5b.sku2_check.diff) <= 10 : null} />
                </TableCell>
                <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>2nd SKU (Packing)</Typography></TableCell>
                <TableCell align="right">{step1.sku2.qty}</TableCell>
                <TableCell align="right">{fmt(step1.sku2.price)}</TableCell>
                <TableCell align="right">{fmt(step1.sku2.total)}</TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {step5b?.sku2_check
                      ? `CC calc=${step5b.sku2_check.cc_calculated}, diff=${step5b.sku2_check.diff}`
                      : ''}
                  </Typography>
                </TableCell>
              </TableRow>

              {/* Returns */}
              {step1.returns && step1.returns.qty > 0 && (
                <TableRow>
                  <TableCell><StatusIcon pass={null} /></TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>Returns To Sender</Typography></TableCell>
                  <TableCell align="right">{step1.returns.qty}</TableCell>
                  <TableCell align="right">{fmt(step1.returns.price)}</TableCell>
                  <TableCell align="right">{fmt(step1.returns.total)}</TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">Cannot verify independently</Typography>
                  </TableCell>
                </TableRow>
              )}

              {/* Grand Total */}
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><StatusIcon pass={step4.grand_total.pass} /></TableCell>
                <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>Grand Total</Typography></TableCell>
                <TableCell />
                <TableCell />
                <TableCell align="right">
                  <Typography sx={{ fontWeight: 700 }}>{fmt(step1.total)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    Sum of all lines = {fmt(step4.grand_total.calculated)}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 1: SKU Comparison */}
      {tab === 1 && step5 && step5b && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Chip label={`${step5.total} orders`} />
            <Chip label={`${step5.direct} direct`} color="success" size="small" />
            {(step5.r_suffix ?? 0) > 0 && <Chip label={`${step5.r_suffix} reshipment`} color="info" size="small" />}
            {(step5.recovered ?? 0) > 0 && <Chip label={`${step5.recovered} recovered`} color="warning" size="small" />}
            {(step5.unmatched ?? 0) > 0 && <Chip label={`${step5.unmatched} unmatched`} color="error" size="small" />}
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell align="right">Original Order</TableCell>
                  <TableCell align="right">Fulfillment</TableCell>
                  <TableCell align="right">Invoice</TableCell>
                  <TableCell align="right">Orig - Fulf</TableCell>
                  <TableCell align="right">Fulf - Inv</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(step5b.per_sku).map(([sku, s]: [string, SkuComparison]) => (
                  <TableRow key={sku}>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{sku}</TableCell>
                    <TableCell align="right">{s.original_order}</TableCell>
                    <TableCell align="right">{s.fulfillment}</TableCell>
                    <TableCell align="right">{s.invoice}</TableCell>
                    <TableCell align="right">{s.original_order - s.fulfillment}</TableCell>
                    <TableCell align="right">{s.fulfillment - s.invoice}</TableCell>
                    <TableCell><SkuStatusChip status={s.status} /></TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>TOTAL</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{step5b.totals.original_order}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{step5b.totals.fulfillment}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{step5b.totals.invoice}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {step5b.totals.original_order - step5b.totals.fulfillment}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {step5b.totals.fulfillment - step5b.totals.invoice}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {step5b.sku2_check && (
            <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'action.hover' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>2nd SKU Check</Typography>
              <Typography variant="caption" color="text.secondary">
                Invoice 2nd SKU: {step5b.sku2_check.invoice_2nd_sku} &middot;
                CC calculated: {step5b.sku2_check.cc_calculated} &middot;
                Diff: {step5b.sku2_check.diff}
              </Typography>
              {step5b.sku2_check.note && (
                <Typography variant="caption" display="block" color="text.secondary">
                  {step5b.sku2_check.note}
                </Typography>
              )}
            </Paper>
          )}

          {step5b.warnings.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, mt: 2, borderColor: 'warning.main' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>Warnings</Typography>
              {step5b.warnings.map((w, i) => (
                <Typography key={i} variant="caption" display="block">{w}</Typography>
              ))}
            </Paper>
          )}
        </Box>
      )}

      {/* Tab 2: Group Breakdown */}
      {tab === 2 && step6 && (
        <Box>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Group</TableCell>
                  <TableCell align="right">Orders</TableCell>
                  <TableCell align="right">Product Cost</TableCell>
                  <TableCell align="right">Shipping</TableCell>
                  <TableCell align="right">Packing Share</TableCell>
                  <TableCell align="right">Brand Total</TableCell>
                  <TableCell align="right">Avg COGS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(step6.groups).map(([group, g]) => (
                  <TableRow key={group}>
                    <TableCell sx={{ fontWeight: 600 }}>{group}</TableCell>
                    <TableCell align="right">{g.orders}</TableCell>
                    <TableCell align="right">{fmt(g.product_cost)}</TableCell>
                    <TableCell align="right">{fmt(g.shipping)}</TableCell>
                    <TableCell align="right">{fmt(g.packing_share)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{fmt(g.brand_total)}</TableCell>
                    <TableCell align="right">{fmt(g.avg_cogs)}</TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>TOTAL</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {Object.values(step6.groups).reduce((s, g) => s + g.orders, 0)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {fmt(Object.values(step6.groups).reduce((s, g) => s + g.product_cost, 0))}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {fmt(Object.values(step6.groups).reduce((s, g) => s + g.shipping, 0))}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {fmt(step6.packing.total)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {fmt(Object.values(step6.groups).reduce((s, g) => s + g.brand_total, 0))}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Packing detail */}
          <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'action.hover' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Packing Costs</Typography>
            <Typography variant="caption" color="text.secondary">
              1st SKU: {step6.packing.sku1.qty} x {fmt(step6.packing.sku1.price)} = {fmt(step6.packing.sku1.total)}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              2nd SKU: {step6.packing.sku2.qty} x {fmt(step6.packing.sku2.price)} = {fmt(step6.packing.sku2.total)}
            </Typography>
            <Typography variant="caption" display="block" sx={{ fontWeight: 600 }}>
              Total Packing: {fmt(step6.packing.total)}
            </Typography>
          </Paper>
        </Box>
      )}

      {/* Tab 3: Average Units Per Order */}
      {tab === 3 && step6 && (
        <Box>
          {/* Per-group summary */}
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Group</TableCell>
                  <TableCell align="right">Orders</TableCell>
                  <TableCell align="right">Total Units</TableCell>
                  <TableCell align="right">Avg Units / Order</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(step6.groups).map(([group, g]) => {
                  const totalUnits = Object.values(g.products).reduce((s, p) => s + p.qty, 0);
                  const avg = g.orders > 0 ? totalUnits / g.orders : 0;
                  return (
                    <TableRow key={group}>
                      <TableCell sx={{ fontWeight: 600 }}>{group}</TableCell>
                      <TableCell align="right">{g.orders}</TableCell>
                      <TableCell align="right">{totalUnits}</TableCell>
                      <TableCell align="right">{avg.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Sub-product breakdown for groups with multiple products */}
          {Object.entries(step6.groups)
            .filter(([, g]) => Object.keys(g.products).length > 1)
            .map(([group, g]) => {
              const totalUnits = Object.values(g.products).reduce((s, p) => s + p.qty, 0);
              return (
                <Box key={group} sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    {group} — Product Breakdown
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell align="right">Units</TableCell>
                          <TableCell align="right">Avg / Order</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(g.products).map(([name, p]) => (
                          <TableRow key={name}>
                            <TableCell>{name}</TableCell>
                            <TableCell align="right">{p.qty}</TableCell>
                            <TableCell align="right">{(g.orders > 0 ? p.qty / g.orders : 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>{totalUnits}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {(g.orders > 0 ? totalUnits / g.orders : 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              );
            })}
        </Box>
      )}
    </Paper>
  );
}
