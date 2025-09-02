export function parseStudentEmail(email: string): {
  firstName: string;
  lastName: string;
  studentId: string;
} {
  const [localPart] = email.split('@');
  const [firstName, lastNameWithId] = localPart.split('.');
  const lastName = lastNameWithId.slice(0, -3);
  const studentId = lastNameWithId.slice(-3);
  
  return {
    firstName,
    lastName,
    studentId
  };
}

export function formatStudentEmail(firstName: string, lastName: string, studentId: string): string {
  // Take only first last name if multiple exist
  const primaryLastName = lastName.split(' ')[0].toLowerCase();
  return `${firstName.toLowerCase()}.${primaryLastName}${studentId}@vanguardacademy.net`;
}
