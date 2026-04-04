// ==========================================
// js/configuracoes.js - IMPORTAÇÃO E METAS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    carregarMetasGlobais();
    carregarHistoricoImportacoes(); // Carrega a tabela assim que abre a página
});

// ==========================================
// LÓGICA DE METAS GLOBAIS
// ==========================================
async function carregarMetasGlobais() {
    try {
        const { data } = await supabaseClient.from('metas_globais').select('*').eq('id', 1).single();
        if (data) {
            const elVProg = document.getElementById('cfg_v_prog');
            const elVolProg = document.getElementById('cfg_vol_prog');
            const elCxProg = document.getElementById('cfg_cx_prog');
            const elPbtcProg = document.getElementById('cfg_pbtc');

            if (elVProg) elVProg.value = data.v_prog || '';
            if (elVolProg) elVolProg.value = data.vol_prog || '';
            if (elCxProg) elCxProg.value = data.cx_prog || '';
            if (elPbtcProg) elPbtcProg.value = data.pbtc_prog || '';
        }
    } catch(e) {}
}

const btnSalvarMetasGlobais = document.getElementById('btnSalvarMetasGlobais');
if (btnSalvarMetasGlobais) {
    btnSalvarMetasGlobais.addEventListener('click', async () => {
        btnSalvarMetasGlobais.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        const payload = {
            id: 1,
            v_prog: parseFloat(document.getElementById('cfg_v_prog').value) || 0,
            vol_prog: parseFloat(document.getElementById('cfg_vol_prog').value) || 0,
            cx_prog: parseFloat(document.getElementById('cfg_cx_prog').value) || 0,
            pbtc_prog: parseFloat(document.getElementById('cfg_pbtc').value) || 0
        };
        try {
            await supabaseClient.from('metas_globais').upsert(payload);
            btnSalvarMetasGlobais.innerHTML = '<i class="fas fa-check"></i> Salvo!';
        } catch(e) { btnSalvarMetasGlobais.innerHTML = 'Erro!'; }
        setTimeout(() => btnSalvarMetasGlobais.innerHTML = '<i class="fas fa-save"></i> Salvar Metas Base', 2000);
    });
}

// ==========================================
// LÓGICA DA TABELA DE HISTÓRICO DE IMPORTAÇÕES
// ==========================================
document.getElementById('btnAtualizarHistorico').addEventListener('click', () => {
    carregarHistoricoImportacoes();
});

async function carregarHistoricoImportacoes() {
    const tb = document.getElementById('importHistoryBody');
    if (!tb) return;
    
    tb.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-slate-500"><i class="fas fa-spinner fa-spin mr-2"></i> Atualizando...</td></tr>';
    
    try {
        const { data, error } = await supabaseClient
            .from('historico_importacoes')
            .select('*')
            .order('id', { ascending: false })
            .limit(10); // Mostra só as últimas 10

        if (error) throw error;

        tb.innerHTML = '';
        if (!data || data.length === 0) {
            tb.innerHTML = '<tr><td colspan="3" class="text-center py-6 text-slate-500">Nenhum histórico de importação encontrado.</td></tr>';
            return;
        }

        data.forEach(d => {
            let icone = '<i class="fas fa-database text-slate-500"></i>';
            if (d.dataBase.toUpperCase().includes('JORNADA')) icone = '<i class="fas fa-user-clock text-amber-500"></i>';
            if (d.dataBase.toUpperCase().includes('VIAGEN')) icone = '<i class="fas fa-truck text-sky-500"></i>';

            tb.insertAdjacentHTML('beforeend', `
                <tr class="hover:bg-slate-800/30 transition-colors">
                    <td class="px-6 py-3 font-mono text-slate-400">${d.dataLancamento}</td>
                    <td class="px-6 py-3 font-semibold text-slate-200">${icone} <span class="ml-2">${d.dataBase}</span></td>
                    <td class="px-6 py-3 text-center font-bold text-emerald-400">+ ${d.qtdViagens}</td>
                </tr>
            `);
        });
    } catch (e) {
        tb.innerHTML = '<tr><td colspan="3" class="text-center py-6 text-rose-500">Erro ao carregar histórico.</td></tr>';
    }
}

