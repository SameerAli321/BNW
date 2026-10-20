import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import CircularProgress from '@mui/material/CircularProgress';

import { downloadBlob } from 'src/utils/download-blob';

import axiosInstance from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export type PdfViewerDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Shown in the dialog header. */
  title?: string;
  /**
   * Fetches the file to show, e.g. `() => fetchLetterPdfBlob(id)`. Use the app's axios instance
   * (src/lib/axios) so the Bearer token is sent. Takes precedence over `url`.
   */
  load?: () => Promise<Blob>;
  /** Alternative to `load`: an API path (e.g. `endpoints.documents.download(id)`) fetched as a blob. */
  url?: string;
  /** File name for the Download button. Defaults to the title. */
  filename?: string;
};

type ViewerState =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; blob: Blob; objectUrl: string };

function isPdf(blob: Blob, filename?: string) {
  return blob.type === 'application/pdf' || /\.pdf$/i.test(filename ?? '');
}

function isImage(blob: Blob, filename?: string) {
  return blob.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(filename ?? '');
}

/**
 * In-app file viewer: fetches a file with the signed-in user's token and shows it inside the
 * system instead of downloading it — PDFs in an <iframe>, images in an <img>, anything else gets
 * a "Download" fallback. Always has a Download button. The object URL is revoked when the dialog
 * closes. Full-screen on phones.
 *
 * @example
 * <PdfViewerDialog
 *   open={viewer.value}
 *   onClose={viewer.onFalse}
 *   title="Offer letter"
 *   filename="offer-letter.pdf"
 *   load={() => fetchLetterPdfBlob(letter.id)}
 * />
 * // or, with any authenticated API path:
 * <PdfViewerDialog open onClose={close} title="CV" url={endpoints.documents.download(doc.id)} />
 */
export function PdfViewerDialog({ open, onClose, title, load, url, filename }: PdfViewerDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [state, setState] = useState<ViewerState>({ status: 'idle' });

  // Latest loader without re-fetching every time the parent re-renders with a new arrow function.
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!open) {
      setState({ status: 'idle' });
      return undefined;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setState({ status: 'loading' });

    const fetchBlob =
      loadRef.current ??
      (url
        ? async () => (await axiosInstance.get<Blob>(url, { responseType: 'blob' })).data
        : null);

    if (!fetchBlob) {
      setState({ status: 'error', message: 'Nothing to show.' });
      return undefined;
    }

    fetchBlob()
      .then((blob) => {
        if (cancelled) return;
        objectUrl = window.URL.createObjectURL(blob);
        setState({ status: 'ready', blob, objectUrl });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(error);
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Could not load the file.',
        });
      });

    return () => {
      cancelled = true;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [open, url]);

  const downloadName = filename || title || 'document';

  const handleDownload = () => {
    if (state.status === 'ready') downloadBlob(state.blob, downloadName);
  };

  const renderBody = () => {
    if (state.status === 'error') {
      return (
        <Stack spacing={1} sx={{ p: 5, alignItems: 'center', textAlign: 'center' }}>
          <Typography variant="subtitle1">Couldn&apos;t open this file</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {state.message}
          </Typography>
        </Stack>
      );
    }

    if (state.status !== 'ready') {
      return (
        <Box sx={{ p: 5, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      );
    }

    if (isPdf(state.blob, downloadName)) {
      return (
        <Box
          component="iframe"
          title={title ?? 'Document'}
          src={state.objectUrl}
          sx={{ border: 0, width: 1, height: 1, minHeight: { xs: 0, sm: '70vh' }, flexGrow: 1 }}
        />
      );
    }

    if (isImage(state.blob, downloadName)) {
      return (
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
          <Box
            component="img"
            alt={title ?? 'Image'}
            src={state.objectUrl}
            sx={{ maxWidth: 1, height: 'auto', objectFit: 'contain' }}
          />
        </Box>
      );
    }

    return (
      <Stack spacing={2} sx={{ p: 5, alignItems: 'center', textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          This file type can&apos;t be shown here. Download it to open it on your device.
        </Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:download-bold" />}
          onClick={handleDownload}
        >
          Download
        </Button>
      </Stack>
    );
  };

  return (
    <Dialog
      fullWidth
      maxWidth="lg"
      fullScreen={fullScreen}
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: { height: fullScreen ? 1 : '90vh', display: 'flex', flexDirection: 'column' } },
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          py: 1.5,
          pl: 2.5,
          pr: 1.5,
          alignItems: 'center',
          borderBottom: `1px solid ${theme.vars.palette.divider}`,
        }}
      >
        <Typography variant="subtitle1" noWrap sx={{ flexGrow: 1 }}>
          {title ?? 'Document'}
        </Typography>

        <Button
          size="small"
          variant="outlined"
          color="inherit"
          disabled={state.status !== 'ready'}
          startIcon={<Iconify icon="solar:download-bold" />}
          onClick={handleDownload}
        >
          Download
        </Button>

        <Tooltip title="Close">
          <IconButton onClick={onClose}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {renderBody()}
      </Box>
    </Dialog>
  );
}
