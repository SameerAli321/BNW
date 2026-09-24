import { EmployeeProfile } from '../../entities/employee-profile.entity';

export interface EmployeeProfileDto {
  userId: number;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  nationalId: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  updatedAt: string | null;
}

/** Maps an EmployeeProfile entity to the API's EmployeeProfileDto shape, per the gap-fix doc. */
export function toEmployeeProfileDto(profile: EmployeeProfile): EmployeeProfileDto {
  return {
    userId: profile.userId,
    phone: profile.phone,
    address: profile.address,
    dateOfBirth: profile.dateOfBirth,
    gender: profile.gender,
    emergencyContactName: profile.emergencyContactName,
    emergencyContactPhone: profile.emergencyContactPhone,
    nationalId: profile.nationalId,
    bankName: profile.bankName,
    bankAccountNumber: profile.bankAccountNumber,
    updatedAt: profile.updatedAt ? profile.updatedAt.toISOString() : null,
  };
}
