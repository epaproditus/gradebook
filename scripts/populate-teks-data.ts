import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';

interface TEKS {
  category: string;
  code: string;
  description: string;
}

async function generateTeksData() {
  const csvPath = path.join(process.cwd(), 'teks.csv');
  const outputPath = path.join(process.cwd(), 'src', 'lib', 'teksData.ts');
  
  // Read and parse the CSV
  const records: TEKS[] = [];
  const parser = fs.createReadStream(csvPath).pipe(parse({
    columns: true,
    skip_empty_lines: true
  }));

  for await (const row of parser) {
    const category = row['Reporting Category'].split(':')[0];
    records.push({
      category,
      code: row['Standard Code'],
      description: row['Description']
    });
  }

  // Generate the TypeScript file content
  const fileContent = `// filepath: /home/abe/.projects/gradebook/src/lib/teksData.ts
export interface TEKS {
  category: string;
  code: string;
  description: string;
}

export const teksCategories = {
  "1": "Numerical Representations and Relationships",
  "2": "Computations and Algebraic Relationships",
  "3": "Geometry and Measurement",
  "4": "Data Analysis and Personal Financial Literacy"
};

export const teksData: TEKS[] = ${JSON.stringify(records, null, 2)};

export function getTeksCategory(standardCode: string): string {
  const teks = teksData.find(t => t.code === standardCode);
  return teks ? teks.category : "0";
}

export function getTeksDescription(standardCode: string): string {
  const teks = teksData.find(t => t.code === standardCode);
  return teks ? teks.description : "No description available";
}
`;

  // Write the file
  fs.writeFileSync(outputPath, fileContent);
  console.log('TEKS data file generated successfully!');
}

generateTeksData();
