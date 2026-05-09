import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { uploadFile } from '../../../apis/storage/api';

interface Props {
  open: boolean;
  onClose: () => void;
  /** R2 folder/prefix the file is stored under (e.g. "payment-proof"). */
  folder: string;
  /** Modal title — defaults to "Upload File". */
  title?: string;
  /** Called once with the public R2 URL after a successful upload. */
  onConfirm: (url: string) => Promise<void> | void;
}

export function UploadFileModal({ open, onClose, folder, title = 'Upload File', onConfirm }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setProgress(0);
      setUploading(false);
      setError(null);
    }
  }, [open]);

  async function handleConfirm() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
      const key = `${Date.now()}.${ext}`;
      const result = await uploadFile(file, key, {
        prefix: folder,
        onProgress: (p) => setProgress(p.percentage),
      });
      await onConfirm(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onClose={uploading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadFileIcon />}
              disabled={uploading}
            >
              {file ? 'Choose different file' : 'Choose file'}
              <input
                type="file"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Button>
          </Box>

          {file ? (
            <Box>
              <Typography variant="body2">{file.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {(file.size / 1024).toFixed(1)} KB
              </Typography>
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              No file selected
            </Typography>
          )}

          {uploading && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Uploading…
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {progress}%
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
          )}

          {error && (
            <Typography variant="caption" color="error">
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!file || uploading}
        >
          {uploading ? 'Uploading…' : 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
