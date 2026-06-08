import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const url = "https://acvpejgyqondqwsjbwaa.supabase.co";
const key = "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J";
const supabase = createClient(url, key);

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

const cleanClientName = (name) => {
    if (name === null || name === undefined || String(name).toLowerCase() === 'null') return '';
    return String(name).replace(/^[\d./\s-]{5,}\s+/, '').trim();
};

async function testImport() {
    const filePath = path.join('..', 'modelo_importacao_millenium (6).csv');
    console.log("Reading file:", filePath);
    const text = fs.readFileSync(filePath, 'utf-8');
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    
    console.log("Total lines read:", lines.length);
    if (lines.length === 0) {
        console.error("Empty file!");
        return;
    }

    const sample = lines.slice(0, 10).join('\n');
    const semicolonCount = (sample.match(/;/g) || []).length;
    const commaCount = (sample.match(/,/g) || []).length;
    const tabCount = (sample.match(/\t/g) || []).length;

    let delimiter = ';';
    if (tabCount > semicolonCount && tabCount > commaCount) delimiter = '\t';
    else if (commaCount > semicolonCount) delimiter = ',';
    console.log("Detected delimiter:", delimiter);

    let headerIndex = -1;
    let colMap = {};

    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      const cols = parseCSVLine(lines[i], delimiter).map(c => c.trim().toLowerCase());
      if (cols.some(c => c === 'código' || c === 'codigo' || c === 'razão social' || c === 'razao social' || c === 'razão soc' || c === 'razao soc')) {
        headerIndex = i;
        cols.forEach((name, idx) => {
          if (name) colMap[name] = idx;
        });
        break;
      }
    }

    console.log("Header index:", headerIndex);
    console.log("ColMap keys:", Object.keys(colMap));

    if (headerIndex === -1) {
        console.error("Could not find header!");
        return;
    }

    const getVal = (cols, possibleNames) => {
      for (const name of possibleNames) {
        const idx = colMap[name.toLowerCase()];
        if (idx !== undefined && cols[idx] !== undefined) {
          return cols[idx].trim().replace(/^"|"$/g, '').trim();
        }
      }
      return '';
    };

    const records = [];
    let count = 0;
    for (const line of lines.slice(headerIndex + 1)) {
        const cols = parseCSVLine(line, delimiter);
        if (cols.length < 3) continue;

        const rawId = getVal(cols, ['código', 'codigo', 'id', 'cod']);
        if (!rawId || rawId.toLowerCase().includes('total') || rawId.toLowerCase() === 'código') {
            continue;
        }

        const name = cleanClientName(getVal(cols, ['razão social / nome', 'razao social / nome', 'razão social', 'razao social', 'razão soc', 'razao soc', 'nome', 'social']));
        const fantasia = cleanClientName(getVal(cols, ['nome fantasia', 'fantasia', 'nome far', 'nome fan']));
        const finalSocialName = name || fantasia || 'NOME NAO INFORMADO';

        const daysSincePurchase = parseInt(getVal(cols, ['dias', 'dias sem comprar', 'dias sem compra', 'dias atraso']).replace(/\D/g, '') || '0', 10);

        records.push({
            id: rawId,
            socialName: finalSocialName,
            daysSincePurchase: daysSincePurchase
        });

        count++;
        if (count <= 3) {
            console.log(`Sample mapped row ${count}:`, {
                id: rawId,
                socialName: finalSocialName,
                daysSincePurchase: daysSincePurchase
            });
        }
    }

    console.log("Total valid records parsed:", records.length);

    if (records.length > 0) {
        console.log("Testing upload of first 200 records...");
        const chunk = records.slice(0, 5).map(c => ({
            'Código': String(c.id),
            'Razão Social / Nome': c.socialName,
            'daysSincePurchase': c.daysSincePurchase
        }));
        
        const ids = chunk.map(c => c['Código']);
        console.log("Deleting ids:", ids);
        const { error: delError } = await supabase.from('base_oficial_millenium').delete().in('Código', ids);
        console.log("Delete error:", delError);

        console.log("Inserting chunk...");
        const { error: insError } = await supabase.from('base_oficial_millenium').insert(chunk);
        console.log("Insert error:", insError);
    }
}

testImport();
