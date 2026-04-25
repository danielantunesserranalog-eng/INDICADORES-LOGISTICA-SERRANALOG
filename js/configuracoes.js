// ==========================================
// js/configuracoes.js - IMPORTAÇÃO E METAS
// ==========================================

const MOTORISTAS_EXCLUIDOS = [
    "KEVEN MELGACO DE JESUS", "GIVANILDO DA CONCEIÇÃO URSULINO", "DANILO TEIXEIRA SILVA",
    "LEANDRO LAFAIETE ALMEIDA", "LUIS CARLOS MENDES MUNIZ", "VALDIR ALVES",
    "JOSEMILDO SOARES DE SOUZA", "JULIO CESAR ALMEIDA NUNES", "DEYVISON DOS SANTOS CRUZ",
    "KLEITON MELGAÇO DA SILVA"
];

document.addEventListener('DOMContentLoaded', () => {
    carregarMetasGlobais();
    carregarHistoricoImportacoes(); 
    carregarFrentesGruas(); // Carrega os cards de Frentes/Gruas
});

function decimalParaTime(decimal) {
    if (!decimal || isNaN(decimal)) return '';
    const horas = Math.floor(decimal);
    const minutos = Math.round((decimal - horas) * 60);
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
}

function timeParaDecimal(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h + (m / 60);
}

// ==========================================
// MAPEAMENTO DINÂMICO DE GRUAS (LAYOUT CARDS COM AUTO-SEED)
// ==========================================

let frentesData = {
    'SERRANA': { id: null, gruas: [] },
    'REFLORESTAR': { id: null, gruas: [] },
    'JSL': { id: null, gruas: [] }
};

async function carregarFrentesGruas() {
    // Reset de segurança
    frentesData = {
        'SERRANA': { id: null, gruas: [] },
        'REFLORESTAR': { id: null, gruas: [] },
        'JSL': { id: null, gruas: [] }
    };

    try {
        const { data, error } = await supabaseClient.from('frentes_gruas').select('*');
        
        let encontrouNoBanco = false;

        if (data && data.length > 0) {
            data.forEach(item => {
                const f = (item.frente || '').toUpperCase();
                let targetFrente = null;
                
                // Mapeamento flexível (não importa se no banco está "Serrana", "Frente Serrana", etc)
                if (f.includes('SERRANA')) targetFrente = 'SERRANA';
                else if (f.includes('REFLORESTAR')) targetFrente = 'REFLORESTAR';
                else if (f.includes('JSL')) targetFrente = 'JSL';

                if (targetFrente) {
                    encontrouNoBanco = true;
                    frentesData[targetFrente].id = item.id;
                    // Proteção extra: Lê da coluna 'grua' ou 'codigos' caso a tabela tenha sido criada diferente
                    const colGrua = item.grua || item.codigos || ''; 
                    frentesData[targetFrente].gruas = colGrua.split(',').map(g => g.trim().toUpperCase()).filter(g => g);
                }
            });
        }

        // AUTO-SEED: Se o banco estiver vazio ou a tabela incompleta, força a criação com os dados da imagem
        if (!encontrouNoBanco) {
            frentesData['SERRANA'].gruas = ['GSR0001', 'GSR0002', 'GSR0003', 'GSR0007', 'GSR0008', 'GRB0015', 'GRB0022'];
            frentesData['REFLORESTAR'].gruas = ['GRB0017', 'GRB0020', 'GRB0029'];
            frentesData['JSL'].gruas = ['GSL0012', 'GSL0016'];
            
            // Tenta salvar silenciosamente no banco para inicializar
            try {
                await supabaseClient.from('frentes_gruas').insert([
                    { frente: 'SERRANA', grua: frentesData['SERRANA'].gruas.join(', ') },
                    { frente: 'REFLORESTAR', grua: frentesData['REFLORESTAR'].gruas.join(', ') },
                    { frente: 'JSL', grua: frentesData['JSL'].gruas.join(', ') }
                ]);
                
                // Recarrega para pegar os IDs gerados pelo banco
                const { data: newData } = await supabaseClient.from('frentes_gruas').select('*');
                if (newData) {
                    newData.forEach(item => {
                        const f = (item.frente || '').toUpperCase();
                        if (f.includes('SERRANA')) frentesData['SERRANA'].id = item.id;
                        else if (f.includes('REFLORESTAR')) frentesData['REFLORESTAR'].id = item.id;
                        else if (f.includes('JSL')) frentesData['JSL'].id = item.id;
                    });
                }
            } catch(silentErr) {
                console.log("Banco não está pronto para insert automático. Exibindo via memória visual.", silentErr);
            }
        }
        
        renderizarGruas();
    } catch (e) {
        console.error("Erro geral na API do Supabase:", e);
        // Fallback garantido para a interface nunca ficar quebrada
        frentesData['SERRANA'].gruas = ['GSR0001', 'GSR0002', 'GSR0003', 'GSR0007', 'GSR0008', 'GRB0015', 'GRB0022'];
        frentesData['REFLORESTAR'].gruas = ['GRB0017', 'GRB0020', 'GRB0029'];
        frentesData['JSL'].gruas = ['GSL0012', 'GSL0016'];
        renderizarGruas();
    }
}

