import type { TableHeadCellProps } from 'src/components/table';
import type { FormAssignmentDto, FormAssignmentStatus } from 'src/actions/form-assignments';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fDate, fDateTime } from 'src/utils/format-time';

import {
  cancelFormAssignment,
  useGetFormAssignments,
  completeFormAssignment,
  FORM_ASSIGNMENT_STATUS_COLOR,
} from 'src/actions/form-assignments';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import {
  useTable,
  TableNoData,
  TableSkeleton,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { dueDateInfo } from './form-assignment-utils';

// ----------------------------------------------------------------------

const STATUS_TABS: { value: FormAssignmentStatus | ''; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Done' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: '', label: 'All' },
];

const STATUS_LABEL: Record<FormAssignmentStatus, string> = {
  PENDING: 'Pending',
  COMPLETED: 'Done',
  CANCELLED: 'Cancelled',
};

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'employee', label: 'Employee' },
  { id: 'form', label: 'Form', width: 220 },
  { id: 'due', label: 'Due', width: 170 },
  { id: 'sent', label: 'Sent', width: 190 },
  { id: 'status', label: 'Status', width: 110 },
  { id: 'actions', label: '', width: 96 },
];

type Props = {
  onSendForm: () => void;
};

/** HR / Admin: every form assignment that's been sent, by status, with cancel / mark as done. */
export function SentFormsCard({ onSendForm }: Props) {
  const table = useTable({ defaultRowsPerPage: 10 });
  const [status, setStatus] = useState<FormAssignmentStatus | ''>('PENDING');
  const [toCancel, setToCancel] = useState<FormAssignmentDto | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const { formAssignments, formAssignmentsMeta, formAssignmentsLoading } = useGetFormAssignments({
    status,
    page: table.page + 1,
    limit: table.rowsPerPage,
  });

  const notFound = !formAssignmentsLoading && !formAssignments.length;

  const handleCancel = async () => {
    if (!toCancel) return;
    setCancelling(true);
    try {
      await cancelFormAssignment(toCancel.id);
      toast.success('Form cancelled');
      setToCancel(null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Could not cancel the form');
    } finally {
      setCancelling(false);
    }
  };

  const handleComplete = async (row: FormAssignmentDto) => {
    try {
      await completeFormAssignment(row.id);
      toast.success('Marked as done');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Could not update the form');
    }
  };

  return (
    <>
      <Card sx={{ mb: 5 }}>
        <CardHeader
          title="Sent forms"
          subheader="Forms HR has asked employees to fill in."
          action={
            <Button
              size="small"
              color="inherit"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={onSendForm}
            >
              Send a form
            </Button>
          }
        />

        <Tabs
          value={status}
          onChange={(_event, value) => {
            table.onResetPage();
            setStatus(value);
          }}
          sx={{
            mt: 2,
            px: 2.5,
            boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}`,
          }}
        >
          {STATUS_TABS.map((tab) => (
            <Tab key={tab.label} value={tab.value} label={tab.label} />
          ))}
        </Tabs>

        <Box sx={{ position: 'relative' }}>
          <Scrollbar>
            <Table size="small" sx={{ minWidth: 860 }}>
              <TableHeadCustom headCells={TABLE_HEAD} />
              <TableBody>
                {formAssignmentsLoading ? (
                  <TableSkeleton rowCount={3} cellCount={TABLE_HEAD.length} />
                ) : (
                  formAssignments.map((row) => {
                    const due = row.status === 'PENDING' ? dueDateInfo(row.dueDate) : null;
                    return (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <Typography variant="subtitle2">{row.userName}</Typography>
                          {row.message && (
                            <Typography
                              variant="caption"
                              sx={{ color: 'text.secondary', display: 'block' }}
                              noWrap
                              title={row.message}
                            >
                              {row.message}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{row.formLabel}</TableCell>
                        <TableCell>
                          {due ? (
                            <Label color={due.color} variant="soft">
                              {due.text}
                            </Label>
                          ) : row.dueDate ? (
                            fDate(row.dueDate)
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{fDateTime(row.createdAt)}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            by {row.assignedByName ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Label color={FORM_ASSIGNMENT_STATUS_COLOR[row.status]} variant="soft">
                            {STATUS_LABEL[row.status]}
                          </Label>
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          {row.status === 'PENDING' && (
                            <>
                              <Tooltip title="Mark as done">
                                <IconButton size="small" onClick={() => handleComplete(row)}>
                                  <Iconify icon="eva:checkmark-fill" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Cancel">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setToCancel(row)}
                                >
                                  <Iconify icon="solar:close-circle-bold" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}

                <TableNoData notFound={notFound} />
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

        <TablePaginationCustom
          page={table.page}
          count={formAssignmentsMeta?.total ?? 0}
          rowsPerPage={table.rowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
          onPageChange={table.onChangePage}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>

      <ConfirmDialog
        open={!!toCancel}
        onClose={() => setToCancel(null)}
        title="Cancel this form?"
        content={
          toCancel &&
          `${toCancel.userName} will no longer be asked to fill in the ${toCancel.formLabel.toLowerCase()}. They'll get a notification.`
        }
        action={
          <Button variant="contained" color="error" loading={cancelling} onClick={handleCancel}>
            Cancel form
          </Button>
        }
      />
    </>
  );
}
