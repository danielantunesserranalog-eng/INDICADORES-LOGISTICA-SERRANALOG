// ==========================================
// js/configuracoes/importacao.js
// ==========================================

async function processAndSaveJornadasFile(file) {
    const errorMsgDiv = document.getElementById('errorMsgJornadas');
    const loadingSpinner = document.getElementById('loadingSpinnerJornadas');
    if (errorMsgDiv) errorMsgDiv.classList.add('hidden'); 
    if (loadingSpinner) { loadingSpinner.classList.remove('hidden'); loadingSpinner.classList.add('flex'); }

    try {
        const text = await file.text();
        const workbook = XLSX.read(text, { type: 'string', raw: true, FS: ';' }); 
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!rawData || rawData.length === 0) throw new Error("Planilha vazia ou em formato incorreto.");

        const safeParseTime = (val) => {
            if (val === null || val === undefined || val === '-' || String(val).trim() === '') return 0;
            if (typeof val === 'number') return val < 24 ? val * 24 : val;
            const str = String(val).trim();
            if (str.includes(':')) {
                const parts = str.split(':');
                return parseInt(parts[0] || 0, 10) + (parseInt(parts[1] || 0, 10) / 60);
            }
            return parseFloat(str.replace(',', '.')) || 0;
        };

        const regexDateCheck = /(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{1,2}-\d{1,2})/;

        const mappedData = rawData.map(row => {
            const getVal = (possibleNames) => {
                for (let k of Object.keys(row)) {
                    const normK = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                    if (possibleNames.includes(normK)) return row[k];
                }
                return null;
            };

            const motorista = getVal(['pessoa', 'motorista', 'nome']);
            if (!motorista || String(motorista).trim() === '-' || String(motorista).trim() === '') return null;
            
            const valTrabalho = getVal(['total de trabalho', 'total trabalho', 'tempo de trabalho']);
            const totalHoras = safeParseTime(valTrabalho);
            
            const colDataExtra = getVal(['data', 'data da jornada', 'data inicial', 'data do movimento']);
            let strInicio = String(getVal(['início', 'inicio']) || '').trim();
            let strFim = String(getVal(['fim', 'final']) || '').trim();

            if (colDataExtra) {
                const dataLimpa = String(colDataExtra).trim();
                if (strInicio && !strInicio.match(regexDateCheck)) strInicio = `${dataLimpa} ${strInicio}`;
                if (strFim && !strFim.match(regexDateCheck)) strFim = `${dataLimpa} ${strFim}`;
            }

            return {
                motorista: String(motorista).trim(),
                cpf: getVal(['cpf']) || '',
                placa: getVal(['placa', 'placa do cavalo', 'veiculo', 'veículo']) || '',
                inicio: strInicio,
                fim: strFim,
                total_trabalho_horas: totalHoras,
                refeicao_horas: safeParseTime(getVal(['refeição', 'refeicao'])),
                repouso_horas: safeParseTime(getVal(['repouso'])),
                direcao_horas: safeParseTime(getVal(['direção', 'direcao'])),
                estourou_jornada: totalHoras > 12,
                horas_noturnas: safeParseTime(getVal(['noturnas', 'noturna', 'horas noturnas'])),
                horas_extras: safeParseTime(getVal(['extra normal', 'extranormal'])) + safeParseTime(getVal(['extra excedente', 'extraexcedente']))
            };
        }).filter(item => {
            if (item === null || item.motorista === '' || item.total_trabalho_horas < 8) return false;
            if (MOTORISTAS_EXCLUIDOS.includes(item.motorista.toUpperCase())) return false;
            return true;
        });

        if(mappedData.length === 0) throw new Error("Nenhuma jornada válida foi encontrada.");

        let existingJornadas = [];
        let startJor = 0; const stepJor = 1000;
        while (true) {
            const { data, error: selErr } = await supabaseClient.from('historico_jornadas').select('motorista, inicio, fim').range(startJor, startJor + stepJor - 1);
            if (selErr) throw selErr;
            if (!data || data.length === 0) break;
            existingJornadas.push(...data);
            if (data.length < stepJor) break;
            startJor += stepJor;
        }

        const chavesExistentes = new Set(existingJornadas.map(j => `${j.motorista}|${j.inicio}|${j.fim}`));
        let duplicadasIgnoradas = 0;
        const jornadasNovas = mappedData.filter(item => {
            const chaveUnica = `${item.motorista}|${item.inicio}|${item.fim}`;
            if (chavesExistentes.has(chaveUnica)) { duplicadasIgnoradas++; return false; } 
            else { chavesExistentes.add(chaveUnica); return true; }
        });

        if (jornadasNovas.length === 0) throw new Error(`Todas as jornadas já existem. (${duplicadasIgnoradas} duplicadas ignoradas).`);

        const { error: insErr } = await supabaseClient.from('historico_jornadas').insert(jornadasNovas);
        if (insErr) throw insErr;

        await supabaseClient.from('historico_importacoes').insert([{
            "dataBase": `Jornadas Ponto`,
            "qtdViagens": jornadasNovas.length,
            "dataLancamento": new Date().toLocaleString('pt-PT')
        }]);
        
        alert(`Sucesso! Salvas ${jornadasNovas.length} NOVAS jornadas.`);
        carregarHistoricoImportacoes(); 
        
    } catch (err) {
        if(errorMsgDiv) { errorMsgDiv.innerText = "Erro: " + err.message; errorMsgDiv.classList.remove('hidden'); } 
        else alert("Erro: " + err.message);
    } finally {
        if(loadingSpinner) { loadingSpinner.classList.add('hidden'); loadingSpinner.classList.remove('flex'); }
    }
}

