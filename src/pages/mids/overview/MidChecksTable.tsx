import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import type { MidCheckRecord, MidRecord } from './types';

const TYPES = ['Status', 'Sales MTD', 'Dispute Rate MTD', 'Reserve', 'Message', 'Other'] as const;
type TypeKey = (typeof TYPES)[number];

interface Props {
  checks: MidCheckRecord[];
  mids: MidRecord[];
  onSync?: (mid: MidRecord) => void;
  syncingId?: string | null;
}

interface MidRow {
  mid: MidRecord;
  latest: Partial<Record<TypeKey, MidCheckRecord>>;
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
  const typeSet = new Set<TypeKey>(TYPES);
  const rowByMid = new Map<string, MidRow>();
  for (const mid of mids) {
    rowByMid.set(mid.id, { mid, latest: {} });
  }
  for (const check of checks) {
    if (!typeSet.has(check.type as TypeKey)) continue;
    const type = check.type as TypeKey;
    for (const midId of check.midIds) {
      const row = rowByMid.get(midId);
      if (!row) continue;
      const existing = row.latest[type];
      if (!existing || check.date > existing.date) {
        row.latest[type] = check;
      }
    }
  }
  return Array.from(rowByMid.values()).sort((a, b) =>
    a.mid.name.localeCompare(b.mid.name)
  );
}

function CheckCell({ check }: { check?: MidCheckRecord }) {
  if (!check) {
    return <Box sx={{ color: 'text.disabled' }}>—</Box>;
  }
  const text = check.data || '—';
  const preview = truncate(text, 80);
  const isTruncated = preview !== text;
  const cell = (
    <Box>
      <Box sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{preview}</Box>
      {check.date && (
        <Box sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.25 }}>
          {formatDate(check.date)}
        </Box>
      )}
    </Box>
  );
  return isTruncated ? (
    <Tooltip title={<Box sx={{ whiteSpace: 'pre-wrap' }}>{text}</Box>} placement="top" arrow>
      {cell}
    </Tooltip>
  ) : (
    cell
  );
}

export function MidChecksTable({ checks, mids, onSync, syncingId }: Props) {
  if (mids.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No MIDs found</Typography>
      </Paper>
    );
  }

  const rows = buildRows(checks, mids);

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>MID</TableCell>
            {TYPES.map((t) => (
              <TableCell key={t} sx={{ fontWeight: 600 }}>{t}</TableCell>
            ))}
            {onSync && <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.mid.id} hover>
              <TableCell sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                {row.mid.name}
              </TableCell>
              {TYPES.map((t) => (
                <TableCell key={t} sx={{ verticalAlign: 'top', minWidth: 120 }}>
                  <CheckCell check={row.latest[t]} />
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
  );
}
