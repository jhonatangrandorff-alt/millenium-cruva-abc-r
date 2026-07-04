import fs from 'fs';
import path from 'path';

const downloadsDir = 'c:\\Users\\Jhonatan\\Downloads';
const files = fs.readdirSync(downloadsDir).filter(f => f.endsWith('.csv'));

const parseCSVLine = (line, delimiter) => {
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);
    return parts;
};

function checkFile(file) {
    const filePath = path.join(downloadsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return;
    
    // Find delimiter
    const sample = lines.slice(0, 5).join('\n');
    const counts = { ';': (sample.match(/;/g) || []).length, ',': (sample.match(/,/g) || []).length, '\t': (sample.match(/\t/g) || []).length };
    const delimiter = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    
    // Find header
    let headerIndex = -1;
    let colMap = {};
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const cols = parseCSVLine(lines[i], delimiter).map(c => c.trim().toLowerCase());
        if (cols.includes('código') || cols.includes('codigo') || cols.includes('razão social') || cols.includes('razao social')) {
            headerIndex = i;
            cols.forEach((name, idx) => {
                colMap[name] = idx;
            });
            break;
        }
    }
    
    if (headerIndex === -1) {
        return;
    }
    
    console.log(`Checking file: ${file} (lines: ${lines.length}, delimiter: '${delimiter}')`);
    
    const getVal = (cols, possibleNames) => {
        for (const name of possibleNames) {
            const idx = colMap[name.toLowerCase()];
            if (idx !== undefined && cols[idx] !== undefined) {
                return cols[idx].trim().replace(/^"|"$/g, '').trim();
            }
        }
        return '';
    };
    
    let badDates = 0;
    
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i], delimiter);
        if (cols.length < 3) continue;
        
        const rawId = getVal(cols, ['código', 'codigo', 'id', 'cod']);
        if (!rawId || rawId.toLowerCase().includes('total')) continue;
        
        const lastPurchase = getVal(cols, ['ult. compra', 'ultima compra', 'dt ult. compra']);
        const register = getVal(cols, ['cadastro', 'dt. cadastro']);
        
        const testDate = (d, fieldName) => {
            if (!d) return;
            const cleanD = d.split(' ')[0];
            const parts = cleanD.split('/');
            if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                
                const yVal = Number(year);
                const mVal = Number(month);
                const dVal = Number(day);
                
                if (yVal === 0 || mVal === 0 || mVal > 12 || dVal === 0 || dVal > 31 || isNaN(yVal) || isNaN(mVal) || isNaN(dVal)) {
                    console.log(`Line ${i + 1}, ID: ${rawId} has invalid date in ${fieldName}: "${d}" -> "${year}-${month}-${day}"`);
                    badDates++;
                }
            } else if (cleanD !== '') {
                // If it's not empty and not in DD/MM/YYYY format
                console.log(`Line ${i + 1}, ID: ${rawId} has weird format in ${fieldName}: "${d}"`);
                badDates++;
            }
        };
        
        testDate(lastPurchase, 'lastPurchaseDate');
        testDate(register, 'registerDate');
    }
    
    if (badDates === 0) {
        console.log(`No bad dates in ${file}.`);
    } else {
        console.log(`Found ${badDates} bad date values in ${file}.`);
    }
}

files.forEach(checkFile);
