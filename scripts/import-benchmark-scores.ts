import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function determinePerformanceLevel(row: any): string {
  if (row.Masters === 'Yes') return 'Masters';
  if (row.Meets === 'Yes') return 'Meets';
  if (row['Approaches High'] === 'Yes' || row['Approaches Low'] === 'Yes') return 'Approaches';
  return 'Did Not Meet';
}

async function importScores() {
  try {
    console.log('Starting import process...');
    console.log('Reading CSV file...');
    
    const parser = fs
      .createReadStream(path.join(process.cwd(), 'ben_stu_perf.csv'))
      .pipe(parse({ 
        columns: (headers) => {
          // Remove empty columns and trim whitespace
          return headers.filter(Boolean).map(h => h.trim());
        },
        skip_empty_lines: true,
        trim: true
      }));

    const records = [];
    let rowCount = 0;
    
    for await (const row of parser) {
      rowCount++;
      
      // Skip Rojo Alexa's records
      if (!row.LocalID || row.LocalID === '426869') {
        console.log('Skipping student:', row.Student, 'ID:', row.LocalID);
        continue;
      }

      console.log(`Processing row ${rowCount}:`, {
        Student: row.Student,
        LocalID: row.LocalID,
        Score: row.Score,
        PerformanceLevel: determinePerformanceLevel(row)
      });

      if (!row.LocalID || !row.Score) {
        console.log('Skipping row due to missing data');
        continue;
      }

      records.push({
        student_id: parseInt(row.LocalID),
        test_date: new Date().toISOString().split('T')[0],
        subject: 'Math',
        score: parseInt(row.Score),
        performance_level: determinePerformanceLevel(row),
        test_type: 'Spring'
      });
    }

    console.log(`Processed ${rowCount} rows, importing ${records.length} valid records...`);

    // Update upsert to use column names instead of constraint name
    const { data, error } = await supabase
      .from('benchmark_scores')
      .upsert(records, {
        onConflict: 'student_id,subject,test_date',
        ignoreDuplicates: true
      })
      .select();

    if (error) throw error;

    console.log(`Successfully imported ${records.length} benchmark scores`);
    console.log('First few imported records:', data?.slice(0, 3));
  } catch (error) {
    console.error('Error importing scores:', error);
  }
}

// Run the import
importScores();