function parseSheetToData(sheet) {
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (!rawData || rawData.length === 0) throw new Error("Planilha vazia.");

    const normKeys = Object.keys(rawData[0]).map(k => ({ orig: k, norm: normalizeStr(k) }));
    function findKey(possibilities) {
        for (let p of possibilities) { const normP = normalizeStr(p); let found = normKeys.find(k => k.norm === normP || k.norm.includes(normP)); if (found) return found.orig; }
        return null;
    }

    const movimentoKey = findKey(['movimento', 'id_movimento']);
    const transpKey = findKey(['transportadora', 'nome da transportadora']);
    const placaKey = findKey(['placa do cavalo', 'placa cavalo', 'placa']);
    const pesoLiqKey = findKey(['Peso na Entrada', 'peso na entrada']);
    const volumeKey = findKey(['volume real', 'volume_real']);
    const gruaKey = findKey(['carregador florestal', 'carregador', 'grua']); 
    const dtSaidaBaseKey = findKey(['data de saída', 'data saída', 'data saída fábrica']);
    const hrSaidaFabKey = findKey(['hora saída fábrica', 'hora saída', 'hora saida']);

    const mappedData = rawData.map((row, idx) => {
        const getValue = (key) => (key && row[key] !== undefined && row[key] !== "") ? row[key] : null;
        
        const rawDtSaida = getValue(dtSaidaBaseKey);
        const rawHrSaida = getValue(hrSaidaFabKey);
        let strDataBase = 'Desconhecida';

        if (rawDtSaida) {
            const parsed = parseDateTime(rawDtSaida, rawHrSaida);
            if (parsed) strDataBase = parsed.toLocaleDateString('pt-PT');
        }

        return {
            movimento: String(getValue(movimentoKey) || `MOV-GEN-${Date.now()}-${idx}`),
            dataDaBaseExcel: strDataBase,
            dataLancamento: new Date().toLocaleDateString('pt-PT'),
            transportadora: String(getValue(transpKey) || "Outras").trim(),
            placa: String(getValue(placaKey) || "-").trim(),
            pesoLiquido: parsePtBrNumber(getValue(pesoLiqKey)),
            volumeReal: parsePtBrNumber(getValue(volumeKey)),
            grua: String(getValue(gruaKey) || "-").trim(),
            distanciaAsfalto: parsePtBrNumber(getValue(findKey(['distancia por asfalto', 'distância por asfalto', 'distancia asfalto']))),
            distanciaTerra: parsePtBrNumber(getValue(findKey(['distancia por terra', 'distância por terra', 'distancia terra']))),
            cicloHoras: calcHoursDiff(getValue(findKey(['data de entrada'])), getValue(findKey(['hora de entrada'])), rawDtSaida, rawHrSaida, true),
            filaCampoHoras: calcHoursDiff(getValue(findKey(['data chegada campo'])), getValue(findKey(['hora chegada campo'])), getValue(findKey(['dt início carreg cpo'])), getValue(findKey(['hr início carreg cpo'])), false),
            tempoCarregamentoHoras: calcHoursDiff(getValue(findKey(['dt início carreg cpo'])), getValue(findKey(['hr início carreg cpo'])), getValue(findKey(['dt final carreg cpo'])), getValue(findKey(['hr final carreg cpo'])), false),
            filaFabricaHoras: calcHoursDiff(getValue(findKey(['data de entrada'])), getValue(findKey(['hora de entrada'])), getValue(findKey(['dt início descar fáb'])), getValue(findKey(['hr início descar fáb'])), false),
        };
    });
    return mappedData.filter(item => item.pesoLiquido > 0 || item.volumeReal > 0);
}

