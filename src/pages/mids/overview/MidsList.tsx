import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { MidRecord } from './types';

interface Props {
  mids: MidRecord[];
}

export function MidsList({ mids }: Props) {
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
