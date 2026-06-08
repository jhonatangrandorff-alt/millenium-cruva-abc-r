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
    
    const sample = lines.slice(0, 10).join('\n');
    const semicolonCount = (sample.match(/;/g) || []).length;
    const commaCount = (sample.match(/,/g) || []).length;
    const tabCount = (sample.match(/\t/g) || []).length;

    let delimiter = ';';
    if (tabCount > semicolonCount && tabCount > commaCount) delimiter = '\t';
    else if (commaCount > semicolonCount) delimiter = ',';

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
            'Código': String(rawId),
            'Razão Social / Nome': finalSocialName,
            'Nome Fantasia': fantasia || name || '',
            'cnpj': getVal(cols, ['cnpj']),
            'ie': getVal(cols, ['i. e.', 'ie']),
            'city': getVal(cols, ['cidade']),
            'state': getVal(cols, ['uf', 'estado']),
            'address': getVal(cols, ['endereço (logradouro)', 'endereco', 'logradouro']),
            'neighborhood': getVal(cols, ['bairro']),
            'cep': getVal(cols, ['cep']),
            'activity': getVal(cols, ['ramo de atividade', 'ramo']),
            'group': getVal(cols, ['grupo']),
            'daysSincePurchase': daysSincePurchase,
            'representativeName': getVal(cols, ['representante padrão']),
            'rep3': getVal(cols, ['rep 3', 'rep3']),
            'supervisor': getVal(cols, ['claudio gerente', 'supervisor']) || 'GERAL',
            'population': parseInt(getVal(cols, ['habitantes']).replace(/\D/g, '') || '0', 10),
            'status': 'Ativo'
        });
    }

    console.log("Total records parsed:", records.length);

    // Test upload in batches
    const BATCH_SIZE = 200;
    const testLimit = 1000; // Let's test the first 5 batches (1000 records)
    for (let i = 0; i < testLimit; i += BATCH_SIZE) {
        const chunk = records.slice(i, i + BATCH_SIZE);
        const ids = chunk.map(c => c['Código']);
        
        console.log(`Uploading batch ${i / BATCH_SIZE + 1}...`);
        const { error: delError } = await supabase.from('base_oficial_millenium').delete().in('Código', ids);
        if (delError) console.error("Delete Error:", delError);

        const { error: insError } = await supabase.from('base_oficial_millenium').insert(chunk);
        if (insError) {
            console.error("CRITICAL INSERT ERROR:", insError);
            return;
        }
    }
    console.log("All test batches uploaded successfully!");
}

testImport();