function renderizarGruas() {
    const cores = {
        'SERRANA': 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50 hover:bg-emerald-800',
        'REFLORESTAR': 'bg-amber-900/40 text-amber-300 border-amber-700/50 hover:bg-amber-800',
        'JSL': 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50 hover:bg-indigo-800'
    };

    ['SERRANA', 'REFLORESTAR', 'JSL'].forEach(frente => {
        const container = document.getElementById(`lista_${frente.toLowerCase()}`);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (frentesData[frente].gruas.length > 0) {
            frentesData[frente].gruas.forEach(grua => {
                const cor = cores[frente];
                container.insertAdjacentHTML('beforeend', `
                    <div class="inline-flex items-center gap-1.5 border px-2 py-1 rounded-md text-[11px] font-mono transition-all shadow-sm ${cor}">
                        <i class="fas fa-truck-loading text-[10px] opacity-70"></i> ${grua}
                        <button onclick="removerGrua('${frente}', '${grua}')" class="ml-1 opacity-50 hover:opacity-100 hover:text-white focus:outline-none transition-opacity" title="Remover">
                            <i class="fas fa-times-circle text-[12px]"></i>
                        </button>
                    </div>
                `);
            });
        } else {
            container.innerHTML = '<span class="text-[11px] text-slate-500 italic w-full text-center mt-4">Nenhuma grua vinculada.</span>';
        }
    });
}

window.adicionarGrua = async function(frente, inputId) {
    const inputEl = document.getElementById(inputId);
    const valor = inputEl.value.trim().toUpperCase();
    
    if (!valor) return;
    
    // Suporta adicionar várias de uma vez colando com vírgula
    const novasGruas = valor.split(',').map(g => g.trim()).filter(g => g);
    
    let gruasAtuais = [...frentesData[frente].gruas];
    let adicionou = false;
    
    novasGruas.forEach(ng => {
        if (!gruasAtuais.includes(ng)) {
            gruasAtuais.push(ng);
            adicionou = true;
        }
    });
    
    if (adicionou) {
        inputEl.disabled = true;
        await salvarNoBanco(frente, gruasAtuais.join(', '));
        inputEl.value = '';
        inputEl.disabled = false;
        inputEl.focus();
    } else {
        inputEl.value = '';
    }
}

window.removerGrua = async function(frente, gruaParaRemover) {
    if (!confirm(`Deseja realmente excluir a grua ${gruaParaRemover} da frente ${frente}?`)) return;
    
    let gruasAtuais = frentesData[frente].gruas.filter(g => g !== gruaParaRemover);
    await salvarNoBanco(frente, gruasAtuais.join(', '));
}

