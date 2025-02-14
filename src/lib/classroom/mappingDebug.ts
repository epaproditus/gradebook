export function logMappingDebug(studentId: string, mappingsMap: Map<string, string>, grade: any) {
  console.log(`Debugging mapping for student ${studentId}:`);
  console.log('Available mappings:', Array.from(mappingsMap.entries()));
  console.log('Grade object:', grade);
  console.log('Found mapping:', mappingsMap.get(studentId));
}