async function processAndSaveFile(file) {
    const errorMsgDiv = document.getElementById('errorMsg');
    const loadingSpinner = document.getElementById('loadingSpinner');
    if(errorMsgDiv) errorMsgDiv.classList.add('hidden');
    if(loadingSpinner) { loadingSpinner.classList.remove('hidden'); loadingSpinner.classList.add('flex'); }

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const newRows = parseSheetToData(workbook.Sheets[workbook.SheetNames[0]]);
        if (!newRows || newRows.length === 0) throw new Error("Planilha vazia ou sem dados válidos.");

        let existingIds = [];
        let startVia = 0; const stepVia = 1000;
        while (true) {
            const { data: dbData, error: selErr } = await supabaseClient.from('historico_viagens').select('movimento').range(startVia, startVia + stepVia - 1);
            if (selErr) throw selErr;
            if (!dbData || dbData.length === 0) break;
            existingIds.push(...dbData);
            if (dbData.length < stepVia) break;
            startVia += stepVia;
        }
        
        const existingSet = new Set(existingIds.map(e => e.movimento));
        let duplicadasIgnoradas = 0;
        const viagensNovasArray = newRows.filter(item => {
            if (existingSet.has(item.movimento)) { duplicadasIgnoradas++; return false; } 
            else { existingSet.add(item.movimento); return true; }
        });

        if (viagensNovasArray.length === 0) throw new Error(`Todas as viagens já existem. (${duplicadasIgnoradas} ignoradas).`);

        const datasEncontradas = [...new Set(viagensNovasArray.map(r => r.dataDaBaseExcel).filter(d => d && d !== 'Desconhecida'))];
        let strHistoricoDatas = 'Desconhecida';
        
        if (datasEncontradas.length > 0) {
            datasEncontradas.sort((a, b) => {
                const pA = a.split('/'); const pB = b.split('/');
                let anoA = parseInt(pA[2]); if(anoA < 100) anoA += 2000;
                let anoB = parseInt(pB[2]); if(anoB < 100) anoB += 2000;
                return new Date(anoA, parseInt(pA[1])-1, parseInt(pA[0])) - new Date(anoB, parseInt(pB[1])-1, parseInt(pB[0]));
            });
            strHistoricoDatas = datasEncontradas.length === 1 ? datasEncontradas[0] : 
                                `${datasEncontradas[0]} a ${datasEncontradas[datasEncontradas.length - 1]}`;
        }

        const { error: insErr } = await supabaseClient.from('historico_viagens').insert(viagensNovasArray);
        if (insErr) throw insErr;

        await supabaseClient.from('historico_importacoes').insert([{ "dataBase": `Viagens: ${strHistoricoDatas}`, "qtdViagens": viagensNovasArray.length, "dataLancamento": new Date().toLocaleString('pt-PT') }]);
        
        alert(`Sucesso! Salvas ${viagensNovasArray.length} NOVAS viagens.\nDatas: ${strHistoricoDatas}`);
        carregarHistoricoImportacoes(); 
        
    } catch (err) {
        if(errorMsgDiv) { errorMsgDiv.innerText = "Erro: " + err.message; errorMsgDiv.classList.remove('hidden'); } else alert("Erro: " + err.message);
    } finally {
        if(loadingSpinner) { loadingSpinner.classList.add('hidden'); loadingSpinner.classList.remove('flex'); }
    }
}

function initImportacao() {
    // Viagens
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    if(dropZone && fileInput){
        dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('bg-sky-900/20'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('bg-sky-900/20'));
        dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('bg-sky-900/20'); if (e.dataTransfer.files.length > 0) processAndSaveFile(e.dataTransfer.files[0]); });
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', e => { if(e.target.files.length) processAndSaveFile(e.target.files[0]); });
    }

    // Jornadas
    const dropZoneJornadas = document.getElementById('dropZoneJornadas');
    const fileInputJornadas = document.getElementById('fileInputJornadas');
    if(dropZoneJornadas && fileInputJornadas){
        dropZoneJornadas.addEventListener('dragover', e => { e.preventDefault(); dropZoneJornadas.classList.add('bg-amber-900/20'); });
        dropZoneJornadas.addEventListener('dragleave', () => dropZoneJornadas.classList.remove('bg-amber-900/20'));
        dropZoneJornadas.addEventListener('drop', e => { e.preventDefault(); dropZoneJornadas.classList.remove('bg-amber-900/20'); if (e.dataTransfer.files.length > 0) processAndSaveJornadasFile(e.dataTransfer.files[0]); });
        dropZoneJornadas.addEventListener('click', () => fileInputJornadas.click());
        fileInputJornadas.addEventListener('change', e => { if(e.target.files.length) processAndSaveJornadasFile(e.target.files[0]); });
    }
}