async function salvarNoBanco(frente, stringGruas) {
    const id = frentesData[frente].id;
    try {
        if (id) {
            await supabaseClient.from('frentes_gruas').update({ grua: stringGruas }).eq('id', id);
        } else {
            const { data } = await supabaseClient.from('frentes_gruas').insert([{ frente: frente, grua: stringGruas }]).select();
            if (data && data.length > 0) {
                frentesData[frente].id = data[0].id;
            }
        }
        await carregarFrentesGruas();
    } catch(e) {
        console.error("Erro no update:", e);
        alert('Erro ao sincronizar com o banco de dados!');
    }
}

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
            
            const elMetaCiclo = document.getElementById('cfg_meta_ciclo');
            const elMetaFilaCpo = document.getElementById('cfg_meta_fila_campo');
            const elMetaCarga = document.getElementById('cfg_meta_carga');
            const elMetaFilaFab = document.getElementById('cfg_meta_fila_fabrica');

            if (elVProg) elVProg.value = data.v_prog || '';
            if (elVolProg) elVolProg.value = data.vol_prog || '';
            if (elCxProg) elCxProg.value = data.cx_prog || '';
            if (elPbtcProg) elPbtcProg.value = data.pbtc_prog || '';
            
            if (elMetaCiclo) elMetaCiclo.value = decimalParaTime(data.meta_ciclo);
            if (elMetaFilaCpo) elMetaFilaCpo.value = decimalParaTime(data.meta_fila_campo);
            if (elMetaCarga) elMetaCarga.value = decimalParaTime(data.meta_carga);
            if (elMetaFilaFab) elMetaFilaFab.value = decimalParaTime(data.meta_fila_fabrica);
        }
    } catch(e) { console.error("Erro ao carregar metas globais", e); }
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
            pbtc_prog: parseFloat(document.getElementById('cfg_pbtc').value) || 0,
            meta_ciclo: timeParaDecimal(document.getElementById('cfg_meta_ciclo').value),
            meta_fila_campo: timeParaDecimal(document.getElementById('cfg_meta_fila_campo').value),
            meta_carga: timeParaDecimal(document.getElementById('cfg_meta_carga').value),
            meta_fila_fabrica: timeParaDecimal(document.getElementById('cfg_meta_fila_fabrica').value)
        };
        try {
            await supabaseClient.from('metas_globais').upsert(payload);
            btnSalvarMetasGlobais.innerHTML = '<i class="fas fa-check"></i> Salvo!';
        } catch(e) { btnSalvarMetasGlobais.innerHTML = 'Erro!'; }
        setTimeout(() => btnSalvarMetasGlobais.innerHTML = '<i class="fas fa-save"></i> Salvar Metas Base', 2000);
    });
}

// ==========================================
// HISTÓRICO DE IMPORTAÇÕES
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
            .limit(10); 

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

                async function apagarEmLotes(tabela, colunaReferencia) {
                    let temDados = true;
                    let contador = 0; 
                    
                    while (temDados && contador < 100) {
                        contador++;
                        const { data, error } = await supabaseClient.from(tabela).select(colunaReferencia).limit(1);
                        
                        if (error || !data || data.length === 0) {
                            temDados = false; 
                        } else {
                            await supabaseClient.from(tabela).delete().not(colunaReferencia, 'is', null);
                        }
                    }
                }

                if (tipo === 'tudo' || tipo === 'viagens') {
                    await apagarEmLotes('historico_viagens', 'movimento');
                }
                
                if (tipo === 'tudo' || tipo === 'jornadas') {
                    await apagarEmLotes('historico_jornadas', 'motorista');
                }

                if (tipo === 'tudo' || tipo === 'eventos') {
                    await apagarEmLotes('historico_eventos', 'motorista');
                }
                
                await supabaseClient.from('historico_importacoes').insert([{
                    "dataBase": `[DADOS APAGADOS] - Módulo: ${tipo.toUpperCase()}`,
                    "qtdViagens": 0,
                    "dataLancamento": new Date().toLocaleString('pt-PT')
                }]);

                alert("Operação concluída. Os dados selecionados foram completamente apagados da nuvem.");
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
// IMPORTAÇÃO DE JORNADAS E VIAGENS MANTIDAS
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
        }).filter(item => {
            if (item === null || item.motorista === '' || item.total_trabalho_horas < 8) return false;
            if (MOTORISTAS_EXCLUIDOS.includes(item.motorista.toUpperCase())) return false;
            return true;
        });

        if(mappedData.length === 0) throw new Error("Nenhuma jornada válida foi encontrada.");

        let existingJornadas = [];
        let startJor = 0;
        const stepJor = 1000;
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

