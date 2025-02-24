const { data: student } = await supabase
  .from('students')
  .select('*')  // Make sure we're selecting all student fields including 'name'
  .eq('id', id)
  .single();
