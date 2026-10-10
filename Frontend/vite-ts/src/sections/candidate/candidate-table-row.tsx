import type { CandidateDto } from 'src/types/candidate';
import type { InterviewDto } from 'src/actions/interviews';

import { useBoolean, usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import ButtonBase from '@mui/material/ButtonBase';

import { fDate } from 'src/utils/format-time';

import { downloadCandidateCv } from 'src/actions/candidates';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomPopover } from 'src/components/custom-popover';

import { CandidateEditDialog } from './candidate-edit-dialog';
import { CandidateConvertDialog } from './candidate-convert-dialog';
import { InterviewScheduleDialog } from './interview-schedule-dialog';
import { interviewWhen, CandidateInterviewsDialog } from './candidate-interviews-dialog';

// ----------------------------------------------------------------------

type Props = {
  row: CandidateDto;
  /** The candidate's next upcoming interview, if any. */
  nextInterview?: InterviewDto;
};

export function CandidateTableRow({ row, nextInterview }: Props) {
  const menuActions = usePopover();
  const editDialog = useBoolean();
  const convertDialog = useBoolean();
  const scheduleDialog = useBoolean();
  const interviewsDialog = useBoolean();

  const isHired = row.status === 'HIRED';

  const handleDownloadCv = async () => {
    menuActions.onClose();
    try {
      await downloadCandidateCv(row.id, row.cvOriginalName);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Download failed!');
    }
  };

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'right-top' } }}
    >
      <MenuList>
        {row.status === 'SHORTLISTED' && (
          <MenuItem
            onClick={() => {
              scheduleDialog.onTrue();
              menuActions.onClose();
            }}
          >
            <Iconify icon="solar:calendar-date-bold" />
            Schedule interview
          </MenuItem>
        )}

        <MenuItem
          onClick={() => {
            interviewsDialog.onTrue();
            menuActions.onClose();
          }}
        >
          <Iconify icon="solar:clock-circle-bold" />
          Interviews
        </MenuItem>

        <MenuItem onClick={handleDownloadCv}>
          <Iconify icon="solar:download-bold" />
          Download CV
        </MenuItem>

        {!isHired && (
          <MenuItem
            onClick={() => {
              editDialog.onTrue();
              menuActions.onClose();
            }}
          >
            <Iconify icon="solar:pen-bold" />
            Edit
          </MenuItem>
        )}

        {!isHired && (
          <MenuItem
            onClick={() => {
              convertDialog.onTrue();
              menuActions.onClose();
            }}
          >
            <Iconify icon="solar:user-plus-bold" />
            Convert to employee
          </MenuItem>
        )}
      </MenuList>
    </CustomPopover>
  );

  return (
    <>
      <TableRow hover>
        <TableCell>
          <Stack sx={{ typography: 'body2', minWidth: 0 }}>
            <Box component="span" sx={{ wordBreak: 'break-word' }}>
              {row.name}
            </Box>
            <Box
              component="span"
              sx={{
                color: 'text.secondary',
                maxWidth: 260,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
            >
              {row.email}
            </Box>
          </Stack>
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.phone || '—'}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.cvOriginalName}</TableCell>

        <TableCell>
          <Label
            variant="soft"
            color={
              (row.status === 'HIRED' && 'success') ||
              (row.status === 'SHORTLISTED' && 'info') ||
              (row.status === 'OFFERED' && 'warning') ||
              (row.status === 'REJECTED' && 'error') ||
              'default'
            }
          >
            {row.status}
          </Label>
          {nextInterview && (
            <ButtonBase
              onClick={interviewsDialog.onTrue}
              sx={{
                mt: 0.75,
                gap: 0.5,
                display: 'flex',
                borderRadius: 0.5,
                typography: 'caption',
                color: 'info.main',
                whiteSpace: 'nowrap',
              }}
            >
              <Iconify icon="solar:calendar-date-bold" width={14} />
              {interviewWhen(nextInterview).replace(/\s\d{4}/, '')}
            </ButtonBase>
          )}
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.uploadedByName}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDate(row.createdAt)}</TableCell>

        <TableCell>
          <IconButton
            color={menuActions.open ? 'inherit' : 'default'}
            onClick={menuActions.onOpen}
          >
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      {renderMenuActions()}

      {editDialog.value && (
        <CandidateEditDialog open={editDialog.value} onClose={editDialog.onFalse} candidate={row} />
      )}

      {scheduleDialog.value && (
        <InterviewScheduleDialog open onClose={scheduleDialog.onFalse} candidate={row} />
      )}

      {interviewsDialog.value && (
        <CandidateInterviewsDialog open onClose={interviewsDialog.onFalse} candidate={row} />
      )}

      {convertDialog.value && (
        <CandidateConvertDialog
          open={convertDialog.value}
          onClose={convertDialog.onFalse}
          candidate={row}
        />
      )}
    </>
  );
}
