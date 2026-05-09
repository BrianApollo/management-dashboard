import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { MidCheckRecord, MidRecord } from './types';

const METRIC_TYPES = ['Status', 'Sales MTD', 'Dispute Rate MTD', 'Reserve'] as const;
const OTHER_TYPE = 'Other';
type MetricKey = (typeof METRIC_TYPES)[number];
type SortKey = 'MID' | MetricKey;
type SortDir = 'asc' | 'desc';

interface Props {
  checks: MidCheckRecord[];
  mids: MidRecord[];
  onSync?: (mid: MidRecord) => void;
  syncingId?: string | null;
}

interface MidRow {
  mid: MidRecord;
  metrics: Partial<Record<MetricKey, MidCheckRecord>>;
  other?: MidCheckRecord;
}

interface LightboxState {
  urls: string[];
  index: number;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + '…';
}

function buildRows(checks: MidCheckRecord[], mids: MidRecord[]): MidRow[] {
  const metricSet = new Set<string>(METRIC_TYPES);
  const rowByMid = new Map<string, MidRow>();
  for (const mid of mids) {
    rowByMid.set(mid.id, { mid, metrics: {} });
  }
  for (const check of checks) {
    for (const midId of check.midIds) {
      const row = rowByMid.get(midId);
      if (!row) continue;
      if (metricSet.has(check.type)) {
        const type = check.type as MetricKey;
        const existing = row.metrics[type];
        if (!existing || check.date > existing.date) {
          row.metrics[type] = check;
        }
      } else if (check.type === OTHER_TYPE) {
        if (!row.other || check.date > row.other.date) {
          row.other = check;
        }
      }
    }
  }
  return Array.from(rowByMid.values());
}

function metricSortValue(check: MidCheckRecord | undefined): number | string | null {
  if (!check) return null;
  const text = (check.data || '').trim();
  if (!text) return null;
  const cleaned = text.replace(/[$,%\s]/g, '');
  if (cleaned.length > 0) {
    const num = Number(cleaned);
    if (!Number.isNaN(num)) return num;
  }
  return text.toLowerCase();
}

function compareRows(a: MidRow, b: MidRow, key: SortKey, dir: SortDir): number {
  let av: number | string | null;
  let bv: number | string | null;
  if (key === 'MID') {
    av = a.mid.name.toLowerCase();
    bv = b.mid.name.toLowerCase();
  } else {
    av = metricSortValue(a.metrics[key]);
    bv = metricSortValue(b.metrics[key]);
  }
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  let cmp = 0;
  if (typeof av === 'number' && typeof bv === 'number') {
    cmp = av - bv;
  } else {
    cmp = String(av).localeCompare(String(bv));
  }
  return dir === 'asc' ? cmp : -cmp;
}

const richTextSx = {
  wordBreak: 'break-word',
  '& p': { m: 0, mb: 0.5, '&:last-child': { mb: 0 } },
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    m: 0,
    mt: 0.5,
    mb: 0.25,
    fontWeight: 700,
    '&:first-of-type': { mt: 0 },
  },
  '& h1': { fontSize: '1rem' },
  '& h2': { fontSize: '0.95rem' },
  '& h3': { fontSize: '0.9rem' },
  '& h4, & h5, & h6': { fontSize: '0.85rem' },
  '& ul, & ol': { m: 0, mb: 0.5, pl: 2.5, '&:last-child': { mb: 0 } },
  '& li': { mb: 0.1, '& > p': { m: 0 } },
  '& a': { color: '#90caf9', textDecoration: 'underline' },
  '& code': {
    bgcolor: 'rgba(255,255,255,0.12)',
    px: 0.5,
    py: 0.1,
    borderRadius: 0.5,
    fontSize: '0.85em',
    fontFamily: 'monospace',
  },
  '& pre': {
    bgcolor: 'rgba(0,0,0,0.3)',
    p: 0.75,
    borderRadius: 0.5,
    overflowX: 'auto',
    m: 0,
    mb: 0.5,
    '& code': { bgcolor: 'transparent', p: 0 },
  },
  '& blockquote': {
    borderLeft: '3px solid rgba(255,255,255,0.3)',
    pl: 1,
    ml: 0,
    my: 0.5,
    color: 'rgba(255,255,255,0.85)',
  },
  '& hr': { borderColor: 'rgba(255,255,255,0.2)', my: 0.75 },
  '& strong': { fontWeight: 700 },
  '& em': { fontStyle: 'italic' },
  '& del': { textDecoration: 'line-through', opacity: 0.7 },
  '& table': { borderCollapse: 'collapse', my: 0.5 },
  '& th, & td': {
    border: '1px solid rgba(255,255,255,0.2)',
    px: 0.75,
    py: 0.25,
  },
  '& th': { fontWeight: 700, bgcolor: 'rgba(255,255,255,0.05)' },
};

