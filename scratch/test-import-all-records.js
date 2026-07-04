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
        const finalFantasyName = fantasia || name || 'NOME NAO INFORMADO';

        const rawStatus = getVal(cols, ['situação do cliente', 'situacao do cliente', 'situação c', 'situacao c', 'situação', 'status', 'situacao']);
        let status = 'Ativo';
        if (rawStatus.toLowerCase().includes('semi')) status = 'Semi-Ativo';
        else if (rawStatus.toLowerCase().includes('inativo')) status = 'Inativo';

        const standardRep = getVal(cols, ['rep 3', 'rep3', 'representante padrão - copiar', 'representante padrão', 'representante', 'rep', 'vendedor']) || 'Indefinido';

        const parseDate = (d) => {
          if (!d) return null;
          const cleanD = d.trim().split(' ')[0];
          const parts = cleanD.split('/');
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            return `${year}-${month}-${day}`;
          }
          return null;
        };

        const logradouro = getVal(cols, ['endereço (logradouro)', 'endereco', 'logradouro', 'rua', 'endereco (logradouro)']);
        const numero = getVal(cols, ['número', 'numero', 'nº']);

        const lastPurchaseDateStr = parseDate(getVal(cols, ['ult. compra', 'ultima compra', 'dt ult. compra']));

        let daysSincePurchase = parseInt(getVal(cols, ['dias', 'dias sem comprar', 'dias sem compra', 'dias atraso']).replace(/\D/g, '') || '0', 10);

        records.push({
            'Código': String(rawId),
            'Razão Social / Nome': finalSocialName,
            'Nome Fantasia': finalFantasyName,
            'cnpj': getVal(cols, ['cnpj']),
            'ie': getVal(cols, ['i. e.', 'ie']),
            'city': getVal(cols, ['cidade']),
            'state': getVal(cols, ['uf', 'estado']),
            'address': numero ? `${logradouro}, ${numero}` : logradouro,
            'neighborhood': getVal(cols, ['bairro']),
            'cep': getVal(cols, ['cep']),
            'activity': getVal(cols, ['ramo de atividade', 'ramo']),
            'group': getVal(cols, ['grupo']),
            'lastPurchaseDate': lastPurchaseDateStr,
            'daysSincePurchase': daysSincePurchase,
            'registerDate': parseDate(getVal(cols, ['cadastro', 'dt. cadastro'])),
            'representativeName': standardRep,
            'rep3': getVal(cols, ['rep 3', 'rep3']) || standardRep,
            'supervisor': getVal(cols, ['supervisor', 'claudio gerente']) || 'GERAL',
            'population': parseInt(getVal(cols, ['habitantes']).replace(/\D/g, '') || '0', 10),
            'status': status
        });
    }

    console.log("Total valid records parsed:", records.length);

    // Let's run save clients batch loop
    const BATCH_SIZE = 200;
    const CONCURRENCY = 3;
    const chunks = [];
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        chunks.push(records.slice(i, i + BATCH_SIZE));
    }

    console.log(`Starting upload of ${chunks.length} chunks...`);
    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
        const batch = chunks.slice(i, i + CONCURRENCY);
        console.log(`Uploading chunks ${i} to ${i + batch.length - 1}...`);
        try {
            await Promise.all(batch.map(async (chunk, batchIdx) => {
              const ids = chunk.map(c => c['Código']);
              const { error: delError } = await supabase.from('base_oficial_millenium').delete().in('Código', ids);
              if (delError) console.warn(`Warning on delete batch ${i + batchIdx}:`, delError.message);
              
              const { error: insError } = await supabase.from('base_oficial_millenium').insert(chunk);
              if (insError) {
                  console.error(`ERROR on insert batch ${i + batchIdx}:`, JSON.stringify(insError, null, 2));
                  throw insError;
              }
            }));
        } catch (err) {
            console.error("Critical error in concurrent batch execution:", err);
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log("Upload script finished.");
}

testImport();
