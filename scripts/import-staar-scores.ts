import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function importStaarScores() {
  try {
    console.log('Starting STAAR scores import...');
    
    // Fix the path to the CSV file
    const parser = fs
      .createReadStream(path.join(process.cwd(), '7thgradestaarscores.csv'))
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        trim: true // Add trim to handle any whitespace
      }));

    // Debug the data as it's being read
    let rowCount = 0;
    const records = [];
    
    for await (const row of parser) {
      rowCount++;
      console.log(`Processing row ${rowCount}:`, {
        id: row.LocalId,
        score: row['STAAR MA07 PcntScore']
      });

      if (row['STAAR MA07 PcntScore']) {
        records.push({
          student_id: parseInt(row.LocalId),
          grade: 7,
          score: parseInt(row['STAAR MA07 PcntScore']),
          created_at: new Date().toISOString()
        });
      }
    }

    console.log(`Importing ${records.length} STAAR scores...`);

    const { error } = await supabase
      .from('staar_scores')
      .upsert(records, {
        onConflict: 'student_id,grade'
      });

    if (error) throw error;
    console.log('STAAR scores imported successfully!');

  } catch (error) {
    console.error('Error importing STAAR scores:', error);
    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

importStaarScores();
