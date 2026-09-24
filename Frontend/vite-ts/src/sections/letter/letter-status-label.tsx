import type { LetterStatus } from 'src/types/letter';
import type { LabelColor } from 'src/components/label';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

const STATUS_COLOR: Record<LetterStatus, LabelColor> = {
  DRAFT: 'default',
  PENDING_CEO: 'warning',
  CHANGES_REQUESTED: 'error',
  CEO_SIGNED: 'info',
  SENT_TO_EMPLOYEE: 'info',
  SIGNED: 'success',
  ARCHIVED: 'default',
  CANCELLED: 'error',
};

const STATUS_LABEL: Record<LetterStatus, string> = {
  DRAFT: 'Draft',
  PENDING_CEO: 'Pending CEO',
  CHANGES_REQUESTED: 'Changes requested',
  CEO_SIGNED: 'CEO signed',
  SENT_TO_EMPLOYEE: 'Sent to employee',
  SIGNED: 'Signed',
  ARCHIVED: 'Archived',
  CANCELLED: 'Cancelled',
};

type Props = { status: LetterStatus };

export function LetterStatusLabel({ status }: Props) {
  return (
    <Label variant="soft" color={STATUS_COLOR[status]}>
      {STATUS_LABEL[status]}
    </Label>
  );
}
