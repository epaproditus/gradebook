import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function restoreNames() {
  try {
    console.log('Starting name restoration...');
    
    const csvFilePath = path.join(process.cwd(), 'names.csv');
    const parser = fs.createReadStream(csvFilePath).pipe(parse({
      columns: true,
      skip_empty_lines: true
    }));

    for await (const row of parser) {
      const studentId = parseInt(row['Student ID']);
      const name = row['Name'].replace(/"/g, '').trim();

      const { error } = await supabase
        .from('students')
        .update({ name })
        .eq('id', studentId);

      if (error) {
        console.error(`Error updating student ${studentId}:`, error);
      } else {
        console.log(`Updated student ${studentId} with name: ${name}`);
      }
    }

    console.log('Name restoration completed!');
  } catch (error) {
    console.error('Error restoring names:', error);
  }
}

restoreNames();