function RichText({ children }: { children: string }) {
  return (
    <Box sx={richTextSx}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </Box>
  );
}

function tooltipBody(check: MidCheckRecord, extra?: MidCheckRecord) {
  const tooltipText = check.dataTooltip || check.data || '—';
  const extraText = extra ? (extra.dataTooltip || extra.data || '—') : '';
  return (
    <>
      {check.date && (
        <Box
          sx={{
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.75)',
            fontWeight: 600,
            mb: 0.5,
            pb: 0.5,
            borderBottom: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          Last sync: {formatDate(check.date)}
        </Box>
      )}
      <RichText>{tooltipText}</RichText>
      {extra && (
        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <Box
            sx={{
              fontSize: '0.7rem',
              color: 'rgba(255,255,255,0.75)',
              fontWeight: 600,
              mb: 0.25,
            }}
          >
            Other · {formatDate(extra.date)}
          </Box>
          <RichText>{extraText}</RichText>
        </Box>
      )}
    </>
  );
}

function metricValueColor(check: MidCheckRecord): string | undefined {
  const text = (check.data || '').trim();
  if (check.type === 'Status') {
    return text.toLowerCase() === 'active' ? 'success.main' : 'text.primary';
  }
  if (check.type === 'Dispute Rate MTD') {
    const cleaned = text.replace(/[%\s,]/g, '');
    if (!cleaned) return undefined;
    const num = Number(cleaned);
    if (Number.isNaN(num)) return undefined;
    if (num <= 1) return 'success.main';
    if (num < 3) return 'warning.main';
    return 'error.main';
  }
  return undefined;
}

function MetricCell({
  check,
  extra,
  onOpenImage,
}: {
  check?: MidCheckRecord;
  extra?: MidCheckRecord;
  onOpenImage: (urls: string[], index: number) => void;
}) {
  if (!check) {
    return <Box sx={{ color: 'text.disabled' }}>—</Box>;
  }
  const urls = check.screenshotUrls;
  const hasImages = urls.length > 0;
  const valueColor = metricValueColor(check);
  const visibleThumbs = urls.slice(0, 3);
  const overflowCount = Math.max(0, urls.length - visibleThumbs.length);

  function open(idx: number) {
    if (hasImages) onOpenImage(urls, idx);
  }

  const isStatus = check.type === 'Status';
  const tooltip = (
    <Box
      sx={{
        maxWidth: 460,
        ...(isStatus && {
          maxHeight: '70vh',
          overflowY: 'auto',
          pr: 0.5,
        }),
      }}
    >
      {tooltipBody(check, extra)}
      {hasImages && (
        <>
          <Box
            sx={{
              mt: 1,
              pt: 1,
              borderTop: '1px solid rgba(255,255,255,0.2)',
              display: 'flex',
              gap: 0.75,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {visibleThumbs.map((url, idx) => (
              <Box
                key={url}
                component="img"
                src={url}
                alt="screenshot"
                onClick={(e) => {
                  e.stopPropagation();
                  open(idx);
                }}
                sx={{
                  maxWidth: 110,
                  maxHeight: 80,
                  borderRadius: 0.5,
                  border: '1px solid rgba(255,255,255,0.25)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, border-color 0.15s',
                  '&:hover': {
                    transform: 'scale(1.04)',
                    borderColor: 'white',
                  },
                }}
              />
            ))}
            {overflowCount > 0 && (
              <Box
                onClick={(e) => {
                  e.stopPropagation();
                  open(visibleThumbs.length);
                }}
                sx={{
                  width: 70,
                  height: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  borderRadius: 0.5,
                  border: '1px solid rgba(255,255,255,0.25)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
                }}
              >
                +{overflowCount}
              </Box>
            )}
          </Box>
          <Box
            onClick={(e) => {
              e.stopPropagation();
              open(0);
            }}
            sx={{
              mt: 0.75,
              fontSize: '0.7rem',
              color: 'rgba(255,255,255,0.85)',
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline', color: 'white' },
            }}
          >
            Click to enlarge{urls.length > 1 ? ` (${urls.length} screenshots)` : ''}
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <Tooltip title={tooltip} placement="top" arrow>
      <Box
        onClick={() => open(0)}
        sx={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          cursor: hasImages ? 'pointer' : 'default',
          color: valueColor,
          fontWeight: valueColor ? 600 : undefined,
          '&:hover': hasImages ? { color: 'primary.main' } : undefined,
        }}
      >
        {truncate(check.data || '—', 80)}
      </Box>
    </Tooltip>
  );
}

function ImageDialog({
  state,
  onClose,
}: {
  state: LightboxState | null;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (state) setIndex(state.index);
  }, [state]);

  useEffect(() => {
    if (!state) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        setIndex((i) => Math.min((state?.urls.length ?? 1) - 1, i + 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state]);

  const open = !!state;
  const urls = state?.urls ?? [];
  const total = urls.length;
  const url = urls[index];
  const hasPrev = index > 0;
  const hasNext = index < total - 1;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogContent sx={{ p: 0, position: 'relative', bgcolor: 'black', minHeight: 200 }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 2,
            color: 'white',
            bgcolor: 'rgba(0,0,0,0.4)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
          }}
        >
          <CloseIcon />
        </IconButton>
        {total > 1 && (
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              left: 16,
              zIndex: 2,
              color: 'white',
              bgcolor: 'rgba(0,0,0,0.4)',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              fontSize: '0.85rem',
            }}
          >
            {index + 1} / {total}
          </Box>
        )}
        {hasPrev && (
          <IconButton
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            sx={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              color: 'white',
              bgcolor: 'rgba(0,0,0,0.4)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
            }}
          >
            <ChevronLeftIcon fontSize="large" />
          </IconButton>
        )}
        {hasNext && (
          <IconButton
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              color: 'white',
              bgcolor: 'rgba(0,0,0,0.4)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
            }}
          >
            <ChevronRightIcon fontSize="large" />
          </IconButton>
        )}
        {url && (
          <Box
            component="img"
            src={url}
            alt="screenshot"
            sx={{ width: '100%', height: 'auto', display: 'block' }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function MidChecksTable({ checks, mids, onSync, syncingId }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('MID');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  if (mids.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No MIDs found</Typography>
      </Paper>
    );
  }

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  }

  function openImage(urls: string[], index: number) {
    if (urls.length === 0) return;
    setLightbox({ urls, index });
  }

  const rows = buildRows(checks, mids).sort((a, b) =>
    compareRows(a, b, sortBy, sortDir)
  );

  function renderSortHeader(key: SortKey, label: string) {
    return (
      <TableSortLabel
        active={sortBy === key}
        direction={sortBy === key ? sortDir : 'asc'}
        onClick={() => handleSort(key)}
      >
        {label}
      </TableSortLabel>
    );
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead
            sx={{
              '& .MuiTableCell-head': {
                bgcolor: 'primary.main',
                color: '#fff',
                fontWeight: 600,
              },
              '& .MuiTableSortLabel-root': {
                color: '#fff',
                '&:hover, &.Mui-active': { color: '#fff' },
                '& .MuiTableSortLabel-icon': { color: '#fff !important', opacity: 1 },
              },
            }}
          >
            <TableRow>
              <TableCell>{renderSortHeader('MID', 'MID')}</TableCell>
              {METRIC_TYPES.map((t) => (
                <TableCell key={t}>{renderSortHeader(t, t)}</TableCell>
              ))}
              {onSync && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.mid.id} hover>
                <TableCell sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {row.mid.name}
                </TableCell>
                {METRIC_TYPES.map((t) => (
                  <TableCell key={t} sx={{ verticalAlign: 'top', minWidth: 120 }}>
                    <MetricCell
                      check={row.metrics[t]}
                      extra={t === 'Status' ? row.other : undefined}
                      onOpenImage={openImage}
                    />
                  </TableCell>
                ))}
                {onSync && (
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<SyncIcon />}
                      disabled={syncingId === row.mid.id}
                      onClick={() => onSync(row.mid)}
                    >
                      {syncingId === row.mid.id ? 'Syncing…' : 'Sync'}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <ImageDialog state={lightbox} onClose={() => setLightbox(null)} />
    </>
  );
}
