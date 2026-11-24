import type { TableHeadCellProps } from 'src/components/table';
import type { NoteEntity, InternalNoteDto } from 'src/actions/internal-notes';

import { useState } from 'react';
import { useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  noteEntityHref,
  NOTE_ENTITY_LABELS,
  deleteInternalNote,
  NOTE_ENTITY_OPTIONS,
  useGetInternalNotes,
} from 'src/actions/internal-notes';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';
import { RoleBasedGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------
// Every "Notes for HR" written on a create form, newest first — HR / Admin only.

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'note', label: 'Note' },
  { id: 'entity', label: 'Written on', width: 220 },
  { id: 'author', label: 'Written by', width: 180 },
  { id: 'createdAt', label: 'When', width: 180 },
  { id: '', width: 60 },
];

export function InternalNotesView() {
  const table = useTable({ defaultRowsPerPage: 25, defaultOrderBy: '' });
  const { user } = useAuthContext();

  const [entity, setEntity] = useState<NoteEntity | ''>('');
  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim(), 400);

  const { notes, notesMeta, notesLoading } = useGetInternalNotes({
    entity,
    q,
    page: table.page + 1,
    limit: table.rowsPerPage,
  });

  const [deleting, setDeleting] = useState<InternalNoteDto | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteInternalNote(deleting.id);
      toast.success('Note deleted');
      setDeleting(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Could not delete the note');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <RoleBasedGuard hasContent currentRole={user?.role ?? ''} allowedRoles={['HR', 'ADMIN']}>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Notes for HR"
          links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Notes for HR' }]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ p: 2.5 }}>
            <TextField
              select
              label="Written on"
              value={entity}
              onChange={(event) => {
                setEntity(event.target.value as NoteEntity | '');
                table.onResetPage();
              }}
              sx={{ width: { xs: 1, sm: 260 }, flexShrink: 0 }}
            >
              <MenuItem value="">Everything</MenuItem>
              {NOTE_ENTITY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                table.onResetPage();
              }}
              placeholder="Search notes or names..."
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Stack>

          <Box sx={{ position: 'relative' }}>
            <Scrollbar>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 800 }}>
                <TableHeadCustom headCells={TABLE_HEAD} rowCount={notes.length} />

                <TableBody>
                  {notes.map((note) => {
                    const href = noteEntityHref(note.entity, note.entityId);
                    const label = `${NOTE_ENTITY_LABELS[note.entity] ?? note.entity} #${note.entityId}`;
                    return (
                      <TableRow key={note.id} hover>
                        <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{note.note}</TableCell>
                        <TableCell>
                          {href ? (
                            <Link component={RouterLink} href={href} color="inherit">
                              {label}
                            </Link>
                          ) : (
                            label
                          )}
                        </TableCell>
                        <TableCell>{note.createdByName ?? 'Unknown'}</TableCell>
                        <TableCell>{fDateTime(note.createdAt)}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Delete">
                            <IconButton color="error" onClick={() => setDeleting(note)}>
                              <Iconify icon="solar:trash-bin-trash-bold" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  <TableNoData notFound={!notesLoading && !notes.length} />
                </TableBody>
              </Table>
            </Scrollbar>
          </Box>

          <TablePaginationCustom
            page={table.page}
            dense={table.dense}
            count={notesMeta?.total ?? 0}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onChangeDense={table.onChangeDense}
            onRowsPerPageChange={table.onChangeRowsPerPage}
          />
        </Card>

        <ConfirmDialog
          open={!!deleting}
          onClose={() => !deleteBusy && setDeleting(null)}
          title="Delete note?"
          content="This note will be removed for everyone. This can't be undone."
          action={
            <Button variant="contained" color="error" loading={deleteBusy} onClick={handleDelete}>
              Delete
            </Button>
          }
        />
      </DashboardContent>
    </RoleBasedGuard>
  );
}
