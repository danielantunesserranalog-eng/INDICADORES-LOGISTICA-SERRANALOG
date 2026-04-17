// SerranaLog Analytics - Central Engine
Chart.register(ChartDataLabels);
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
Chart.defaults.font.family = "'Inter', sans-serif";

const viewDashboard = document.getElementById('viewDashboard');
const viewOperacional = document.getElementById('viewOperacional');
const viewJornadas = document.getElementById('viewJornadas');
const viewHistorico = document.getElementById('viewHistorico');
const viewConfiguracoes = document.getElementById('viewConfiguracoes');

const btnMenuDashboard = document.getElementById('btnMenuDashboard');
const btnMenuOperacional = document.getElementById('btnMenuOperacional');
const btnMenuJornadas = document.getElementById('btnMenuJornadas');
const btnMenuHistorico = document.getElementById('btnMenuHistorico');
const btnMenuConfiguracoes = document.getElementById('btnMenuConfiguracoes');

const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const dashboardFilters = document.getElementById('dashboardFilters');

const dbStatusLabel = document.getElementById('dbStatusLabel');
const filterTransportadora = document.getElementById('filterTransportadora');
const filterData = document.getElementById('filterData');
const btnQFs = document.querySelectorAll('.btn-qf');
let activeQuickFilter = 'ALL';

let fullHistoricoData = []; 

// NAVEGAÇÃO
function switchView(view) {
    viewDashboard.classList.add('hidden');
    viewOperacional.classList.add('hidden');
    viewJornadas.classList.add('hidden');
    viewHistorico.classList.add('hidden');
    viewConfiguracoes.classList.add('hidden');
    
    [btnMenuDashboard, btnMenuOperacional, btnMenuJornadas, btnMenuHistorico, btnMenuConfiguracoes].forEach(btn => {
        btn.classList.remove('active', 'text-sky-400');
        btn.classList.add('text-slate-400');
    });

    if(view === 'dashboard') {
        viewDashboard.classList.remove('hidden');
        dashboardFilters.classList.remove('hidden'); dashboardFilters.classList.add('flex');
        btnMenuDashboard.classList.add('active', 'text-sky-400'); btnMenuDashboard.classList.remove('text-slate-400');
        pageTitle.innerText = "Dashboard Analítico";
        pageSubtitle.innerText = "Análise do histórico acumulado de viagens";
        if(typeof loadDashboardData === 'function') loadDashboardData();
        
    } else if (view === 'operacional') {
        viewOperacional.classList.remove('hidden');
        dashboardFilters.classList.add('hidden'); dashboardFilters.classList.remove('flex');
        btnMenuOperacional.classList.add('active', 'text-sky-400'); btnMenuOperacional.classList.remove('text-slate-400');
        pageTitle.innerText = "Indicadores Operacionais";
        pageSubtitle.innerText = "Painel Executivo: Realizado vs Meta Global";
        if(typeof renderizarTabelaOperacional === 'function') renderizarTabelaOperacional();

    } else if (view === 'jornadas') {
        viewJornadas.classList.remove('hidden');
        dashboardFilters.classList.add('hidden'); dashboardFilters.classList.remove('flex');
        btnMenuJornadas.classList.add('active', 'text-sky-400'); btnMenuJornadas.classList.remove('text-slate-400');
        pageTitle.innerText = "Monitoramento de Jornadas";
        pageSubtitle.innerText = "Controle de carga horária e limites da lei do motorista";
        if(typeof carregarPainelJornadas === 'function') carregarPainelJornadas();

    } else if (view === 'historico') {
        viewHistorico.classList.remove('hidden');
        dashboardFilters.classList.add('hidden'); dashboardFilters.classList.remove('flex');
        btnMenuHistorico.classList.add('active', 'text-sky-400'); btnMenuHistorico.classList.remove('text-slate-400');
        pageTitle.innerText = "Histórico de Viagens";
        pageSubtitle.innerText = "Consulte, pesquise e audite a base de dados";
        if(typeof loadHistoricoCompleto === 'function') loadHistoricoCompleto();

    } else if (view === 'configuracoes') {
        viewConfiguracoes.classList.remove('hidden');
        dashboardFilters.classList.add('hidden'); dashboardFilters.classList.remove('flex');
        btnMenuConfiguracoes.classList.add('active', 'text-sky-400'); btnMenuConfiguracoes.classList.remove('text-slate-400');
        pageTitle.innerText = "Configurações da Torre";
        pageSubtitle.innerText = "Gerenciamento de Metas Globais e Base de Dados";
        if(typeof carregarHistoricoImportacoes === 'function') carregarHistoricoImportacoes(); 
        if(typeof carregarMetasGlobais === 'function') carregarMetasGlobais();
    }
}

btnMenuDashboard.addEventListener('click', () => switchView('dashboard'));
btnMenuOperacional.addEventListener('click', () => switchView('operacional'));
btnMenuJornadas.addEventListener('click', () => switchView('jornadas'));
btnMenuHistorico.addEventListener('click', () => switchView('historico'));
btnMenuConfiguracoes.addEventListener('click', () => switchView('configuracoes'));

