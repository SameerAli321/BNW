import type { LabelColor } from 'src/components/label';
import type { AttendanceRegularizationStatus } from 'src/types/attendance-regularization';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

const STATUS_COLOR: Record<AttendanceRegularizationStatus, LabelColor> = {
  PENDING_HOD: 'warning',
  HOD_NOT_RECOMMENDED: 'error',
  PENDING_HR: 'info',
  TAKEN_ON_RECORD: 'success',
  NOT_IN_ORDER: 'error',
};

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceRegularizationStatus, string> = {
  PENDING_HOD: 'Waiting for HOD',
  HOD_NOT_RECOMMENDED: 'Not recommended by HOD',
  PENDING_HR: 'Waiting for HR',
  TAKEN_ON_RECORD: 'Taken on record',
  NOT_IN_ORDER: 'Not in order',
};

type Props = { status: AttendanceRegularizationStatus };

export function AttendanceRegularizationStatusLabel({ status }: Props) {
  return (
    <Label variant="soft" color={STATUS_COLOR[status]}>
      {ATTENDANCE_STATUS_LABEL[status]}
    </Label>
  );
}