// ==========================================
// ZONA DE RISCO (EXCLUSÃO SELETIVA)
// ==========================================
const btnLimparBanco = document.getElementById('btnLimparBanco');
if (btnLimparBanco) {
    btnLimparBanco.addEventListener('click', async () => {
        const elTipoExclusao = document.getElementById('tipoExclusao');
        if (!elTipoExclusao) return;
        
        const tipo = elTipoExclusao.value;
        let mensagemConfirmacao = "";

        if (tipo === 'tudo') {
            mensagemConfirmacao = "ALERTA MÁXIMO: Você está prestes a apagar TODOS os dados (Viagens e Jornadas). Deseja continuar?";
        } else if (tipo === 'viagens') {
            mensagemConfirmacao = "ATENÇÃO: Deseja apagar APENAS o banco de Produção (Viagens Excel)? As jornadas serão mantidas.";
        } else if (tipo === 'jornadas') {
            mensagemConfirmacao = "ATENÇÃO: Deseja apagar APENAS o banco de Jornadas (CSV)? O histórico de viagens será mantido.";
        } else if (tipo === 'eventos') {
            mensagemConfirmacao = "ATENÇÃO: Deseja apagar APENAS o banco de Eventos?";
        }

        if(confirm(mensagemConfirmacao)) {
            const conteudoOriginal = btnLimparBanco.innerHTML;
            
            try {
                btnLimparBanco.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Apagando...';
                btnLimparBanco.disabled = true;
                btnLimparBanco.classList.add('opacity-50', 'cursor-not-allowed');

                if (tipo === 'tudo' || tipo === 'viagens') {
                    await supabaseClient.from('historico_viagens').delete().gt('id', 0); // CORRIGIDO PARA .gt('id', 0)
                }
                
                if (tipo === 'tudo' || tipo === 'jornadas') {
                    await supabaseClient.from('historico_jornadas').delete().gt('id', 0);
                }

                if (tipo === 'tudo' || tipo === 'eventos') {
                    await supabaseClient.from('historico_eventos').delete().gt('id', 0);
                }
                
                await supabaseClient.from('historico_importacoes').insert([{
                    "dataBase": `[DADOS APAGADOS] - Módulo: ${tipo.toUpperCase()}`,
                    "qtdViagens": 0,
                    "dataLancamento": new Date().toLocaleString('pt-PT')
                }]);

                alert("Operação concluída. Os dados selecionados foram apagados da nuvem.");
                carregarHistoricoImportacoes(); 
                
            } catch (error) {
                console.error("Erro ao limpar banco:", error);
                alert("Ocorreu um erro ao tentar apagar os dados.");
            } finally {
                btnLimparBanco.innerHTML = conteudoOriginal;
                btnLimparBanco.disabled = false;
                btnLimparBanco.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    });
}

// ==========================================
// IMPORTAÇÃO DE JORNADAS (CSV) - COM FILTRO ANTI-DUPLICAÇÃO
// ==========================================
async function processAndSaveJornadasFile(file) {
    const errorMsgDiv = document.getElementById('errorMsgJornadas');
    const loadingSpinner = document.getElementById('loadingSpinnerJornadas');
    if (errorMsgDiv) errorMsgDiv.classList.add('hidden'); 
    if (loadingSpinner) { loadingSpinner.classList.remove('hidden'); loadingSpinner.classList.add('flex'); }

    try {
        const text = await file.text();
        const workbook = XLSX.read(text, { type: 'string', raw: true, FS: ';' }); // CORRIGIDO FS: ';'
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
            
            const horasNoturnas = safeParseTime(getVal(['noturnas', 'noturna', 'horas noturnas']));
            const extraNormal = safeParseTime(getVal(['extra normal', 'extranormal', 'hora extra normal']));
            const extraExcedente = safeParseTime(getVal(['extra excedente', 'extraexcedente', 'hora extra excedente']));
            const horasExtrasTotal = extraNormal + extraExcedente;
            
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
                horas_noturnas: horasNoturnas,
                horas_extras: horasExtrasTotal
            };
        }).filter(item => item !== null && item.motorista !== '' && item.total_trabalho_horas >= 8);

        if(mappedData.length === 0) throw new Error("Nenhuma jornada válida (>= 8h) foi encontrada. Verifique os horários no CSV.");

        // CORRIGIDO O LIMITE DO SUPABASE AQUI (limit(100000))
        const { data: existingJornadas, error: selErr } = await supabaseClient.from('historico_jornadas').select('motorista, inicio').limit(100000);
        if (selErr) throw selErr;

        const chavesExistentes = new Set(existingJornadas ? existingJornadas.map(j => `${j.motorista}|${j.inicio}`) : []);

        let duplicadasIgnoradas = 0;
        const jornadasNovas = mappedData.filter(item => {
            const chaveUnica = `${item.motorista}|${item.inicio}`;
            if (chavesExistentes.has(chaveUnica)) { duplicadasIgnoradas++; return false; } 
            else { chavesExistentes.add(chaveUnica); return true; }
        });

        if (jornadasNovas.length === 0) throw new Error(`Todas as ${mappedData.length} jornadas da planilha já existem no banco de dados.`);

        const { error: insErr } = await supabaseClient.from('historico_jornadas').insert(jornadasNovas);
        if (insErr) throw insErr;

        const regexPegaData = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{1,2}-\d{1,2})/;
        const datasEncontradas = [...new Set(jornadasNovas.map(r => {
            const m = r.inicio.match(regexPegaData);
            return m ? m[0] : null;
        }).filter(Boolean))];

        let strDatasFormatadas = 'Período Indefinido';
        if (datasEncontradas.length > 0) {
            strDatasFormatadas = datasEncontradas.length === 1 ? datasEncontradas[0] : 
                                 datasEncontradas.length <= 3 ? datasEncontradas.join(', ') : 
                                 `${datasEncontradas[0]} a ${datasEncontradas[datasEncontradas.length - 1]}`;
        }

        await supabaseClient.from('historico_importacoes').insert([{
            "dataBase": `Jornadas: ${strDatasFormatadas}`,
            "qtdViagens": jornadasNovas.length,
            "dataLancamento": new Date().toLocaleString('pt-PT')
        }]);
        
        let msgSucesso = `Sucesso! Foram salvas ${jornadasNovas.length} NOVAS jornadas.\nDatas: ${strDatasFormatadas}`;
        if (duplicadasIgnoradas > 0) msgSucesso += `\n\n(${duplicadasIgnoradas} jornadas foram ignoradas pois já existiam no sistema).`;
        
        alert(msgSucesso);
        carregarHistoricoImportacoes(); 
        
    } catch (err) {
        if(errorMsgDiv) { errorMsgDiv.innerText = "Erro: " + err.message; errorMsgDiv.classList.remove('hidden'); } 
        else alert("Erro: " + err.message);
    } finally {
        if(loadingSpinner) { loadingSpinner.classList.add('hidden'); loadingSpinner.classList.remove('flex'); }
    }
}

