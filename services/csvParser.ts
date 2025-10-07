const MAX_SAMPLE_ROWS = 100;

export interface ParsedCSVResult {
  headers: string[];
  sample: Record<string, string | number>[];
  rowCount: number;
}

// Helper function to clean header and value strings
const cleanString = (str: string): string => {
  if (typeof str !== 'string') return '';
  // Trim whitespace and remove surrounding quotes
  return str.trim().replace(/^['"]|['"]$/g, '');
};


export const parseCSV = (file: File): Promise<ParsedCSVResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event: ProgressEvent<FileReader>) => {
      try {
        if (!event.target?.result) {
          throw new Error('O arquivo não pôde ser lido.');
        }

        const text = event.target.result as string;
        const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
          throw new Error('O CSV deve ter um cabeçalho e pelo menos uma linha de dados.');
        }

        const headers = lines[0].split(',').map(cleanString);
        const data: Record<string, string | number>[] = [];
        const rowCount = lines.length - 1;

        const sampleSize = Math.min(rowCount, MAX_SAMPLE_ROWS);

        for (let i = 1; i <= sampleSize; i++) {
          const line = lines[i];
          if (!line) continue;

          // Robust CSV parsing logic to handle quoted commas
          const values = [];
          let currentVal = '';
          let inQuotes = false;
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              // Handle escaped quotes ("")
              if (inQuotes && line[j + 1] === '"') {
                currentVal += '"';
                j++; // Skip next quote
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              values.push(cleanString(currentVal));
              currentVal = '';
            } else {
              currentVal += char;
            }
          }
          values.push(cleanString(currentVal));

          const row: Record<string, string | number> = {};
          headers.forEach((header, index) => {
            const value = values[index] ?? '';
            // Attempt to convert to number if possible
            const numValue = Number(value);
            row[header] = isNaN(numValue) || value === '' ? value : numValue;
          });
          data.push(row);
        }

        resolve({ headers, sample: data, rowCount });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo.'));
    };

    reader.readAsText(file);
  });
};