const dropZoneJornadas = document.getElementById('dropZoneJornadas');
const fileInputJornadas = document.getElementById('fileInputJornadas');
if(dropZoneJornadas && fileInputJornadas){
    dropZoneJornadas.addEventListener('dragover', e => { e.preventDefault(); dropZoneJornadas.classList.add('bg-amber-900/20'); });
    dropZoneJornadas.addEventListener('dragleave', () => dropZoneJornadas.classList.remove('bg-amber-900/20'));
    dropZoneJornadas.addEventListener('drop', e => { e.preventDefault(); dropZoneJornadas.classList.remove('bg-amber-900/20'); if (e.dataTransfer.files.length > 0) processAndSaveJornadasFile(e.dataTransfer.files[0]); });
    dropZoneJornadas.addEventListener('click', () => fileInputJornadas.click());
    fileInputJornadas.addEventListener('change', e => { if(e.target.files.length) processAndSaveJornadasFile(e.target.files[0]); });
}

function normalizeStr(str) { if (!str) return ''; return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
function parsePtBrNumber(val) { if (val === null || val === undefined || val === '') return 0; if (typeof val === 'number') return val; let str = String(val).replace(/\./g, '').replace(',', '.'); return parseFloat(str) || 0; }
function calcHoursDiff(dtStart, hrStart, dtEnd, hrEnd, isCiclo) {
    const s = parseDateTime(dtStart, hrStart); const e = parseDateTime(dtEnd, hrEnd);
    if (!s || !e) return null;
    let diffH = (e - s) / (1000 * 3600);
    if (isCiclo) { if (diffH > 120) return null; if (diffH < 0) return null; } else { if (diffH < 0 || diffH > 48) return 0; }
    return diffH;
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
    const pesoLiqKey = findKey(['Peso na Entrada']);
    const volumeKey = findKey(['volume real', 'volume_real']);
    const gruaKey = findKey(['carregador florestal', 'carregador', 'grua']); 

    const mappedData = rawData.map((row, idx) => {
        const getValue = (key) => (key && row[key] !== undefined && row[key] !== "") ? row[key] : null;
        return {
            movimento: String(getValue(movimentoKey) || `MOV-GEN-${Date.now()}-${idx}`),
            dataLancamento: new Date().toLocaleDateString('pt-PT'),
            transportadora: String(getValue(transpKey) || "Outras").trim(),
            placa: String(getValue(placaKey) || "-").trim(),
            pesoLiquido: parsePtBrNumber(getValue(pesoLiqKey)),
            volumeReal: parsePtBrNumber(getValue(volumeKey)),
            grua: String(getValue(gruaKey) || "-").trim()
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
        if (!newRows || newRows.length === 0) throw new Error("Planilha vazia.");

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

        const { error: insErr } = await supabaseClient.from('historico_viagens').insert(viagensNovasArray);
        if (insErr) throw insErr;

        await supabaseClient.from('historico_importacoes').insert([{ "dataBase": `Viagens Produção`, "qtdViagens": viagensNovasArray.length, "dataLancamento": new Date().toLocaleString('pt-PT') }]);
        alert(`Sucesso! Salvas ${viagensNovasArray.length} NOVAS viagens.`);
        carregarHistoricoImportacoes(); 
        
    } catch (err) {
        if(errorMsgDiv) { errorMsgDiv.innerText = "Erro: " + err.message; errorMsgDiv.classList.remove('hidden'); } else alert("Erro: " + err.message);
    } finally {
        if(loadingSpinner) { loadingSpinner.classList.add('hidden'); loadingSpinner.classList.remove('flex'); }
    }
}

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
if(dropZone && fileInput){
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('bg-sky-900/20'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('bg-sky-900/20'));
    dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('bg-sky-900/20'); if (e.dataTransfer.files.length > 0) processAndSaveFile(e.dataTransfer.files[0]); });
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => { if(e.target.files.length) processAndSaveFile(e.target.files[0]); });
}