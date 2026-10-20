import type { PdfViewerDialogProps } from './pdf-viewer-dialog';

import { useState, useCallback } from 'react';

// ----------------------------------------------------------------------

export type PdfViewerTarget = Pick<PdfViewerDialogProps, 'title' | 'load' | 'url' | 'filename'>;

/**
 * One viewer for a whole list (e.g. a table of documents): call `openViewer({ title, load })`
 * from any row and spread `viewerProps` onto a single <PdfViewerDialog />.
 *
 * @example
 * const { openViewer, viewerProps } = usePdfViewer();
 * <Button onClick={() => openViewer({ title: doc.name, url: endpoints.documents.download(doc.id) })}>
 *   View
 * </Button>
 * <PdfViewerDialog {...viewerProps} />
 */
export function usePdfViewer() {
  const [open, setOpen] = useState(false);
  // Kept after closing so the dialog's close animation still has its title.
  const [target, setTarget] = useState<PdfViewerTarget>({});

  const openViewer = useCallback((next: PdfViewerTarget) => {
    setTarget(next);
    setOpen(true);
  }, []);

  const closeViewer = useCallback(() => setOpen(false), []);

  const viewerProps: PdfViewerDialogProps = { ...target, open, onClose: closeViewer };

  return { openViewer, closeViewer, viewerProps };
}
