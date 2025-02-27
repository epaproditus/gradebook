export async function fetchProblems(teksStandard: string, count = 5, difficulty = 2) {
  const response = await fetch(
    `/api/problems/${teksStandard}?count=${count}&difficulty=${difficulty}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch problems');
  }
  
  const data = await response.json();
  return data.problems;
}
