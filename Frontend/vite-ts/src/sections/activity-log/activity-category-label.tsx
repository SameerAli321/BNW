import type { LabelColor } from 'src/components/label';
import type { ActivityCategory } from 'src/types/activity-log';

import { Label } from 'src/components/label';

import { ACTIVITY_CATEGORY_OPTIONS } from 'src/types/activity-log';

// ----------------------------------------------------------------------

const CATEGORY_COLOR: Record<ActivityCategory, LabelColor> = {
  CLIENT_WORK: 'primary',
  INTERNAL: 'info',
  MEETING: 'warning',
  TRAINING: 'success',
  ADMINISTRATIVE: 'secondary',
  OTHER: 'default',
};

type Props = { category: ActivityCategory };

export function ActivityCategoryLabel({ category }: Props) {
  const label = ACTIVITY_CATEGORY_OPTIONS.find((option) => option.value === category)?.label;

  return (
    <Label variant="soft" color={CATEGORY_COLOR[category]}>
      {label ?? category}
    </Label>
  );
}
