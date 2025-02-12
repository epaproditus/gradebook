import { supabase } from '@/lib/supabaseConfig';

export async function checkStudentPeriods() {
  console.log('Running period check...');
  
  // First, check raw data
  const { data: rawData, error: rawError } = await supabase
    .from('students')
    .select('*');
  
  console.log('Raw student data:', rawData);
  console.log('Raw query error:', rawError);

  // Then check periods specifically
  const { data, error } = await supabase
    .from('students')
    .select('id, name, period')
    .order('period');
    
  console.log('Students with periods:', data);
  console.log('Period query error:', error);
  
  if (data) {
    // Count students per period
    const periodsCount = data.reduce((acc, student) => {
      const period = student.period;
      if (period) {
        acc[period] = (acc[period] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Periods distribution:', periodsCount);
    
    // Check for null/undefined periods
    const studentsWithoutPeriod = data.filter(s => !s.period);
    console.log('Students without period:', studentsWithoutPeriod);
  }
}

// Add this to check a specific student
export async function checkStudent(studentId: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single();
    
  console.log('Student details:', data);
  console.log('Query error:', error);
}
