// SerranaLog Analytics - Central Engine
Chart.register(ChartDataLabels);
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
Chart.defaults.font.family = "'Inter', sans-serif";

const viewDashboard = document.getElementById('viewDashboard');
const viewOperacional = document.getElementById('viewOperacional');
const viewHistorico = document.getElementById('viewHistorico');
const viewConfiguracoes = document.getElementById('viewConfiguracoes'); // NOVO

const btnMenuDashboard = document.getElementById('btnMenuDashboard');
const btnMenuOperacional = document.getElementById('btnMenuOperacional');
const btnMenuHistorico = document.getElementById('btnMenuHistorico');
const btnMenuConfiguracoes = document.getElementById('btnMenuConfiguracoes'); // NOVO

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
    viewHistorico.classList.add('hidden');
    viewConfiguracoes.classList.add('hidden');
    
    [btnMenuDashboard, btnMenuOperacional, btnMenuHistorico, btnMenuConfiguracoes].forEach(btn => {
        btn.classList.remove('active', 'text-sky-400');
        btn.classList.add('text-slate-400');
    });

    if(view === 'dashboard') {
        viewDashboard.classList.remove('hidden');
        dashboardFilters.classList.remove('hidden'); dashboardFilters.classList.add('flex');
        btnMenuDashboard.classList.add('active', 'text-sky-400'); btnMenuDashboard.classList.remove('text-slate-400');
        pageTitle.innerText = "Dashboard Analítico";
        pageSubtitle.innerText = "Análise do histórico acumulado de viagens";
        loadDashboardData();
        
    } else if (view === 'operacional') {
        viewOperacional.classList.remove('hidden');
        dashboardFilters.classList.add('hidden'); dashboardFilters.classList.remove('flex');
        btnMenuOperacional.classList.add('active', 'text-sky-400'); btnMenuOperacional.classList.remove('text-slate-400');
        pageTitle.innerText = "Indicadores Operacionais";
        pageSubtitle.innerText = "Painel Executivo: Realizado vs Meta Global";
        if(typeof renderizarTabelaOperacional === 'function') renderizarTabelaOperacional();

    } else if (view === 'historico') {
        viewHistorico.classList.remove('hidden');
        dashboardFilters.classList.add('hidden'); dashboardFilters.classList.remove('flex');
        btnMenuHistorico.classList.add('active', 'text-sky-400'); btnMenuHistorico.classList.remove('text-slate-400');
        pageTitle.innerText = "Histórico de Viagens";
        pageSubtitle.innerText = "Consulte, pesquise e audite a base de dados";
        loadHistoricoCompleto();

    } else if (view === 'configuracoes') {
        viewConfiguracoes.classList.remove('hidden');
        dashboardFilters.classList.add('hidden'); dashboardFilters.classList.remove('flex');
        btnMenuConfiguracoes.classList.add('active', 'text-sky-400'); btnMenuConfiguracoes.classList.remove('text-slate-400');
        pageTitle.innerText = "Configurações da Torre";
        pageSubtitle.innerText = "Gerenciamento de Metas Globais e Base de Dados";
        carregarHistoricoImportacoes(); 
        carregarMetasGlobais(); // Preenche os inputs da aba config
    }
}

btnMenuDashboard.addEventListener('click', () => switchView('dashboard'));
btnMenuOperacional.addEventListener('click', () => switchView('operacional'));
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
    if (horasDecimais === null || horasDecimais === undefined || isNaN(horasDecimais)) return '-';
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
function calcHoursDiff(dtStart, hrStart, dtEnd, hrEnd) {
    const start = parseDateTime(dtStart, hrStart);
    const end = parseDateTime(dtEnd, hrEnd);
    if (start && end && !isNaN(start) && !isNaN(end)) {
        let diffHours = (end - start) / (1000 * 3600);
        if (diffHours >= 0 && diffHours <= 120) return diffHours;
    }
    return null;
}
function normalizeStr(str) {
    if (!str) return "";
    return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
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
    const pesoLiqKey = findKey(['peso líquido', 'peso liquido']);
    const volumeKey = findKey(['volume real', 'volume_real']);
    const distAsfaltoKey = findKey(['distancia por asfalto']);
    const distTerraKey = findKey(['distancia por terra']);
    
    const dtChegadaCampoKey = findKey(['data chegada campo']);
    const dtInicioCarregCpoKey = findKey(['dt início carreg cpo']);
    const dtEntradaKey = findKey(['data de entrada', 'data entrada']);
    const dtInicioDescarFabKey = findKey(['dt início descar fáb']);
    
    const dtSaidaBaseKey = findKey(['data de saída', 'data saída', 'data saída fábrica']);
    const hrSaidaFabKey = findKey(['hora saída fábrica']);
    const hrChegadaCampoKey = findKey(['hora chegada campo']);
    const hrInicioCarregCpoKey = findKey(['hr início carreg cpo']);
    const hrEntradaKey = findKey(['hora de entrada']);
    const hrInicioDescarFabKey = findKey(['hr início descar fáb']);

    const today = new Date().toLocaleDateString('pt-PT');

    const mappedData = rawData.map((row, idx) => {
        const getValue = (key) => (key && row[key] !== undefined && row[key] !== "") ? row[key] : null;

        const movimento = getValue(movimentoKey) || `MOV-GEN-${Date.now()}-${idx}`;
        let transportadora = String(getValue(transpKey) || "Não identificada").trim().replace(/\s+(LTDA|Ltda|LTDA\.|S\.A\.|EIRELI)$/i, '').trim();
        if(!transportadora) transportadora = "Outras";

        const rawDtSaida = getValue(dtSaidaBaseKey);
        let strDataBase = 'Desconhecida';
        if (rawDtSaida) {
            const parsed = parseDateTime(rawDtSaida, null);
            if (parsed) strDataBase = parsed.toLocaleDateString('pt-PT');
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
            cicloHoras: calcHoursDiff(getValue(dtSaidaBaseKey), getValue(hrSaidaFabKey), getValue(dtInicioDescarFabKey), getValue(hrInicioDescarFabKey)),
            filaCampoHoras: calcHoursDiff(getValue(dtChegadaCampoKey), getValue(hrChegadaCampoKey), getValue(dtInicioCarregCpoKey), getValue(hrInicioCarregCpoKey)),
            filaFabricaHoras: calcHoursDiff(getValue(dtEntradaKey), getValue(hrEntradaKey), getValue(dtInicioDescarFabKey), getValue(hrInicioDescarFabKey))
        };
    });

    return mappedData.filter(item => item.pesoLiquido > 0 || item.volumeReal > 0);
}