const dropZoneJornadas = document.getElementById('dropZoneJornadas');
const fileInputJornadas = document.getElementById('fileInputJornadas');
const selectFileBtnJornadas = document.getElementById('selectFileBtnJornadas');

if(dropZoneJornadas && fileInputJornadas){
    dropZoneJornadas.addEventListener('dragover', e => { e.preventDefault(); dropZoneJornadas.classList.add('bg-amber-900/20', 'border-amber-500'); });
    dropZoneJornadas.addEventListener('dragleave', () => dropZoneJornadas.classList.remove('bg-amber-900/20', 'border-amber-500'));
    dropZoneJornadas.addEventListener('drop', e => {
        e.preventDefault(); dropZoneJornadas.classList.remove('bg-amber-900/20', 'border-amber-500');
        if (e.dataTransfer.files.length > 0) processAndSaveJornadasFile(e.dataTransfer.files[0]);
    });
    
    if (selectFileBtnJornadas) selectFileBtnJornadas.addEventListener('click', () => fileInputJornadas.click());
    else dropZoneJornadas.addEventListener('click', () => fileInputJornadas.click());
    
    fileInputJornadas.addEventListener('change', e => { if(e.target.files.length) processAndSaveJornadasFile(e.target.files[0]); });
}

// ==========================================
// IMPORTAÇÃO DE VIAGENS (PRODUÇÃO EXCEL) - COM FILTRO ANTI-DUPLICAÇÃO
// ==========================================
function parseSheetToData(sheet) {
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (!rawData || rawData.length === 0) throw new Error("Planilha vazia ou em formato incorreto.");

    const keys = Object.keys(rawData[0]);
    const normKeys = keys.map(k => ({ orig: k, norm: normalizeStr(k) }));

    function findKey(possibilities) {
        for (let p of possibilities) {
            const normP = normalizeStr(p);
            let found = normKeys.find(k => k.norm === normP || k.norm.includes(normP));
            if (found) return found.orig;
        }
        return null;
    }

    const movimentoKey = findKey(['movimento', 'id_movimento']);
    const transpKey = findKey(['transportadora', 'nome da transportadora']);
    const placaKey = findKey(['placa do cavalo', 'placa cavalo', 'placa']);
    const pesoLiqKey = findKey(['peso líquido', 'peso liquido']);
    const volumeKey = findKey(['volume real', 'volume_real']);
    const distAsfaltoKey = findKey(['distancia por asfalto', 'distância por asfalto', 'distancia asfalto']);
    const distTerraKey = findKey(['distancia por terra', 'distância por terra', 'distancia terra']);
    const dtChegadaCampoKey = findKey(['data chegada campo']);
    const dtInicioCarregCpoKey = findKey(['dt início carreg cpo', 'dt inicio carreg cpo']);
    const hrChegadaCampoKey = findKey(['hora chegada campo', 'hr chegada campo']);
    const hrInicioCarregCpoKey = findKey(['hr início carreg cpo', 'hr inicio carreg cpo']);
    const dtFinalCarregCpoKey = findKey(['dt final carreg cpo', 'data final carreg cpo', 'data fim carreg cpo']);
    const hrFinalCarregCpoKey = findKey(['hr final carreg cpo', 'hora final carreg cpo', 'hr fim carreg cpo', 'hora fim carreg cpo']);
    const dtEntradaKey = findKey(['data de entrada', 'data entrada', 'data chegada']);
    const hrEntradaKey = findKey(['hora de entrada', 'hora entrada', 'hr entrada']);
    const dtInicioDescarFabKey = findKey(['dt início descar fáb', 'dt inicio descar fab', 'data fim']);
    const hrInicioDescarFabKey = findKey(['hr início descar fáb', 'hr inicio descar fab', 'hora fim']);
    const dtSaidaBaseKey = findKey(['data de saída', 'data saída', 'data saída fábrica']);
    const hrSaidaFabKey = findKey(['hora saída fábrica', 'hora saída', 'hora saida']);
    const cicloProntoKey = findKey(['ciclo', 'tempo de ciclo', 'ciclo horas', 'horas ciclo', 'tempo ciclo']);

    const today = new Date().toLocaleDateString('pt-PT');

    const mappedData = rawData.map((row, idx) => {
        const getValue = (key) => (key && row[key] !== undefined && row[key] !== "") ? row[key] : null;

        const movimento = getValue(movimentoKey) || `MOV-GEN-${Date.now()}-${idx}`;
        let transportadora = String(getValue(transpKey) || "Não identificada").trim().replace(/\s+(LTDA|Ltda|LTDA\.|S\.A\.|EIRELI)$/i, '').trim();
        if(!transportadora || transportadora === "-") transportadora = "Outras";

        const rawDtSaida = getValue(dtSaidaBaseKey);
        const rawHrSaida = getValue(hrSaidaFabKey);
        
        let strDataBase = 'Desconhecida';
        let timestampSaida = 0;

        if (rawDtSaida) {
            const parsed = parseDateTime(rawDtSaida, rawHrSaida);
            if (parsed) {
                strDataBase = parsed.toLocaleDateString('pt-PT');
                timestampSaida = parsed.getTime();
            }
        }

        let ciclo = null;
        if (cicloProntoKey && row[cicloProntoKey] !== undefined && row[cicloProntoKey] !== "") {
            let rawCiclo = row[cicloProntoKey];
            if (typeof rawCiclo === 'number') { ciclo = rawCiclo * 24; } 
            else if (typeof rawCiclo === 'string') {
                let parts = rawCiclo.trim().split(':');
                if(parts.length >= 2) ciclo = parseInt(parts[0], 10) + (parseInt(parts[1], 10) / 60);
                else ciclo = parseFloat(rawCiclo.replace(',', '.'));
            }
        }
        
        if ((ciclo === null || isNaN(ciclo) || ciclo <= 0) && getValue(hrInicioDescarFabKey)) {
             ciclo = calcHoursDiff(rawDtSaida, rawHrSaida, getValue(dtInicioDescarFabKey), getValue(hrInicioDescarFabKey), true);
        }

        return {
            movimento: String(movimento),
            dataLancamento: today,
            dataDaBaseExcel: strDataBase,
            transportadora: transportadora,
            placa: String(getValue(placaKey) || "-").trim(),
            pesoLiquido: parsePtBrNumber(getValue(pesoLiqKey)),
            volumeReal: parsePtBrNumber(getValue(volumeKey)),
            distanciaAsfalto: parsePtBrNumber(getValue(distAsfaltoKey)),
            distanciaTerra: parsePtBrNumber(getValue(distTerraKey)),
            cicloHoras: ciclo,
            filaCampoHoras: calcHoursDiff(getValue(dtChegadaCampoKey), getValue(hrChegadaCampoKey), getValue(dtInicioCarregCpoKey), getValue(hrInicioCarregCpoKey), false),
            tempoCarregamentoHoras: calcHoursDiff(getValue(dtInicioCarregCpoKey), getValue(hrInicioCarregCpoKey), getValue(dtFinalCarregCpoKey) || getValue(dtInicioCarregCpoKey), getValue(hrFinalCarregCpoKey), false),
            filaFabricaHoras: calcHoursDiff(getValue(dtEntradaKey), getValue(hrEntradaKey), getValue(dtInicioDescarFabKey), getValue(hrInicioDescarFabKey), false),
            _timestamp: timestampSaida
        };
    });

    const viagensPorPlaca = {};
    mappedData.forEach(item => {
        if(item.placa && item.placa !== '-' && item._timestamp > 0) {
            if(!viagensPorPlaca[item.placa]) viagensPorPlaca[item.placa] = [];
            viagensPorPlaca[item.placa].push(item);
        }
    });

    Object.keys(viagensPorPlaca).forEach(placa => {
        const viagens = viagensPorPlaca[placa];
        viagens.sort((a, b) => a._timestamp - b._timestamp);
        for(let i = 0; i < viagens.length - 1; i++) {
            const atual = viagens[i]; const proxima = viagens[i+1];
            if (atual.cicloHoras === null || isNaN(atual.cicloHoras) || atual.cicloHoras <= 0) {
                const diffHours = (proxima._timestamp - atual._timestamp) / (1000 * 3600);
                if (diffHours >= 2 && diffHours <= 120) atual.cicloHoras = diffHours;
            }
        }
    });

    mappedData.forEach(d => delete d._timestamp);
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

        // CORRIGIDO O LIMITE DO SUPABASE AQUI (limit(100000))
        const { data: existingIds, error: selErr } = await supabaseClient.from('historico_viagens').select('movimento').limit(100000);
        if (selErr) throw selErr;
        
        const existingSet = new Set(existingIds ? existingIds.map(e => e.movimento) : []);
        
        let duplicadasIgnoradas = 0;
        const viagensNovasArray = newRows.filter(item => {
            if (existingSet.has(item.movimento)) {
                duplicadasIgnoradas++;
                return false;
            } else {
                existingSet.add(item.movimento);
                return true;
            }
        });

        if (viagensNovasArray.length === 0) {
            throw new Error(`Todas as ${newRows.length} viagens da planilha já existem no banco. Nenhuma nova viagem adicionada.`);
        }

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
                                datasEncontradas.length <= 3 ? datasEncontradas.join(', ') : 
                                `${datasEncontradas[0]} a ${datasEncontradas[datasEncontradas.length - 1]}`;
        }

        const { error: insErr } = await supabaseClient.from('historico_viagens').insert(viagensNovasArray);
        if (insErr) throw insErr;

        await supabaseClient.from('historico_importacoes').insert([{
            "dataBase": `Viagens: ${strHistoricoDatas}`,
            "qtdViagens": viagensNovasArray.length,
            "dataLancamento": new Date().toLocaleString('pt-PT')
        }]);

        let msgSucesso = `Sucesso! Foram salvas ${viagensNovasArray.length} NOVAS viagens.\nDatas: ${strHistoricoDatas}`;
        if (duplicadasIgnoradas > 0) {
            msgSucesso += `\n\n(${duplicadasIgnoradas} viagens foram ignoradas pois já existiam no sistema).`;
        }

        alert(msgSucesso);
        carregarHistoricoImportacoes(); 
        
    } catch (err) {
        if(errorMsgDiv) {
            errorMsgDiv.innerText = "Erro: " + err.message;
            errorMsgDiv.classList.remove('hidden');
        } else {
            alert("Erro: " + err.message);
        }
    } finally {
        if(loadingSpinner) { loadingSpinner.classList.add('hidden'); loadingSpinner.classList.remove('flex'); }
    }
}

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');

