import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import type { MidRecord } from './types';

interface Props {
  mids: MidRecord[];
  onSync?: (mid: MidRecord) => void;
  syncingId?: string | null;
}

export function MidsList({ mids, onSync, syncingId }: Props) {
  if (mids.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No MIDs found</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Statement Descriptor</TableCell>
            <TableCell>MID</TableCell>
            <TableCell>Gateway ID</TableCell>
            <TableCell>CAID</TableCell>
            <TableCell>BIN</TableCell>
            <TableCell>MCC</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {mids.map((m) => (
            <TableRow key={m.id} hover>
              <TableCell>{m.name}</TableCell>
              <TableCell>{m.statement_descriptor}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>{m.mid}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>{m.gateway_id}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>{m.caid}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>{m.bin}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>{m.mcc}</TableCell>
              <TableCell align="right">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SyncIcon />}
                  disabled={syncingId === m.id}
                  onClick={() => onSync?.(m)}
                >
                  {syncingId === m.id ? 'Syncing…' : 'Sync'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
