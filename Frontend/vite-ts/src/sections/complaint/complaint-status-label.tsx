import type { LabelColor } from 'src/components/label';
import type { ComplaintStatus } from 'src/types/complaint';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

const STATUS_COLOR: Record<ComplaintStatus, LabelColor> = {
  SUBMITTED: 'warning',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
};

export const COMPLAINT_STATUS_LABEL: Record<ComplaintStatus, string> = {
  SUBMITTED: 'Submitted',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
};

type Props = { status: ComplaintStatus };

export function ComplaintStatusLabel({ status }: Props) {
  return (
    <Label variant="soft" color={STATUS_COLOR[status]}>
      {COMPLAINT_STATUS_LABEL[status]}
    </Label>
  );
}
