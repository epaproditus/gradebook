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
    
    const csvFilePath = path.join(process.cwd(), 'src', 'app', 'bench_by_se.csv');
    console.log('Reading CSV:', csvFilePath);

    // Read file line by line to handle raw data
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
    const lines = fileContent.split('\n');
    
    const headerRow = lines[0].split(',');
    const subHeaderRow = lines[1].split(',');
    const dataRows = lines.slice(2); // Skip header rows

    // Map standards to their column indices
    const standardsMap = new Map<string, { correct: number, tested: number, mastery: number }>();

    // Skip the first 3 columns (name, id, testcount)
    const SKIP_COLUMNS = 3;
    
    headerRow.forEach((header, index) => {
      if (header.includes('(2012)')) {
        const standard = header.split(' (2012)')[0].trim();
        const subHeader = subHeaderRow[index].trim();
        
        if (!standardsMap.has(standard)) {
          standardsMap.set(standard, { 
            correct: -1, 
            tested: -1, 
            mastery: -1 
          });
        }
        
        const indices = standardsMap.get(standard)!;
        // Adjust indices to account for skipped columns
        if (subHeader === 'Correct') indices.correct = index - SKIP_COLUMNS;
        if (subHeader === 'Tested') indices.tested = index - SKIP_COLUMNS;
        if (subHeader === 'Mastery') indices.mastery = index - SKIP_COLUMNS;
      }
    });

    const records: StandardScore[] = [];
    let rowCount = 0;

    // Process each data row manually
    for (const line of dataRows) {
      if (!line.trim()) continue;
      const columns = line.split(',');
      const match = columns[1]?.match(/\d+/);
      if (!match) {
        console.log(`Skipping row with invalid student ID: ${columns[1]}`);
        continue;
      }
      const studentId = parseInt(match[0], 10);

      // Before processing standards, just check if student exists
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('id', studentId)
        .single();

      if (!existingStudent) {
        console.log(`Skipping unknown student ID: ${studentId}`);
        continue;
      }

      console.log(`Processing student ${studentId}...`);

      // Process each standard using the column indices
      for (const [standard, indices] of standardsMap) {
        const rawCorrect = columns[indices.correct]?.trim() || '0';
        const rawTested = columns[indices.tested]?.trim() || '0';
        
        // First get the tested count
        const tested = parseInt(rawTested, 10);
        
        // Get the percentage from rawCorrect
        const percentageCorrect = parseInt(rawCorrect, 10);
        
        // Calculate actual correct answers based on tested count
        let correct: number;
        if (tested === 1) {
          // If only 1 question, 100% = 1 correct, 50% = 0.5 correct, 0% = 0 correct
          correct = percentageCorrect / 100;
        } else if (tested === 2) {
          // If 2 questions, 100% = 2 correct, 50% = 1 correct, 0% = 0 correct
          correct = (percentageCorrect / 100) * 2;
        } else {
          // For other cases, calculate proportionally
          correct = Math.round((percentageCorrect / 100) * tested);
        }

        if (tested > 0) {
          console.log(`Standard ${standard}:`, { 
            percentageCorrect,
            correct, 
            tested,
            calculatedPercentage: Math.round((correct/tested) * 100)
          });
          
          records.push({
            student_id: studentId,
            standard,
            correct,
            tested,
            mastery: parseInt(columns[indices.mastery] || '0'),
            test_date: new Date().toISOString().split('T')[0]
          });
        }
      }

      rowCount++; // Increment counter after processing
      if (rowCount % 10 === 0) {
        console.log(`Processed ${rowCount} students...`);
      }
    }

    console.log(`Found ${records.length} valid standard scores to import...`);

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
