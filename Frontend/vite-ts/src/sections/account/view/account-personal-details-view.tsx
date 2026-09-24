import { EmployeeProfileForm } from 'src/sections/employee-profile/employee-profile-form';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------
// BNW OMS — Gap-fix (Gap 1, `employee_profiles`), see docs/API_CONTRACT_GAPS_FIX.md. Self-editing
// entry point: a new "Personal details" tab on the Account page, alongside General/Security.

export function AccountPersonalDetailsView() {
  const { user } = useAuthContext();

  if (!user?.id) {
    return null;
  }

  return (
    <EmployeeProfileForm
      userId={user.id}
      title="Personal details"
      subheader="Kept for HR records — phone, address, emergency contact, bank details."
    />
  );
}