if(dropZone && fileInput){
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('border-sky-400', 'bg-sky-900/20'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-sky-400', 'bg-sky-900/20'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault(); dropZone.classList.remove('border-sky-400', 'bg-sky-900/20');
        if (e.dataTransfer.files.length > 0) processAndSaveFile(e.dataTransfer.files[0]);
    });
    
    if (selectFileBtn) selectFileBtn.addEventListener('click', () => fileInput.click());
    else dropZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', e => { if(e.target.files.length) processAndSaveFile(e.target.files[0]); });
}

// ==========================================
// IMPORTAÇÃO DE EVENTOS (TELEMETRIA) - ADICIONADO AQUI
// ==========================================
const dropZoneEventos = document.getElementById('dropZoneEventos');
const fileInputEventos = document.getElementById('fileInputEventos');
const selectFileBtnEventos = document.getElementById('selectFileBtnEventos');

if(dropZoneEventos && fileInputEventos){
    dropZoneEventos.addEventListener('dragover', e => { e.preventDefault(); dropZoneEventos.classList.add('bg-rose-900/20', 'border-rose-500'); });
    dropZoneEventos.addEventListener('dragleave', () => dropZoneEventos.classList.remove('bg-rose-900/20', 'border-rose-500'));
    dropZoneEventos.addEventListener('drop', e => {
        e.preventDefault(); dropZoneEventos.classList.remove('bg-rose-900/20', 'border-rose-500');
        if (e.dataTransfer.files.length > 0) processAndSaveEventosFile(e.dataTransfer.files[0]);
    });
    
    if (selectFileBtnEventos) selectFileBtnEventos.addEventListener('click', () => fileInputEventos.click());
    else dropZoneEventos.addEventListener('click', () => fileInputEventos.click());
    
    fileInputEventos.addEventListener('change', e => { if(e.target.files.length) processAndSaveEventosFile(e.target.files[0]); });
}

