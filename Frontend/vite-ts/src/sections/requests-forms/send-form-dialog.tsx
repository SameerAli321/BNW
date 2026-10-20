import type { Dayjs } from 'dayjs';
import type { UserDto } from 'src/types/user';
import type { FormAssignmentType } from 'src/actions/form-assignments';

import dayjs from 'dayjs';
import { useState } from 'react';

import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { formatPatterns } from 'src/utils/format-time';

import { avatarSrc, useGetUsers } from 'src/actions/users';
import { sendFormAssignment, FORM_ASSIGNMENT_TYPE_OPTIONS } from 'src/actions/form-assignments';

import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

const MAX_RECIPIENTS = 100;

const userLabel = (user: UserDto) =>
  `${user.firstName} ${user.lastName}${user.employeeCode ? ` (${user.employeeCode})` : ''}`;

type Props = {
  open: boolean;
  onClose: () => void;
};

/** HR / Admin: pick employees + a form (+ optional message and due date) and send it to each. */
export function SendFormDialog({ open, onClose }: Props) {
  // Active users only; a high limit so the whole company fits in the picker.
  const { users, usersLoading } = useGetUsers({ status: 'ACTIVE', limit: 500 });

  const [recipients, setRecipients] = useState<UserDto[]>([]);
  const [formType, setFormType] = useState<FormAssignmentType | ''>('');
  const [message, setMessage] = useState('');
  const [dueDate, setDueDate] = useState<Dayjs | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const recipientsError = submitted && !recipients.length;
  const formTypeError = submitted && !formType;
  const dueDateError = !!dueDate && (!dueDate.isValid() || dueDate.isBefore(dayjs(), 'day'));

  const handleClose = () => {
    setRecipients([]);
    setFormType('');
    setMessage('');
    setDueDate(null);
    setSubmitted(false);
    onClose();
  };

  const handleSend = async () => {
    setSubmitted(true);
    if (!recipients.length || !formType || dueDateError) return;

    setSending(true);
    try {
      const created = await sendFormAssignment({
        userIds: recipients.map((user) => user.id),
        formType,
        message: message.trim() || undefined,
        dueDate: dueDate ? dueDate.format('YYYY-MM-DD') : undefined,
      });
      toast.success(
        created.length === 1
          ? `Form sent to ${created[0].userName}`
          : `Form sent to ${created.length} employees`
      );
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Could not send the form');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Send a form</DialogTitle>

      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          Each employee sees it under &quot;Forms sent to you&quot; on their Requests &amp; Forms
          page and gets a notification and an email.
        </Typography>

        <Stack spacing={3}>
          <Autocomplete
            multiple
            disableCloseOnSelect
            options={users}
            loading={usersLoading}
            value={recipients}
            onChange={(_event, value) => setRecipients(value.slice(0, MAX_RECIPIENTS))}
            getOptionLabel={userLabel}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterSelectedOptions
            renderOption={(props, option) => {
              const { key, ...rest } = props as typeof props & { key: string };
              return (
                <li key={key} {...rest}>
                  <Avatar
                    src={avatarSrc(option.avatarUrl)}
                    alt={option.firstName}
                    sx={{ width: 28, height: 28, mr: 1.5 }}
                  >
                    {option.firstName.charAt(0).toUpperCase()}
                  </Avatar>
                  <Stack sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {userLabel(option)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                      {[option.designation, option.departmentName].filter(Boolean).join(' · ') ||
                        option.email}
                    </Typography>
                  </Stack>
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Employees"
                placeholder={recipients.length ? '' : 'Search by name or code...'}
                error={recipientsError}
                helperText={
                  recipientsError
                    ? 'Pick at least one employee'
                    : `${recipients.length} selected (up to ${MAX_RECIPIENTS})`
                }
              />
            )}
          />

          <TextField
            select
            label="Form"
            value={formType}
            onChange={(event) => setFormType(event.target.value as FormAssignmentType)}
            error={formTypeError}
            helperText={formTypeError ? 'Pick a form' : undefined}
          >
            {FORM_ASSIGNMENT_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Message (optional)"
            placeholder="e.g. Please submit your onboarding form before your first payroll."
            multiline
            minRows={3}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
          />

          <DatePicker
            label="Due date (optional)"
            value={dueDate}
            onChange={(value) => setDueDate(value)}
            disablePast
            format={formatPatterns.split.date}
            slotProps={{
              textField: {
                error: dueDateError,
                helperText: dueDateError ? 'Pick today or a later date' : undefined,
              },
              field: { clearable: true },
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button color="inherit" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="contained" loading={sending} onClick={handleSend}>
          Send form
        </Button>
      </DialogActions>
    </Dialog>
  );
}
