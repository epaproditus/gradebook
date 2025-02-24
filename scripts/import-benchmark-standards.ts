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
        delimiter: ',',
      }));

    const records: StandardScore[] = [];
    let rowCount = 0;

    for await (const row of parser) {
      rowCount++;
      const studentId = row.Id;
      if (!studentId || studentId === '426869') continue;

      // Find all standard columns
      const standardColumns = Object.keys(row).filter(key => key.includes('(2012)'));
      const standards = new Set(standardColumns.map(col => col.split(' (2012)')[0].trim()));

      for (const standard of standards) {
        // Get values for this standard
        const correct = parseInt(row[`${standard} (2012) Correct`] || '0');
        const tested = parseInt(row[`${standard} (2012) Tested`] || '0');
        const mastery = (tested > 0) ? Math.round((correct / tested) * 100) : 0;

        console.log(`Student ${studentId} - ${standard}:`, {
          correct,
          tested,
          calculated_mastery: mastery
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
