// How a person is employed. Interns are users with INTERN here — they sign in and use the app like
// any team member; the type only labels them (users table, staff summary, team hierarchy).
export enum EmploymentType {
  PERMANENT = 'PERMANENT',
  CONTRACT = 'CONTRACT',
  PROBATION = 'PROBATION',
  INTERN = 'INTERN',
}
