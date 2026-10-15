import type { BookingResource, BookingResourceType } from 'src/actions/bookings';

import { useState } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  BOOKING_ADMIN_ROLES,
  createBookingResource,
  updateBookingResource,
  useGetBookingResources,
} from 'src/actions/bookings';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { RoleBasedGuard } from 'src/auth/guard';
import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const TYPE_LABEL: Record<BookingResourceType, string> = {
  MEETING_ROOM: 'Meeting room',
  POOL_TABLE: 'Pool table',
};

type Draft = {
  id?: number;
  type: BookingResourceType;
  name: string;
  location: string;
  capacity: string;
};

/**
 * Rooms & tables (HR / Admin): the meeting rooms and pool tables people can book. Deactivating one
 * stops new bookings but keeps existing bookings and history.
 */
export function BookingResourcesView() {
  const { user } = useAuthContext();
  const { resources, resourcesLoading } = useGetBookingResources({ includeInactive: true });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error('Enter a name');
      return;
    }
    const capacity = draft.capacity.trim() ? Number(draft.capacity) : null;
    if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) {
      toast.error('Seats must be a whole number');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        location: draft.location.trim() || null,
        capacity,
      };
      if (draft.id) await updateBookingResource(draft.id, payload);
      else await createBookingResource({ type: draft.type, ...payload });
      toast.success(draft.id ? 'Saved' : `${TYPE_LABEL[draft.type]} added`);
      setDraft(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (resource: BookingResource) => {
    try {
      await updateBookingResource(resource.id, { isActive: !resource.isActive });
      toast.success(
        resource.isActive
          ? `${resource.name} deactivated — existing bookings are kept`
          : `${resource.name} can be booked again`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update');
    }
  };

  return (
    <RoleBasedGuard hasContent currentRole={user?.role ?? ''} allowedRoles={BOOKING_ADMIN_ROLES}>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Rooms & tables"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Bookings', href: paths.dashboard.bookings.root },
            { name: 'Rooms & tables' },
          ]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() =>
                setDraft({ type: 'MEETING_ROOM', name: '', location: '', capacity: '' })
              }
            >
              Add room / table
            </Button>
          }
          sx={{ mb: { xs: 3, md: 4 } }}
        />

        <Card>
          <TableContainer>
            <Scrollbar>
              <Table sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Seats</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resourcesLoading ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <LinearProgress />
                      </TableCell>
                    </TableRow>
                  ) : !resources.length ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <EmptyContent title="No rooms or tables yet" sx={{ py: 6 }} />
                      </TableCell>
                    </TableRow>
                  ) : (
                    resources.map((r) => (
                      <TableRow key={r.id} hover sx={{ opacity: r.isActive ? 1 : 0.6 }}>
                        <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                        <TableCell>{TYPE_LABEL[r.type]}</TableCell>
                        <TableCell>{r.capacity ?? '—'}</TableCell>
                        <TableCell>{r.location ?? '—'}</TableCell>
                        <TableCell>
                          <Label color={r.isActive ? 'success' : 'default'}>
                            {r.isActive ? 'Active' : 'Inactive'}
                          </Label>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              color="inherit"
                              startIcon={<Iconify icon="solar:pen-bold" />}
                              onClick={() =>
                                setDraft({
                                  id: r.id,
                                  type: r.type,
                                  name: r.name,
                                  location: r.location ?? '',
                                  capacity: r.capacity ? String(r.capacity) : '',
                                })
                              }
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              color={r.isActive ? 'error' : 'success'}
                              onClick={() => toggleActive(r)}
                            >
                              {r.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Scrollbar>
          </TableContainer>
        </Card>

        <Dialog open={!!draft} onClose={() => setDraft(null)} fullWidth maxWidth="xs">
          <DialogTitle>{draft?.id ? 'Edit' : 'Add room / table'}</DialogTitle>
          {draft && (
            <DialogContent>
              <Stack spacing={2.5} sx={{ pt: 1 }}>
                <TextField
                  select
                  label="Type"
                  value={draft.type}
                  disabled={!!draft.id}
                  onChange={(e) =>
                    setDraft({ ...draft, type: e.target.value as BookingResourceType })
                  }
                >
                  <MenuItem value="MEETING_ROOM">Meeting room</MenuItem>
                  <MenuItem value="POOL_TABLE">Pool table</MenuItem>
                </TextField>
                <TextField
                  autoFocus
                  label="Name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                />
                {draft.type === 'MEETING_ROOM' && (
                  <TextField
                    label="Seats (optional)"
                    type="number"
                    value={draft.capacity}
                    onChange={(e) => setDraft({ ...draft, capacity: e.target.value })}
                    slotProps={{ htmlInput: { min: 1, max: 500 } }}
                  />
                )}
                <TextField
                  label="Location (optional)"
                  value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                  placeholder="e.g. 2nd floor"
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                />
              </Stack>
            </DialogContent>
          )}
          <DialogActions>
            <Button color="inherit" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button variant="contained" loading={saving} onClick={save}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </DashboardContent>
    </RoleBasedGuard>
  );
}
