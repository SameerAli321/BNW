// ----------------------------------------------------------------------
// BNW OMS — shared helper for the Sprint 2 "streamed file" endpoints (document download, staff
// summary CSV export). No existing download-file utility was found under
// src/components/file-thumbnail or src/sections/file-manager (that section is demo-only, unwired
// — see docs/FRONTEND_STATUS.md), so this is a small new one rather than a new dependency.
// Triggers a browser save via a throwaway <a href> pointing at an object URL for the blob.

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}
