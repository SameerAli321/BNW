import type { LabelColor } from 'src/components/label';
import type { AppraisalStatus } from 'src/types/appraisal';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

const STATUS_COLOR: Record<AppraisalStatus, LabelColor> = {
  PENDING_MANAGER: 'warning',
  MANAGER_REJECTED: 'error',
  PENDING_CEO: 'info',
  CEO_ACCEPTED: 'success',
  CEO_REJECTED: 'error',
};

const STATUS_LABEL: Record<AppraisalStatus, string> = {
  PENDING_MANAGER: 'Pending manager',
  MANAGER_REJECTED: 'Rejected by manager',
  PENDING_CEO: 'Pending CEO',
  CEO_ACCEPTED: 'Accepted by CEO',
  CEO_REJECTED: 'Rejected by CEO',
};

type Props = { status: AppraisalStatus };

export function AppraisalStatusLabel({ status }: Props) {
  return (
    <Label variant="soft" color={STATUS_COLOR[status]}>
      {STATUS_LABEL[status]}
    </Label>
  );
}
