import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface StandardScore {
  student_id: number;
  standard: string;
  correct: number;
  tested: number;
  mastery: number;
  test_date: string;
}

async function importStandardScores() {
  try {
    console.log('Starting standards import...');
    
    const parser = fs
      .createReadStream(path.join(process.cwd(), 'src', 'app', 'bench_by_se.csv'))
      .pipe(parse({ 
        columns: true,
        skip_empty_lines: true,
        from_line: 3, // Skip both header rows
        delimiter: ','
      }));

    const records: StandardScore[] = [];
    let rowCount = 0;

    // Standards we want to process (in order they appear in CSV)
    const standards = [
      '8.2C', '8.2D', '8.3A', '8.3C', '8.4A', '8.4B', '8.4C',
      '8.5A', '8.5C', '8.5D', '8.5E', '8.5F', '8.5G', '8.5H',
      '8.5I', '8.6A', '8.7A', '8.7B', '8.7C', '8.7D', '8.8A',
      '8.8C', '8.8D', '8.10B', '8.10C', '8.12C', '8.12D'
    ];

    for await (const row of parser) {
      rowCount++;
      const studentId = row.Id;
      if (!studentId || studentId === '426869') continue;

      // Process each standard
      for (const standard of standards) {
        // Each standard has three columns in CSV: standard (2012),Correct/Tested/Mastery
        const correct = parseInt(row[`${standard} (2012)`] || '0');
        const tested = parseInt(row[`${standard} (2012)`] || '0');
        const mastery = parseInt(row[`${standard} (2012)`] || '0');

        console.log(`Processing ${studentId} - ${standard}:`, {
          rawData: row[`${standard} (2012)`],
          correct,
          tested,
          mastery
        });

        if (tested > 0) {
          records.push({
            student_id: parseInt(studentId),
            standard,
            correct,
            tested,
            mastery,
            test_date: new Date().toISOString().split('T')[0]
          });
        }
      }

      if (rowCount % 10 === 0) {
        console.log(`Processed ${rowCount} students...`);
      }
    }

    console.log(`Importing ${records.length} standard scores...`);

    // Import in batches of 100
    for (let i = 0; i < records.length; i += 100) {
      const batch = records.slice(i, i + 100);
      const { error } = await supabase
        .from('benchmark_standards')
        .upsert(batch, {
          onConflict: 'student_id,standard,test_date', // Use column names instead of constraint name
          ignoreDuplicates: true
        });

      if (error) {
        console.error('Error importing batch:', error);
        continue;
      }

      console.log(`Imported batch ${i/100 + 1} of ${Math.ceil(records.length/100)}`);
    }

    console.log('Import completed successfully!');

  } catch (error) {
    console.error('Error importing standard scores:', error);
  }
}

importStandardScores();