filterTransportadora.addEventListener('change', () => loadDashboardData());
filterData.addEventListener('change', () => { setQuickFilterUI('ALL'); loadDashboardData(); });

btnQFs.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const qf = e.currentTarget.getAttribute('data-qf');
        setQuickFilterUI(qf);
        if (qf !== 'ALL') filterData.value = 'ALL';
        loadDashboardData();
    });
});

function setQuickFilterUI(qf) {
    activeQuickFilter = qf;
    btnQFs.forEach(b => {
        if (b.getAttribute('data-qf') === qf) {
            b.classList.add('active', 'bg-sky-900/50', 'text-sky-400', 'border-sky-800/50');
            b.classList.remove('text-slate-400', 'hover:bg-slate-700/50', 'border-transparent');
        } else {
            b.classList.remove('active', 'bg-sky-900/50', 'text-sky-400', 'border-sky-800/50');
            b.classList.add('text-slate-400', 'hover:bg-slate-700/50', 'border-transparent');
        }
    });
}

// FORMATADORES E PARSERS
function parsePtBrNumber(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let str = String(val).trim();
    if (str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(str) || 0;
}

function formatarHorasMinutos(horasDecimais) {
    if (horasDecimais === null || horasDecimais === undefined || isNaN(horasDecimais) || horasDecimais <= 0) return '-';
    const horas = Math.floor(horasDecimais);
    const minutos = Math.round((horasDecimais - horas) * 60);
    if (horas === 0 && minutos === 0) return '0m';
    if (horas === 0) return `${minutos}m`;
    if (minutos === 0) return `${horas}h`;
    return `${horas}h ${minutos.toString().padStart(2, '0')}m`;
}

function parseDateTime(dateVal, timeVal) {
    if (!dateVal) return null;
    let baseDate = null;
    if (typeof dateVal === 'number') {
        const dateInfo = XLSX.SSF.parse_date_code(dateVal);
        if (dateInfo) baseDate = new Date(dateInfo.y, dateInfo.m - 1, dateInfo.d);
    } else if (typeof dateVal === 'string') {
        const str = dateVal.trim();
        if (str.includes('/')) {
            const parts = str.split(' ')[0].split('/');
            if (parts.length >= 3) {
                let year = parseInt(parts[2], 10);
                if (year < 100) year += 2000;
                baseDate = new Date(year, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            }
        } else if (str.includes('-')) {
            const parts = str.split(' ')[0].split('-');
            if (parts.length >= 3) {
                let year = parseInt(parts[0], 10) > 1000 ? parseInt(parts[0], 10) : parseInt(parts[2], 10);
                let month = parseInt(parts[1], 10) - 1;
                let day = parseInt(parts[0], 10) > 1000 ? parseInt(parts[2], 10) : parseInt(parts[0], 10);
                if (year < 100) year += 2000;
                baseDate = new Date(year, month, day);
            }
        } else { baseDate = new Date(str); }
    }
    if (!baseDate || isNaN(baseDate.getTime())) return null;

    let hours = 0, minutes = 0, seconds = 0;
    if (typeof timeVal === 'number') {
        let fraction = timeVal % 1; 
        if (fraction < 0) fraction += 1;
        let totalSeconds = Math.round(fraction * 24 * 3600);
        hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        minutes = Math.floor(totalSeconds / 60);
    } else if (typeof timeVal === 'string' && timeVal.trim() !== "") {
        const tParts = timeVal.trim().split(':');
        hours = parseInt(tParts[0], 10) || 0;
        minutes = parseInt(tParts[1], 10) || 0;
    }
    baseDate.setHours(hours, minutes, seconds, 0);
    return baseDate;
}

function calcHoursDiff(dtStart, hrStart, dtEnd, hrEnd, isCiclo = false) {
    let start = parseDateTime(dtStart, hrStart);
    let end = parseDateTime(dtEnd || dtStart, hrEnd); 
    
    if (start && end && !isNaN(start) && !isNaN(end)) {
        if (end < start) {
            end.setDate(end.getDate() + 1);
        }
        let diffHours = (end - start) / (1000 * 3600);
        
        if (isCiclo && diffHours > 0 && diffHours < 2 && (!dtEnd || dtEnd === dtStart)) {
            end.setDate(end.getDate() + 1);
            diffHours = (end - start) / (1000 * 3600);
        }

        if (diffHours >= 0 && diffHours <= 240) return diffHours;
    }
    return null;
}

function normalizeStr(str) {
    if (!str) return "";
    return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// FORMATADOR DE TEMPO PARA JORNADAS (Recebe "HH:MM")
function parseTimeToHours(timeStr) {
    if(!timeStr || timeStr === '-' || String(timeStr).trim() === '') return 0;
    const parts = String(timeStr).split(':');
    if(parts.length >= 2) return parseInt(parts[0], 10) + (parseInt(parts[1], 10) / 60);
    return parseFloat(timeStr) || 0;
}

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
    const pesoLiqKey = findKey(['Peso na Entrada', 'Peso na Entrada']);
    const volumeKey = findKey(['volume real', 'volume_real']);
    
    const distAsfaltoKey = findKey(['distancia por asfalto', 'distância por asfalto', 'distancia asfalto']);
    const distTerraKey = findKey(['distancia por terra', 'distância por terra', 'distancia terra']);
    
    const dtChegadaCampoKey = findKey(['data chegada campo']);
    const dtInicioCarregCpoKey = findKey(['dt início carreg cpo', 'dt inicio carreg cpo']);
    const hrChegadaCampoKey = findKey(['hora chegada campo', 'hr chegada campo']);
    const hrInicioCarregCpoKey = findKey(['hr início carreg cpo', 'hr inicio carreg cpo']);

    // TEMPO DE CARREGAMENTO
    const dtFinalCarregCpoKey = findKey(['dt final carreg cpo', 'data final carreg cpo', 'data fim carreg cpo']);
    const hrFinalCarregCpoKey = findKey(['hr final carreg cpo', 'hora final carreg cpo', 'hr fim carreg cpo', 'hora fim carreg cpo']);

    const dtEntradaKey = findKey(['data de entrada', 'data entrada', 'data chegada']);
    const hrEntradaKey = findKey(['hora de entrada', 'hora entrada', 'hr entrada']);
    const dtInicioDescarFabKey = findKey(['dt início descar fáb', 'dt inicio descar fab', 'data fim']);
    const hrInicioDescarFabKey = findKey(['hr início descar fáb', 'hr inicio descar fab', 'hora fim']);
    
    // ADICIONADO: Chaves para Fim de Descarga
    const dtFimDescarFabKey = findKey(['dt fim descar fáb', 'dt fim descar fab', 'data fim descar fab']);
    const hrFimDescarFabKey = findKey(['hr fim descar fáb', 'hr fim descar fab', 'hora fim descar fab']);
    
    const dtSaidaBaseKey = findKey(['data de saída', 'data saída', 'data saída fábrica']);
    const hrSaidaFabKey = findKey(['hora saída fábrica', 'hora saída', 'hora saida']);
    
    const cicloProntoKey = findKey(['ciclo', 'tempo de ciclo', 'ciclo horas', 'horas ciclo', 'tempo ciclo']);

    // ADICIONADOS: CHAVES FALTANTES PARA GRUA E TURNO
    const carregadorKey = findKey(['carregador florestal', 'carregador_florestal', 'carregador']);
    const turnoKey = findKey(['turno']);

    const today = new Date().toLocaleDateString('pt-PT');

    const mappedData = rawData.map((row, idx) => {
        const getValue = (key) => (key && row[key] !== undefined && row[key] !== "") ? row[key] : null;

        const movimento = getValue(movimentoKey) || `MOV-GEN-${Date.now()}-${idx}`;
        let transportadora = String(getValue(transpKey) || "Não identificada").trim().replace(/\s+(LTDA|Ltda|LTDA\.|S\.A\.|EIRELI)$/i, '').trim();
        if(!transportadora || transportadora === "-") transportadora = "Outras";

        const rawDtSaida = getValue(dtSaidaBaseKey);
        const rawHrSaida = getValue(hrSaidaFabKey);
        
        // Busca os dados do Fim da Descarga
        const rawDtFimDescar = getValue(dtFimDescarFabKey);
        const rawHrFimDescar = getValue(hrFimDescarFabKey);
        
        let strDataBase = 'Desconhecida';
        let timestampSaida = 0;

        // Prioriza a Dt Fim Descar Fáb. Se a coluna estiver vazia, usa a Data de Saída como backup.
        const dtReferencia = rawDtFimDescar || rawDtSaida;
        const hrReferencia = rawHrFimDescar || rawHrSaida;

        if (dtReferencia) {
            const parsed = parseDateTime(dtReferencia, hrReferencia);
            if (parsed) {
                strDataBase = parsed.toLocaleDateString('pt-PT');
                // O timestamp será usado para calcular os ciclos entre o fim de uma viagem e outra
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
            
            // ADICIONADOS: SALVANDO GRUA, TURNO E HORA SAÍDA PARA O CÁLCULO
            carregadorFlorestal: getValue(carregadorKey) ? String(getValue(carregadorKey)).trim() : null,
            turno: getValue(turnoKey) ? String(getValue(turnoKey)).trim() : null,
            horaSaidaFabrica: rawHrSaida ? String(rawHrSaida).trim() : null,

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
            const atual = viagens[i];
            const proxima = viagens[i+1];
            
            if (atual.cicloHoras === null || isNaN(atual.cicloHoras) || atual.cicloHoras <= 0) {
                const diffHours = (proxima._timestamp - atual._timestamp) / (1000 * 3600);
                if (diffHours >= 2 && diffHours <= 120) { 
                    atual.cicloHoras = diffHours;
                }
            }
        }
    });

    mappedData.forEach(d => delete d._timestamp);

    return mappedData.filter(item => item.pesoLiquido > 0 || item.volumeReal > 0);
}

// ==========================================
// IMPORTAÇÃO DE VIAGENS
// ==========================================
async function processAndSaveFile(file) {
    const errorMsgDiv = document.getElementById('errorMsg');
    const loadingSpinner = document.getElementById('loadingSpinner');
    errorMsgDiv.classList.add('hidden');
    loadingSpinner.classList.remove('hidden'); loadingSpinner.classList.add('flex');

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const newRows = parseSheetToData(workbook.Sheets[workbook.SheetNames[0]]);

        let strHistoricoDatas = 'Desconhecida';
        const datasEncontradas = [...new Set(newRows.map(r => r.dataDaBaseExcel).filter(d => d && d !== 'Desconhecida'))];
        
        if (datasEncontradas.length > 0) {
            datasEncontradas.sort((a, b) => {
                const pA = a.split('/'); const pB = b.split('/');
                return new Date(pA[2], pA[1]-1, pA[0]) - new Date(pB[2], pB[1]-1, pB[0]);
            });
            strHistoricoDatas = datasEncontradas.length === 1 ? datasEncontradas[0] : 
                                datasEncontradas.length <= 3 ? datasEncontradas.join(', ') : 
                                `${datasEncontradas[0]} a ${datasEncontradas[datasEncontradas.length - 1]}`;
        }

        const { data: existingIds, error: selErr } = await supabaseClient.from('historico_viagens').select('movimento');
        if (selErr) throw selErr;
        const existingSet = new Set(existingIds ? existingIds.map(e => e.movimento) : []);
        
        let viagensNovas = 0;
        newRows.forEach(item => { if(!existingSet.has(item.movimento)) viagensNovas++; });

        const { error: upErr } = await supabaseClient.from('historico_viagens').upsert(newRows);
        if (upErr) throw upErr;

        await supabaseClient.from('historico_importacoes').insert([{
            "dataBase": strHistoricoDatas, "qtdViagens": viagensNovas, "dataLancamento": new Date().toLocaleString('pt-PT')
        }]);

        alert(`Sucesso! processadas ${newRows.length} viagens. (${viagensNovas} novas).`);
        carregarHistoricoImportacoes();
        fullHistoricoData = []; 
        loadHistoricoCompleto();
    } catch (err) {
        errorMsgDiv.innerText = "Erro: " + err.message;
        errorMsgDiv.classList.remove('hidden');
    } finally {
        loadingSpinner.classList.add('hidden'); loadingSpinner.classList.remove('flex');
    }
}

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
if(dropZone){
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('border-sky-400', 'bg-sky-900/20'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-sky-400', 'bg-sky-900/20'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault(); dropZone.classList.remove('border-sky-400', 'bg-sky-900/20');
        if (e.dataTransfer.files.length > 0) processAndSaveFile(e.dataTransfer.files[0]);
    });
    document.getElementById('selectFileBtn').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => { if(e.target.files.length) processAndSaveFile(e.target.files[0]); });
}