async function processAndSaveEventosFile(file) {
    const errorMsgDiv = document.getElementById('errorMsgEventos');
    const loadingSpinner = document.getElementById('loadingSpinnerEventos');
    if(errorMsgDiv) errorMsgDiv.classList.add('hidden');
    if(loadingSpinner) { loadingSpinner.classList.remove('hidden'); loadingSpinner.classList.add('flex'); }

    try {
        const text = await file.text();
        const workbook = XLSX.read(text, { type: 'string', raw: true, FS: ';' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!rawData || rawData.length === 0) throw new Error("Planilha vazia ou em formato incorreto.");

        const mappedData = rawData.map(row => {
            const getVal = (possibleNames) => {
                for (let k of Object.keys(row)) {
                    const normK = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                    if (possibleNames.includes(normK)) return row[k];
                }
                return null;
            };

            const motorista = getVal(['motorista', 'nome', 'condutor']);
            if (!motorista || String(motorista).trim() === '-' || String(motorista).trim() === '') return null;

            return {
                data_evento: String(getVal(['data', 'data e hora', 'data do evento']) || '').trim(),
                motorista: String(motorista).trim(),
                placa: String(getVal(['veiculo', 'placa', 'veículo']) || '').trim(),
                evento_nome: String(getVal(['evento', 'regra', 'nome do evento']) || '').trim(),
                criticidade: String(getVal(['criticidade', 'severidade', 'nivel']) || 'Normal').trim(),
                velocidade_final: parseFloat(String(getVal(['velocidade', 'vel final'])).replace(',', '.')) || 0,
                localidade: String(getVal(['local', 'localidade', 'endereco', 'endereço']) || '').trim()
            };
        }).filter(item => item !== null && item.motorista !== '' && item.evento_nome !== '');

        if(mappedData.length === 0) throw new Error("Nenhum evento válido encontrado.");

        const { error: insErr } = await supabaseClient.from('historico_eventos').insert(mappedData);
        if (insErr) throw insErr;

        await supabaseClient.from('historico_importacoes').insert([{
            "dataBase": `Eventos Telemetria`,
            "qtdViagens": mappedData.length,
            "dataLancamento": new Date().toLocaleString('pt-PT')
        }]);

        alert(`Sucesso! Foram salvos ${mappedData.length} eventos.`);
        carregarHistoricoImportacoes();

    } catch (err) {
        if(errorMsgDiv) { errorMsgDiv.innerText = "Erro: " + err.message; errorMsgDiv.classList.remove('hidden'); }
        else alert("Erro: " + err.message);
    } finally {
        if(loadingSpinner) { loadingSpinner.classList.add('hidden'); loadingSpinner.classList.remove('flex'); }
    }
}