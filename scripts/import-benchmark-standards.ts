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
    
    // First, delete all existing records
    console.log('Deleting existing records...');
    const { error: deleteError } = await supabase
      .from('benchmark_standards')
      .delete()
      .neq('student_id', 0); // Delete all records (using neq as a trick since student_id can't be 0)

    if (deleteError) {
      throw new Error(`Failed to delete existing records: ${deleteError.message}`);
    }

    const csvFilePath = path.join(process.cwd(), 'src', 'app', 'bench_by_se.csv');
    console.log('Reading CSV:', csvFilePath);

    // Read file line by line to handle raw data
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');

    // Use a proper CSV parser that handles quoted fields
    const parser = parse(fileContent, {
      skip_empty_lines: true,
      columns: false,
      quote: '"',
      ltrim: true,
      rtrim: true
    });

    const rows = await new Promise<string[][]>((resolve) => {
      const results: string[][] = [];
      parser.on('data', (row) => results.push(row));
      parser.on('end', () => resolve(results));
    });

    const headerRow = rows[0];
    const subHeaderRow = rows[1];
    const dataRows = rows.slice(2);

    // Map standards to their column indices
    const standardsMap = new Map<string, { correct: number, tested: number, mastery: number }>();

    const SKIP_COLUMNS = 2; // Changed from 3 to 2 (just name and id now)
    const COLUMNS_PER_STANDARD = 3; // correct, tested, mastery

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
        // Calculate correct indices based on the pattern in the CSV
        if (subHeader === 'Correct') indices.correct = index;
        if (subHeader === 'Tested') indices.tested = index;
        if (subHeader === 'Mastery') indices.mastery = index;
      }
    });

    const records: StandardScore[] = [];
    let rowCount = 0;

    // Process each data row manually
    for (const columns of dataRows) {
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

      // Process each standard
      for (const [standard, indices] of standardsMap) {
        const rawCorrect = columns[indices.correct]?.trim() || '0';
        const rawTested = columns[indices.tested]?.trim() || '0';
        const rawMastery = columns[indices.mastery]?.trim() || '0';
        
        // Parse the raw values
        const numCorrect = parseInt(rawCorrect, 10);
        const numTested = parseInt(rawTested, 10);
        const mastery = parseInt(rawMastery, 10);

        if (numTested > 0) {
          // Calculate percentage based on correct vs tested
          const percentage = Math.round((numCorrect / numTested) * 100);

          // Debug log for Leila
          if (studentId === 423306) {
            console.log(`${standard}:`, {
              raw: [rawCorrect, rawTested, rawMastery],
              calculated: { 
                numCorrect, 
                numTested, 
                percentage,
                mastery 
              }
            });
          }
          
          records.push({
            student_id: studentId,
            standard,
            correct: percentage,  // Store calculated percentage
            tested: numTested,
            mastery: mastery,
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
        .insert(batch); // Changed from upsert to insert since we cleared the table

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