// ==========================================
// IMPORTAÇÃO DE JORNADAS (CSV)
// ==========================================
async function processAndSaveJornadasFile(file) {
    const errorMsgDiv = document.getElementById('errorMsgJornadas');
    const loadingSpinner = document.getElementById('loadingSpinnerJornadas');
    errorMsgDiv.classList.add('hidden');
    loadingSpinner.classList.remove('hidden'); loadingSpinner.classList.add('flex');

    try {
        const text = await file.text();
        const workbook = XLSX.read(text, { type: 'string', FS: ';' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!rawData || rawData.length === 0) throw new Error("Planilha vazia ou delimitador incorreto.");

        const mappedData = rawData.map(row => {
            if (!row['Pessoa']) return null;

            const totalHoras = parseTimeToHours(row['Total de Trabalho']);
            
            return {
                motorista: row['Pessoa'].trim(),
                cpf: row['CPF'] || '',
                placa: row['Placa'] || '',
                inicio: row['Início'] || '',
                fim: row['Fim'] || '',
                total_trabalho_horas: totalHoras,
                refeicao_horas: parseTimeToHours(row['Refeição']),
                repouso_horas: parseTimeToHours(row['Repouso']),
                direcao_horas: parseTimeToHours(row['Direção']),
                estourou_jornada: totalHoras > 12
            };
        }).filter(item => item !== null && item.motorista !== '');

        if(mappedData.length === 0) throw new Error("Nenhum dado válido de jornada encontrado na planilha.");

        const { error: insErr } = await supabaseClient.from('historico_jornadas').insert(mappedData);
        if (insErr) throw insErr;

        alert(`Sucesso! Foram importadas ${mappedData.length} jornadas.`);
        
    } catch (err) {
        errorMsgDiv.innerText = "Erro: " + err.message;
        errorMsgDiv.classList.remove('hidden');
    } finally {
        loadingSpinner.classList.add('hidden'); loadingSpinner.classList.remove('flex');
    }
}

const dropZoneJornadas = document.getElementById('dropZoneJornadas');
const fileInputJornadas = document.getElementById('fileInputJornadas');
if(dropZoneJornadas){
    dropZoneJornadas.addEventListener('dragover', e => { e.preventDefault(); dropZoneJornadas.classList.add('border-amber-400', 'bg-amber-900/20'); });
    dropZoneJornadas.addEventListener('dragleave', () => dropZoneJornadas.classList.remove('border-amber-400', 'bg-amber-900/20'));
    dropZoneJornadas.addEventListener('drop', e => {
        e.preventDefault(); dropZoneJornadas.classList.remove('border-amber-400', 'bg-amber-900/20');
        if (e.dataTransfer.files.length > 0) processAndSaveJornadasFile(e.dataTransfer.files[0]);
    });
    document.getElementById('selectFileBtnJornadas').addEventListener('click', () => fileInputJornadas.click());
    fileInputJornadas.addEventListener('change', e => { if(e.target.files.length) processAndSaveJornadasFile(e.target.files[0]); });
}

// ZONA DE RISCO
document.getElementById('btnLimparBanco').addEventListener('click', async () => {
    if(confirm("ATENÇÃO: Deseja apagar todo o histórico do banco de dados na nuvem?")) {
        await supabaseClient.from('historico_viagens').delete().neq('movimento', 'null');
        await supabaseClient.from('historico_importacoes').delete().gt('id', 0);
        await supabaseClient.from('historico_jornadas').delete().gt('id', 0);
        alert("Histórico apagado com sucesso.");
        carregarHistoricoImportacoes();
        fullHistoricoData = [];
    }
});

// FUNÇÕES DA TELA CONFIGURAÇÕES
async function carregarMetasGlobais() {
    try {
        const { data, error } = await supabaseClient.from('metas_globais').select('*').eq('id', 1).single();
        if (data) {
            document.getElementById('cfg_v_prog').value = data.v_prog || '';
            document.getElementById('cfg_vol_prog').value = data.vol_prog || '';
            document.getElementById('cfg_cx_prog').value = data.cx_prog || '';
            document.getElementById('cfg_pbtc').value = data.pbtc_prog || '';
            localStorage.setItem('cfg_metas', JSON.stringify(data));
        }
    } catch(e) { console.log("Lendo metas locais...", e); }
}

document.getElementById('btnSalvarMetasGlobais').addEventListener('click', async () => {
    const btn = document.getElementById('btnSalvarMetasGlobais');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    const payload = {
        id: 1,
        v_prog: parseFloat(document.getElementById('cfg_v_prog').value) || 0,
        vol_prog: parseFloat(document.getElementById('cfg_vol_prog').value) || 0,
        cx_prog: parseFloat(document.getElementById('cfg_cx_prog').value) || 0,
        pbtc_prog: parseFloat(document.getElementById('cfg_pbtc').value) || 0
    };
    try {
        await supabaseClient.from('metas_globais').upsert(payload);
        localStorage.setItem('cfg_metas', JSON.stringify(payload));
        btn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
    } catch(e) {
        btn.innerHTML = 'Erro!';
    }
    setTimeout(() => btn.innerHTML = '<i class="fas fa-save"></i> Salvar Metas Base', 2000);
});

// ==========================================
// --- DASHBOARD ANALÍTICO (GRÁFICOS E CARDS) ---
// ==========================================
let chartCiclo = null, chartTransp = null;

const centerTextPlugin = {
    id: 'centerText',
    beforeDraw: function(chart) {
        if (chart.config.type !== 'doughnut') return;
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;
        
        const total = chart.config.data.datasets[0].data.reduce((a, b) => a + b, 0);

        ctx.restore();
        ctx.font = "bold 28px 'Inter', sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#38bdf8"; 
        const text = total.toLocaleString('pt-PT');
        const textX = centerX - (ctx.measureText(text).width / 2);
        ctx.fillText(text, textX, centerY - 8);
        
        ctx.font = "bold 11px 'Inter', sans-serif";
        ctx.fillStyle = "#94a3b8"; 
        const subText = "VIAGENS";
        const subTextX = centerX - (ctx.measureText(subText).width / 2);
        ctx.fillText(subText, subTextX, centerY + 16);
        ctx.save();
    }
};

async function loadDashboardData() {
    if(fullHistoricoData.length === 0) {
        const { data } = await supabaseClient.from('historico_viagens').select('*');
        if(data) fullHistoricoData = data;
    }
    const storedData = fullHistoricoData;
    if(!storedData.length) return;

    const allTransps = [...new Set(storedData.map(d => d.transportadora))].filter(Boolean).sort();
    const currT = filterTransportadora.value || 'ALL';
    filterTransportadora.innerHTML = '<option value="ALL">TODAS AS TRANSPORTADORAS</option>';
    allTransps.forEach(t => filterTransportadora.insertAdjacentHTML('beforeend', `<option value="${t}" ${t===currT?'selected':''}>${t}</option>`));

    const allDates = [...new Set(storedData.map(d => d.dataDaBaseExcel))].filter(d => d && d !== 'Desconhecida').sort((a,b)=>{const pA=a.split('/');const pB=b.split('/');return new Date(pA[2],pA[1]-1,pA[0])-new Date(pB[2],pB[1]-1,pB[0]);});
    const currD = filterData.value || 'ALL';
    filterData.innerHTML = '<option value="ALL">TODO O PERÍODO</option>';
    allDates.forEach(dt => filterData.insertAdjacentHTML('beforeend', `<option value="${dt}" ${dt===currD?'selected':''}>${dt}</option>`));

    const activeT = filterTransportadora.value;
    const activeD = filterData.value;
    
    const filteredData = storedData.filter(d => {
        const mTransp = activeT === 'ALL' || d.transportadora === activeT;
        let mData = true;
        if (activeQuickFilter !== 'ALL') {
            const parsed = parseDateTime(d.dataDaBaseExcel, null);
            if (parsed) {
                parsed.setHours(0,0,0,0); const hj = new Date(); hj.setHours(0,0,0,0);
                const diff = Math.round((hj - parsed)/86400000);
                if (activeQuickFilter === 'D-1') mData = (diff === 1);
                else if (activeQuickFilter === 'D-2') mData = (diff === 2);
                else if (activeQuickFilter === 'D-7') mData = (diff >= 0 && diff <= 7);
                else if (activeQuickFilter === 'D-30') mData = (diff >= 0 && diff <= 30);
            } else mData = false;
        } else mData = activeD === 'ALL' || d.dataDaBaseExcel === activeD;
        return mTransp && mData;
    });

    if (filteredData.length === 0) {
        document.getElementById('dbStatusLabel').innerText = "Sem dados para o filtro";
        document.getElementById('totalViagens').innerText = '0';
        document.getElementById('totalPesoLiq').innerText = '0 t';
        document.getElementById('produtividadeGlobal').innerText = '0.0';
        document.getElementById('ociosidadeGlobal').innerText = '0%';
        document.getElementById('bestPlacaValue').innerText = '0.0';
        document.getElementById('bestPlacaName').innerText = 'Nenhum cavalo encontrado';
        if(document.getElementById('tempoCarregamento')) document.getElementById('tempoCarregamento').innerText = '0 h';
        if(chartCiclo) chartCiclo.destroy();
        if(chartTransp) chartTransp.destroy();
        return;
    }

    document.getElementById('dbStatusLabel').innerText = `${filteredData.length} Viagens`;
    
    const totalViagens = filteredData.length;
    const totalPesoKg = filteredData.reduce((sum, r) => sum + r.pesoLiquido, 0);
    const totalPesoTon = totalPesoKg / 1000;
    const cargaMediaTon = totalViagens > 0 ? (totalPesoTon / totalViagens) : 0;
    const mediaVolume = totalViagens > 0 ? filteredData.reduce((sum, r) => sum + r.volumeReal, 0) / totalViagens : 0;
    
    const mediaAsfalto = totalViagens > 0 ? filteredData.reduce((sum, r) => sum + (r.distanciaAsfalto||0), 0) / totalViagens : 0;
    const mediaTerra = totalViagens > 0 ? filteredData.reduce((sum, r) => sum + (r.distanciaTerra||0), 0) / totalViagens : 0;
    const mediaDistTotal = mediaAsfalto + mediaTerra;

    const validCycles = filteredData.filter(d => d.cicloHoras !== null && d.cicloHoras > 0);
    const somaCiclosTotais = validCycles.reduce((s, d) => s + d.cicloHoras, 0);
    const mediaCiclo = validCycles.length > 0 ? somaCiclosTotais / validCycles.length : 0;
    
    const validFilaCampo = filteredData.filter(d => d.filaCampoHoras !== null && d.filaCampoHoras > 0);
    const mediaFilaCampo = validFilaCampo.length > 0 ? validFilaCampo.reduce((s, d) => s + d.filaCampoHoras, 0) / validFilaCampo.length : 0;

    const validTempoCarregamento = filteredData.filter(d => d.tempoCarregamentoHoras !== null && d.tempoCarregamentoHoras > 0);
    const mediaTempoCarregamento = validTempoCarregamento.length > 0 ? validTempoCarregamento.reduce((s, d) => s + d.tempoCarregamentoHoras, 0) / validTempoCarregamento.length : 0;
    
    const validFilaFabrica = filteredData.filter(d => d.filaFabricaHoras !== null && d.filaFabricaHoras > 0);
    const mediaFilaFabrica = validFilaFabrica.length > 0 ? validFilaFabrica.reduce((s, d) => s + d.filaFabricaHoras, 0) / validFilaFabrica.length : 0;

    const produtividade = somaCiclosTotais > 0 ? (totalPesoTon / somaCiclosTotais) : 0;

    document.getElementById('totalViagens').innerText = totalViagens.toLocaleString('pt-PT');
    document.getElementById('totalPesoLiq').innerText = totalPesoTon.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " t";
    document.getElementById('cargaMediaValue').innerText = cargaMediaTon.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " t";
    document.getElementById('mediaVolumeReal').innerText = mediaVolume.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " m³";
    document.getElementById('mediaDistancia').innerText = mediaDistTotal.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " km";
    document.getElementById('mediaAsfalto').innerText = mediaAsfalto.toLocaleString('pt-PT', {maximumFractionDigits: 1});
    document.getElementById('mediaTerra').innerText = mediaTerra.toLocaleString('pt-PT', {maximumFractionDigits: 1});
    
    document.getElementById('cicloMedio').innerText = formatarHorasMinutos(mediaCiclo);
    document.getElementById('filaCampo').innerText = formatarHorasMinutos(mediaFilaCampo);
    if(document.getElementById('tempoCarregamento')) document.getElementById('tempoCarregamento').innerText = formatarHorasMinutos(mediaTempoCarregamento);
    document.getElementById('filaFabrica').innerText = formatarHorasMinutos(mediaFilaFabrica);
    
    document.getElementById('produtividadeGlobal').innerText = produtividade.toLocaleString('pt-PT', {maximumFractionDigits: 2});

    const somaFilas = filteredData.reduce((s, d) => s + (d.filaCampoHoras || 0) + (d.filaFabricaHoras || 0), 0);
    const taxaOciosidade = somaCiclosTotais > 0 ? (somaFilas / somaCiclosTotais) * 100 : 0;
    document.getElementById('ociosidadeGlobal').innerText = taxaOciosidade.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + '%';

    const mapaPlacas = new Map();
    validCycles.forEach(d => {
        const placaFormatada = (d.placa && d.placa.trim() !== '-' && d.placa.trim() !== '') ? d.placa.trim().toUpperCase() : 'DESCONHECIDA';
        if (placaFormatada === 'DESCONHECIDA') return;
        if (!mapaPlacas.has(placaFormatada)) mapaPlacas.set(placaFormatada, { pesoAcumulado: 0, ciclosAcumulados: 0 });
        const p = mapaPlacas.get(placaFormatada);
        p.pesoAcumulado += d.pesoLiquido;
        p.ciclosAcumulados += d.cicloHoras;
    });

    let melhorPlacaNome = "---", melhorPlacaProdutividade = 0;
    mapaPlacas.forEach((dados, placa) => {
        if (dados.ciclosAcumulados > 0.5) {
            const prod = (dados.pesoAcumulado / 1000) / dados.ciclosAcumulados;
            if (prod > melhorPlacaProdutividade) { melhorPlacaProdutividade = prod; melhorPlacaNome = placa; }
        }
    });
    document.getElementById('bestPlacaValue').innerText = melhorPlacaProdutividade > 0 ? melhorPlacaProdutividade.toLocaleString('pt-PT', {maximumFractionDigits: 1}) : "0.0";
    document.getElementById('bestPlacaName').innerText = `Placa: ${melhorPlacaNome}`;

    const transpCount = new Map();
    const transpCicloSum = new Map();
    const transpCicloCount = new Map();

    filteredData.forEach(d => {
        const nome = d.transportadora || "Outras";
        transpCount.set(nome, (transpCount.get(nome) || 0) + 1);
        if (d.cicloHoras !== null && d.cicloHoras > 0) {
            transpCicloSum.set(nome, (transpCicloSum.get(nome) || 0) + d.cicloHoras);
            transpCicloCount.set(nome, (transpCicloCount.get(nome) || 0) + 1);
        }
    });

    const topParaBarras = Array.from(transpCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const labelsBarras = topParaBarras.map(t => t[0].length > 18 ? t[0].substring(0, 16) + "..." : t[0]);
    const cicloMedioPorTransp = topParaBarras.map(([nome]) => {
        const count = transpCicloCount.get(nome) || 0;
        return count > 0 ? parseFloat((transpCicloSum.get(nome) / count).toFixed(1)) : 0;
    });

    const topParaDonut = Array.from(transpCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const labelsDonut = topParaDonut.map(t => t[0].length > 18 ? t[0].substring(0, 16) + "..." : t[0]);
    const valoresDonut = topParaDonut.map(t => t[1]);

    if (chartCiclo) chartCiclo.destroy();
    if (chartTransp) chartTransp.destroy();

    const ctxCiclo = document.getElementById('cicloChart').getContext('2d');
    let gradientBar = ctxCiclo.createLinearGradient(0, 0, 0, 400);
    gradientBar.addColorStop(0, '#38bdf8'); gradientBar.addColorStop(1, '#0284c7'); 

    chartCiclo = new Chart(ctxCiclo, {
        type: 'bar',
        data: { labels: labelsBarras, datasets: [{ label: 'Ciclo (h)', data: cicloMedioPorTransp, backgroundColor: gradientBar, borderRadius: 6, barPercentage: 0.6 }] },
        options: {
            responsive: true, maintainAspectRatio: true, layout: { padding: { top: 30 } },
            plugins: { legend: { display: false }, datalabels: { color: '#bae6fd', anchor: 'end', align: 'top', font: { weight: 'bold', size: 11 }, formatter: (v) => v > 0 ? formatarHorasMinutos(v) : '-' } },
            scales: { y: { beginAtZero: true }, x: { ticks: { font: { size: 10 } } } }
        }
    });

    const ctxTransp = document.getElementById('transportadorasChart').getContext('2d');
    chartTransp = new Chart(ctxTransp, {
        type: 'doughnut',
        data: { labels: labelsDonut, datasets: [{ data: valoresDonut, backgroundColor: ['#0ea5e9', '#06b6d4', '#6366f1', '#8b5cf6', '#3b82f6'], borderWidth: 2, borderColor: '#1e293b' }] },
        plugins: [centerTextPlugin],
        options: {
            responsive: true, maintainAspectRatio: true, cutout: '70%', layout: { padding: 20 },
            plugins: { legend: { position: 'right', labels: { font: { size: 11, family: "'Inter', sans-serif" } } }, datalabels: { color: '#f8fafc', anchor: 'end', align: 'end', offset: 4, font: { weight: 'bold', size: 12 } } }
        }
    });

    const tbody = document.getElementById('sampleTableBody');
    if(tbody){
        tbody.innerHTML = '';
        [...filteredData].sort((a,b) => parseDateTime(b.dataDaBaseExcel, null) - parseDateTime(a.dataDaBaseExcel, null)).slice(0,10).forEach(r => {
            tbody.insertAdjacentHTML('beforeend', `<tr class="border-b border-slate-800">
                <td class="px-6 py-4 font-mono text-[11px] text-slate-400">${r.dataDaBaseExcel}</td><td class="px-6 py-4 font-mono text-[11px] text-sky-400">${r.movimento}</td>
                <td class="px-6 py-4 text-xs truncate max-w-[150px]">${r.transportadora}</td><td class="px-6 py-4 text-right">${(r.pesoLiquido/1000).toLocaleString('pt-PT', {maximumFractionDigits:1})} t</td>
                <td class="px-6 py-4 text-right text-sky-400 font-bold">${formatarHorasMinutos(r.cicloHoras)}</td></tr>`);
        });
    }
}

async function carregarHistoricoImportacoes() {
    const { data } = await supabaseClient.from('historico_importacoes').select('*').order('id', {ascending: false});
    const tb = document.getElementById('importHistoryBody');
    if(tb && data) {
        tb.innerHTML = '';
        data.forEach(d => tb.insertAdjacentHTML('beforeend', `<tr><td class="px-4 py-2">${d.dataBase}</td><td class="px-4 py-2 text-right text-emerald-400">+${d.qtdViagens}</td><td class="px-4 py-2 text-right text-slate-500">${d.dataLancamento}</td></tr>`));
    }
}

async function loadHistoricoCompleto() {
    const { data } = await supabaseClient.from('historico_viagens').select('*');
    if(data) { fullHistoricoData = data; renderHistoricoTable(); }
}

function renderHistoricoTable() {
    const t = document.getElementById('historicoGeralBody');
    if(t) {
        t.innerHTML = '';
        fullHistoricoData.slice(0,200).forEach(r => t.insertAdjacentHTML('beforeend', `<tr class="border-b border-slate-800">
            <td class="px-6 py-2 text-xs">${r.dataDaBaseExcel}</td><td class="px-6 py-2 text-sky-400 text-xs">${r.movimento}</td>
            <td class="px-6 py-2 text-xs">${r.transportadora}</td><td class="px-6 py-2 font-bold text-emerald-400">${r.placa}</td>
            <td class="px-6 py-2 text-right">${(r.pesoLiquido/1000).toFixed(1)}</td><td class="px-6 py-2 text-right text-slate-400">${r.volumeReal}</td>
            <td class="px-6 py-2 text-right text-sky-300 font-bold">${formatarHorasMinutos(r.cicloHoras)}</td>
            <td class="px-6 py-2 text-right text-amber-400 font-bold">${formatarHorasMinutos(r.filaCampoHoras)}</td>
            <td class="px-6 py-2 text-right text-emerald-400 font-bold">${formatarHorasMinutos(r.tempoCarregamentoHoras)}</td>
            <td class="px-6 py-2 text-right text-rose-400 font-bold">${formatarHorasMinutos(r.filaFabricaHoras)}</td></tr>`));
    }
}

document.getElementById('searchHistorico').addEventListener('input', renderHistoricoTable);

switchView('dashboard');
loadHistoricoCompleto();