// IMPORTAÇÃO E BD
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

document.getElementById('btnLimparBanco').addEventListener('click', async () => {
    if(confirm("ATENÇÃO: Deseja apagar todo o histórico do banco de dados na nuvem?")) {
        await supabaseClient.from('historico_viagens').delete().neq('movimento', 'null');
        await supabaseClient.from('historico_importacoes').delete().gt('id', 0);
        alert("Histórico apagado com sucesso.");
        carregarHistoricoImportacoes();
        fullHistoricoData = [];
    }
});

// FUNÇÕES DA TELA CONFIGURAÇÕES (Metas Globais)
async function carregarMetasGlobais() {
    try {
        const { data, error } = await supabaseClient.from('metas_globais').select('*').eq('id', 1).single();
        if (data) {
            document.getElementById('cfg_v_prog').value = data.v_prog || '';
            document.getElementById('cfg_vol_prog').value = data.vol_prog || '';
            document.getElementById('cfg_cx_prog').value = data.cx_prog || '';
            document.getElementById('cfg_pbtc').value = data.pbtc_prog || '';
            // Atualiza o localStorage local como backup
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

// --- DASHBOARD ANALÍTICO ---
let chartCiclo = null, chartTransp = null;
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

    document.getElementById('totalViagens').innerText = filteredData.length.toLocaleString('pt-PT');
    document.getElementById('dbStatusLabel').innerText = `${filteredData.length} Viagens`;
    
    const totPeso = filteredData.reduce((s, r) => s + r.pesoLiquido, 0) / 1000;
    document.getElementById('totalPesoLiq').innerText = totPeso.toLocaleString('pt-PT', {maximumFractionDigits:1}) + " t";
    
    const validC = filteredData.filter(d => d.cicloHoras !== null);
    const somaCiclos = validC.reduce((s,d) => s + d.cicloHoras, 0);
    const mCiclo = validC.length > 0 ? somaCiclos / validC.length : 0;
    document.getElementById('cicloMedio').innerText = formatarHorasMinutos(mCiclo);

    // Carrega tabelinha de baixo
    const tbody = document.getElementById('sampleTableBody');
    if(tbody){
        tbody.innerHTML = '';
        [...filteredData].sort((a,b) => parseDateTime(b.dataDaBaseExcel, null) - parseDateTime(a.dataDaBaseExcel, null)).slice(0,10).forEach(r => {
            tbody.insertAdjacentHTML('beforeend', `<tr class="border-b border-slate-800">
                <td class="px-6 py-4">${r.dataDaBaseExcel}</td><td class="px-6 py-4 text-sky-400">${r.movimento}</td>
                <td class="px-6 py-4">${r.transportadora}</td><td class="px-6 py-4 text-right">${(r.pesoLiquido/1000).toFixed(1)}</td>
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
            <td class="px-6 py-2 text-right text-sky-300">${formatarHorasMinutos(r.cicloHoras)}</td>
            <td class="px-6 py-2 text-right text-amber-400">${formatarHorasMinutos(r.filaCampoHoras)}</td>
            <td class="px-6 py-2 text-right text-rose-400">${formatarHorasMinutos(r.filaFabricaHoras)}</td></tr>`));
    }
}

document.getElementById('searchHistorico').addEventListener('input', renderHistoricoTable);

// Inicializa Dashboard no load
switchView('dashboard');
loadHistoricoCompleto();