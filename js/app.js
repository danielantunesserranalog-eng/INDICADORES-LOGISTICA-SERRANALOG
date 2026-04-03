// SerranaLog Analytics - Database & UI Engine
Chart.register(ChartDataLabels);
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
Chart.defaults.font.family = "'Inter', sans-serif";

// UI Elements Principais
const viewDashboard = document.getElementById('viewDashboard');
const viewLancamento = document.getElementById('viewLancamento');
const viewHistorico = document.getElementById('viewHistorico');
const viewOperacional = document.getElementById('viewOperacional');

const btnMenuDashboard = document.getElementById('btnMenuDashboard');
const btnMenuLancamento = document.getElementById('btnMenuLancamento');
const btnMenuHistorico = document.getElementById('btnMenuHistorico');
const btnMenuOperacional = document.getElementById('btnMenuOperacional');

const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const dbStatusLabel = document.getElementById('dbStatusLabel');
const btnLimparBanco = document.getElementById('btnLimparBanco');

const lastUpdateIndicator = document.getElementById('lastUpdateIndicator');
const dashboardFilters = document.getElementById('dashboardFilters');
const filterTransportadora = document.getElementById('filterTransportadora');
const filterData = document.getElementById('filterData');

const btnQFs = document.querySelectorAll('.btn-qf');
let activeQuickFilter = 'ALL';

const searchHistorico = document.getElementById('searchHistorico');
const historicoGeralBody = document.getElementById('historicoGeralBody');
const historicoCount = document.getElementById('historicoCount');

// Navegação do Menu
function switchView(view) {
    // 1. Esconder todas as telas e resetar botões
    viewDashboard.classList.add('hidden');
    viewLancamento.classList.add('hidden');
    viewHistorico.classList.add('hidden');
    viewOperacional.classList.add('hidden');
    
    [btnMenuDashboard, btnMenuLancamento, btnMenuHistorico, btnMenuOperacional].forEach(btn => {
        btn.classList.remove('active', 'text-sky-400');
        btn.classList.add('text-slate-400');
    });

    // 2. Mostrar a tela selecionada
    if(view === 'dashboard') {
        viewDashboard.classList.remove('hidden');
        dashboardFilters.classList.remove('hidden');
        dashboardFilters.classList.add('flex');
        
        btnMenuDashboard.classList.add('active', 'text-sky-400');
        btnMenuDashboard.classList.remove('text-slate-400');
        
        pageTitle.innerText = "Dashboard Analítico";
        pageSubtitle.innerText = "Análise do histórico acumulado de viagens";
        loadDashboardData();
        
    } else if (view === 'lancamento') {
        viewLancamento.classList.remove('hidden');
        dashboardFilters.classList.add('hidden');
        dashboardFilters.classList.remove('flex');
        
        btnMenuLancamento.classList.add('active', 'text-sky-400');
        btnMenuLancamento.classList.remove('text-slate-400');
        
        pageTitle.innerText = "Central de Lançamentos";
        pageSubtitle.innerText = "Importe as bases diárias para alimentar o histórico";
        carregarHistoricoImportacoes(); 

    } else if (view === 'historico') {
        viewHistorico.classList.remove('hidden');
        dashboardFilters.classList.add('hidden');
        dashboardFilters.classList.remove('flex');
        
        btnMenuHistorico.classList.add('active', 'text-sky-400');
        btnMenuHistorico.classList.remove('text-slate-400');
        
        pageTitle.innerText = "Histórico de Viagens";
        pageSubtitle.innerText = "Consulte, pesquise e audite todas as viagens salvas no banco de dados";
        loadHistoricoCompleto();

    } else if (view === 'operacional') {
        viewOperacional.classList.remove('hidden');
        dashboardFilters.classList.add('hidden');
        dashboardFilters.classList.remove('flex');
        
        btnMenuOperacional.classList.add('active', 'text-sky-400');
        btnMenuOperacional.classList.remove('text-slate-400');
        
        pageTitle.innerText = "Indicadores Operacionais";
        pageSubtitle.innerText = "Comparativo Programado x Realizado da Base de Dados";
        
        // Dispara a função que está no arquivo isolado (operacional.js)
        if(typeof renderizarTabelaOperacional === 'function') {
            renderizarTabelaOperacional();
        }
    }
}

btnMenuDashboard.addEventListener('click', () => switchView('dashboard'));
btnMenuLancamento.addEventListener('click', () => switchView('lancamento'));
btnMenuHistorico.addEventListener('click', () => switchView('historico'));
btnMenuOperacional.addEventListener('click', () => switchView('operacional'));

// Filtros do Dashboard
filterTransportadora.addEventListener('change', () => loadDashboardData());

filterData.addEventListener('change', () => {
    setQuickFilterUI('ALL');
    loadDashboardData();
});

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
            b.classList.add('active', 'bg-sky-900/50', 'text-sky-400', 'border-sky-800/50', 'shadow-[0_0_10px_rgba(14,165,233,0.2)]');
            b.classList.remove('text-slate-400', 'hover:bg-slate-700/50', 'border-transparent');
        } else {
            b.classList.remove('active', 'bg-sky-900/50', 'text-sky-400', 'border-sky-800/50', 'shadow-[0_0_10px_rgba(14,165,233,0.2)]');
            b.classList.add('text-slate-400', 'hover:bg-slate-700/50', 'border-transparent');
        }
    });
}

searchHistorico.addEventListener('input', () => renderHistoricoTable());

let chartCiclo = null;
let chartTransp = null;

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
    if (dateVal === undefined || dateVal === null || dateVal === "") return null;
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
        seconds = totalSeconds % 60;
    } else if (typeof timeVal === 'string' && timeVal.trim() !== "") {
        const tParts = timeVal.trim().split(':');
        hours = parseInt(tParts[0], 10) || 0;
        minutes = parseInt(tParts[1], 10) || 0;
        seconds = parseInt(tParts[2], 10) || 0;
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
    const distAsfaltoKey = findKey(['distancia por asfalto', 'distância por asfalto', 'distancia asfalto']);
    const distTerraKey = findKey(['distancia por terra', 'distância por terra', 'distancia terra']);
    
    const dtChegadaCampoKey = findKey(['data chegada campo']);
    const dtInicioCarregCpoKey = findKey(['dt início carreg cpo']);
    const dtEntradaKey = findKey(['data de entrada', 'data entrada']);
    const dtInicioDescarFabKey = findKey(['dt início descar fáb']);
    
    const dtSaidaBaseKey = findKey(['data de saída', 'data de saida', 'data saída', 'data saida', 'data saída fábrica', 'data saida fabrica']);
    const hrSaidaFabKey = findKey(['hora saída fábrica', 'hora saida fabrica']);
    const hrChegadaCampoKey = findKey(['hora chegada campo']);
    const hrInicioCarregCpoKey = findKey(['hr início carreg cpo']);
    const hrEntradaKey = findKey(['hora de entrada', 'hora entrada']);
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

async function atualizarIndicadorUltimaImportacao() {
    try {
        if (!lastUpdateIndicator) return;
        const { data, error } = await supabaseClient
            .from('historico_importacoes')
            .select('dataLancamento')
            .order('id', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        lastUpdateIndicator.classList.remove('hidden');

        if (!data || data.length === 0) {
            lastUpdateIndicator.className = "text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-slate-700/50 px-3 py-1 rounded-full bg-slate-800/50 flex items-center";
            lastUpdateIndicator.innerHTML = '<i class="fas fa-clock mr-1"></i> SEM IMPORTAÇÕES';
            return;
        }

        const dataLancamentoStr = data[0].dataLancamento; 
        const hoje = new Date().toLocaleDateString('pt-PT');

        if (dataLancamentoStr.includes(hoje)) {
            const horaApenas = dataLancamentoStr.split(', ')[1] || dataLancamentoStr;
            lastUpdateIndicator.className = "text-[10px] font-bold uppercase tracking-widest text-emerald-400 border border-emerald-800/50 px-3 py-1.5 rounded-full bg-emerald-900/30 flex items-center shadow-[0_0_12px_rgba(52,211,153,0.15)]";
            lastUpdateIndicator.innerHTML = `<i class="fas fa-check-circle mr-1"></i> ATUALIZADO HOJE, ${horaApenas}`;
        } else {
            const dataApenas = dataLancamentoStr.split(', ')[0] || dataLancamentoStr;
            lastUpdateIndicator.className = "text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-slate-700/50 px-3 py-1.5 rounded-full bg-slate-800/50 flex items-center";
            lastUpdateIndicator.innerHTML = `<i class="fas fa-clock mr-1"></i> ATUALIZADO EM: ${dataApenas}`;
        }
    } catch (e) {
        console.error("Erro ao buscar última atualização:", e);
    }
}

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

let fullHistoricoData = []; 

async function loadHistoricoCompleto() {
    try {
        dbStatusLabel.innerText = "Buscando histórico...";
        historicoGeralBody.innerHTML = `<tr><td colspan="9" class="px-6 py-10 text-center text-sky-400 font-bold"><i class="fas fa-spinner fa-spin mr-2"></i> Conectando ao Banco de Dados...</td></tr>`;
        historicoCount.innerText = "Carregando...";
        
        const { data, error } = await supabaseClient.from('historico_viagens').select('*');
        if(error) throw error;
        
        dbStatusLabel.innerText = "Banco Sincronizado";
        dbStatusLabel.className = "text-emerald-400";

        fullHistoricoData = data || [];
        fullHistoricoData.sort((a,b) => {
            const dA = parseDateTime(a.dataDaBaseExcel, null) || new Date(0);
            const dB = parseDateTime(b.dataDaBaseExcel, null) || new Date(0);
            return dB - dA;
        });
        
        renderHistoricoTable();
        atualizarIndicadorUltimaImportacao(); 

    } catch (err) {
        console.error("Erro ao carregar histórico completo", err);
        historicoGeralBody.innerHTML = `<tr><td colspan="9" class="px-6 py-10 text-center text-rose-400 font-bold"><i class="fas fa-exclamation-triangle mr-2"></i> Erro ao carregar dados do Supabase.</td></tr>`;
        dbStatusLabel.innerText = "Erro de Conexão";
        dbStatusLabel.className = "text-rose-400";
    }
}

function renderHistoricoTable() {
    const searchTerm = searchHistorico.value.toLowerCase().trim();
    const filtered = fullHistoricoData.filter(d => {
        if(!searchTerm) return true;
        const transp = (d.transportadora || "").toLowerCase();
        const placa = (d.placa || "").toLowerCase();
        const mov = (d.movimento || "").toLowerCase();
        return transp.includes(searchTerm) || placa.includes(searchTerm) || mov.includes(searchTerm);
    });

    historicoGeralBody.innerHTML = '';
    
    if(filtered.length === 0) {
        historicoGeralBody.innerHTML = `<tr><td colspan="9" class="px-6 py-10 text-center text-slate-500 font-medium">Nenhuma viagem encontrada para a busca "${searchTerm}".</td></tr>`;
        historicoCount.innerText = "0 registros listados";
        return;
    }

    const limit = 500;
    const toRender = filtered.slice(0, limit);

    toRender.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/80 transition-colors border-b border-slate-800/50';
        const formatNumber = (val, dec=1) => val !== null && val !== undefined ? val.toLocaleString('pt-PT', {maximumFractionDigits: dec}) : '-';
        tr.innerHTML = `
            <td class="px-6 py-3 font-mono text-[11px] text-slate-400">${row.dataDaBaseExcel || '-'}</td>
            <td class="px-6 py-3 font-mono text-[11px] text-sky-400 truncate max-w-[120px]" title="${row.movimento}">${row.movimento}</td>
            <td class="px-6 py-3 font-medium text-slate-200 truncate max-w-[150px]" title="${row.transportadora}">${row.transportadora}</td>
            <td class="px-6 py-3 font-bold text-emerald-400 tracking-wider text-[11px]">${row.placa}</td>
            <td class="px-6 py-3 text-right font-semibold text-white">${formatNumber(row.pesoLiquido / 1000)}</td>
            <td class="px-6 py-3 text-right font-semibold text-slate-400">${formatNumber(row.volumeReal)}</td>
            <td class="px-6 py-3 text-right font-black ${row.cicloHoras > 8 ? 'text-rose-400' : 'text-sky-300'}">${formatarHorasMinutos(row.cicloHoras)}</td>
            <td class="px-6 py-3 text-right text-amber-400/80 text-[12px]">${formatarHorasMinutos(row.filaCampoHoras)}</td>
            <td class="px-6 py-3 text-right text-rose-300/80 text-[12px]">${formatarHorasMinutos(row.filaFabricaHoras)}</td>
        `;
        historicoGeralBody.appendChild(tr);
    });

    if(filtered.length > limit) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="9" class="px-6 py-4 text-center text-[11px] text-slate-500 font-bold bg-slate-900/50">Mostrando as primeiras ${limit} de ${filtered.length} viagens. Use a busca no topo para refinar.</td>`;
        historicoGeralBody.appendChild(tr);
    }

    historicoCount.innerText = `${filtered.length} registros encontrados no total.`;
}

async function carregarHistoricoImportacoes() {
    try {
        const { data: historico, error } = await supabaseClient.from('historico_importacoes').select('*').order('id', { ascending: false });
        if (error) throw error;

        const tbody = document.getElementById('importHistoryBody');
        const emptyMsg = document.getElementById('emptyHistoryMsg');

        tbody.innerHTML = '';
        if (!historico || historico.length === 0) {
            emptyMsg.classList.remove('hidden');
        } else {
            emptyMsg.classList.add('hidden');
            historico.forEach(log => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-800/50 transition-colors';
                tr.innerHTML = `
                    <td class="px-6 py-3 font-semibold text-sky-300 max-w-[200px] truncate" title="${log.dataBase}"><i class="far fa-calendar-check mr-2"></i> ${log.dataBase}</td>
                    <td class="px-6 py-3 text-right font-bold text-emerald-400">+ ${log.qtdViagens}</td>
                    <td class="px-6 py-3 text-right font-mono text-xs text-slate-500">${log.dataLancamento}</td>
                `;
                tbody.appendChild(tr);
            });
        }
        atualizarIndicadorUltimaImportacao();
    } catch (e) {
        console.error("Erro ao carregar histórico", e);
    }
}

async function loadDashboardData() {
    try {
        atualizarIndicadorUltimaImportacao(); 
        const { data: storedData, error } = await supabaseClient.from('historico_viagens').select('*');
        if (error) throw error;
        
        if(!storedData || storedData.length === 0) {
            dbStatusLabel.innerText = "Banco Vazio";
            dbStatusLabel.className = "text-amber-400";
            return;
        }

        const allTransporters = [...new Set(storedData.map(d => d.transportadora))].filter(Boolean).sort();
        const currentTranspSelection = filterTransportadora.value || 'ALL';
        
        filterTransportadora.innerHTML = '<option value="ALL">TODAS AS TRANSPORTADORAS</option>';
        allTransporters.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.innerText = t.toUpperCase();
            if(t === currentTranspSelection) opt.selected = true;
            filterTransportadora.appendChild(opt);
        });

        const allDates = [...new Set(storedData.map(d => d.dataDaBaseExcel))].filter(d => d && d !== 'Desconhecida');
        allDates.sort((a, b) => {
            const partsA = a.split('/');
            const partsB = b.split('/');
            if(partsA.length === 3 && partsB.length === 3) {
                return new Date(partsA[2], partsA[1]-1, partsA[0]) - new Date(partsB[2], partsB[1]-1, partsB[0]);
            }
            return 0;
        });

        const currentDataSelection = filterData.value || 'ALL';
        filterData.innerHTML = '<option value="ALL">TODO O PERÍODO</option>';
        allDates.forEach(dt => {
            const opt = document.createElement('option');
            opt.value = dt;
            opt.innerText = dt;
            if(dt === currentDataSelection) opt.selected = true;
            filterData.appendChild(opt);
        });
        
        if(storedData.some(d => d.dataDaBaseExcel === 'Desconhecida')) {
            const opt = document.createElement('option');
            opt.value = 'Desconhecida';
            opt.innerText = 'Datas Desconhecidas';
            if('Desconhecida' === currentDataSelection) opt.selected = true;
            filterData.appendChild(opt);
        }

        const activeTransp = filterTransportadora.value;
        const activeData = filterData.value;
        
        const filteredData = storedData.filter(d => {
            const matchTransp = activeTransp === 'ALL' || d.transportadora === activeTransp;
            let matchData = true;

            if (activeQuickFilter !== 'ALL') {
                const parsedData = parseDateTime(d.dataDaBaseExcel, null);
                if (parsedData) {
                    parsedData.setHours(0, 0, 0, 0);
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    const diffDays = Math.round((hoje - parsedData) / (1000 * 60 * 60 * 24));

                    if (activeQuickFilter === 'D-1') matchData = (diffDays === 1);
                    else if (activeQuickFilter === 'D-2') matchData = (diffDays === 2);
                    else if (activeQuickFilter === 'D-7') matchData = (diffDays >= 0 && diffDays <= 7);
                    else if (activeQuickFilter === 'D-30') matchData = (diffDays >= 0 && diffDays <= 30);
                } else {
                    matchData = false;
                }
            } else {
                matchData = activeData === 'ALL' || d.dataDaBaseExcel === activeData;
            }
            return matchTransp && matchData;
        });

        if(filteredData.length === 0) {
            dbStatusLabel.innerText = "Sem dados para o filtro";
            document.getElementById('totalViagens').innerText = '0';
            document.getElementById('totalPesoLiq').innerText = '0 t';
            document.getElementById('produtividadeGlobal').innerText = '0.0';
            document.getElementById('bestPlacaValue').innerText = '0.0';
            document.getElementById('bestPlacaName').innerText = 'Nenhum cavalo encontrado';
            return;
        }

        dbStatusLabel.innerText = `${filteredData.length} Viagens Analisadas`;
        dbStatusLabel.className = "text-sky-300";

        const totalViagens = filteredData.length;
        const totalPesoKg = filteredData.reduce((sum, r) => sum + r.pesoLiquido, 0);
        const totalPesoTon = totalPesoKg / 1000;
        const cargaMediaTon = totalViagens > 0 ? (totalPesoTon / totalViagens) : 0;
        const mediaVolume = totalViagens > 0 ? filteredData.reduce((sum, r) => sum + r.volumeReal, 0) / totalViagens : 0;
        const mediaAsfalto = totalViagens > 0 ? filteredData.reduce((sum, r) => sum + r.distanciaAsfalto, 0) / totalViagens : 0;
        const mediaTerra = totalViagens > 0 ? filteredData.reduce((sum, r) => sum + r.distanciaTerra, 0) / totalViagens : 0;
        const mediaDistTotal = mediaAsfalto + mediaTerra;

        const validCycles = filteredData.filter(d => d.cicloHoras !== null);
        const somaCiclosTotais = validCycles.reduce((s, d) => s + d.cicloHoras, 0);
        const mediaCiclo = validCycles.length > 0 ? somaCiclosTotais / validCycles.length : 0;

        const validFilaCampo = filteredData.filter(d => d.filaCampoHoras !== null);
        const mediaFilaCampo = validFilaCampo.length > 0 ? validFilaCampo.reduce((s, d) => s + d.filaCampoHoras, 0) / validFilaCampo.length : 0;

        const validFilaFabrica = filteredData.filter(d => d.filaFabricaHoras !== null);
        const mediaFilaFabrica = validFilaFabrica.length > 0 ? validFilaFabrica.reduce((s, d) => s + d.filaFabricaHoras, 0) / validFilaFabrica.length : 0;

        const somaTempoFila = validCycles.reduce((s, d) => s + (d.filaCampoHoras || 0) + (d.filaFabricaHoras || 0), 0);
        const produtividade = somaCiclosTotais > 0 ? (totalPesoTon / somaCiclosTotais) : 0;
        const ociosidadePerc = somaCiclosTotais > 0 ? (somaTempoFila / somaCiclosTotais) * 100 : 0;

        document.getElementById('totalViagens').innerText = totalViagens.toLocaleString('pt-PT');
        document.getElementById('totalPesoLiq').innerText = totalPesoTon.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " t";
        document.getElementById('cargaMediaValue').innerText = cargaMediaTon.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " t";
        document.getElementById('mediaVolumeReal').innerText = mediaVolume.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " m³";
        document.getElementById('mediaDistancia').innerText = mediaDistTotal.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " km";
        document.getElementById('mediaAsfalto').innerText = mediaAsfalto.toLocaleString('pt-PT', {maximumFractionDigits: 1});
        document.getElementById('mediaTerra').innerText = mediaTerra.toLocaleString('pt-PT', {maximumFractionDigits: 1});
        
        document.getElementById('cicloMedio').innerText = formatarHorasMinutos(mediaCiclo);
        document.getElementById('filaCampo').innerText = formatarHorasMinutos(mediaFilaCampo);
        document.getElementById('filaFabrica').innerText = formatarHorasMinutos(mediaFilaFabrica);

        document.getElementById('produtividadeGlobal').innerText = produtividade.toLocaleString('pt-PT', {maximumFractionDigits: 2});
        document.getElementById('ociosidadeGlobal').innerText = ociosidadePerc.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + "%";

        const mapaPlacas = new Map();
        validCycles.forEach(d => {
            const placaFormatada = (d.placa && d.placa.trim() !== '-' && d.placa.trim() !== '') ? d.placa.trim().toUpperCase() : 'DESCONHECIDA';
            if (placaFormatada === 'DESCONHECIDA') return;
            if (!mapaPlacas.has(placaFormatada)) mapaPlacas.set(placaFormatada, { pesoAcumulado: 0, ciclosAcumulados: 0 });
            const p = mapaPlacas.get(placaFormatada);
            p.pesoAcumulado += d.pesoLiquido;
            p.ciclosAcumulados += d.cicloHoras;
        });

        let melhorPlacaNome = "---";
        let melhorPlacaProdutividade = 0;

        mapaPlacas.forEach((dados, placa) => {
            if (dados.ciclosAcumulados > 0.5) {
                const produtividadeDaPlaca = (dados.pesoAcumulado / 1000) / dados.ciclosAcumulados;
                if (produtividadeDaPlaca > melhorPlacaProdutividade) {
                    melhorPlacaProdutividade = produtividadeDaPlaca;
                    melhorPlacaNome = placa;
                }
            }
        });

        document.getElementById('bestPlacaValue').innerText = melhorPlacaProdutividade > 0 ? melhorPlacaProdutividade.toLocaleString('pt-PT', {maximumFractionDigits: 1}) : "0.0";
        document.getElementById('bestPlacaName').innerText = `Placa: ${melhorPlacaNome}`;

        const transpCount = new Map();
        const transpCicloSum = new Map();
        const transpCicloCount = new Map();

        filteredData.forEach(d => {
            const nome = d.transportadora;
            transpCount.set(nome, (transpCount.get(nome) || 0) + 1);
            if (d.cicloHoras !== null) {
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
        gradientBar.addColorStop(0, '#38bdf8'); 
        gradientBar.addColorStop(1, '#0284c7'); 

        chartCiclo = new Chart(ctxCiclo, {
            type: 'bar',
            data: {
                labels: labelsBarras,
                datasets: [{ 
                    label: 'Ciclo (h)', 
                    data: cicloMedioPorTransp, 
                    backgroundColor: gradientBar, 
                    borderRadius: 6, 
                    barPercentage: 0.6 
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: true, layout: { padding: { top: 30 } },
                plugins: { 
                    legend: { display: false },
                    datalabels: { color: '#bae6fd', anchor: 'end', align: 'top', font: { weight: 'bold', size: 11 }, formatter: (v) => v > 0 ? formatarHorasMinutos(v) : '-' }
                },
                scales: { 
                    y: { beginAtZero: true },
                    x: { ticks: { font: { size: 10 } } }
                }
            }
        });

        const ctxTransp = document.getElementById('transportadorasChart').getContext('2d');
        chartTransp = new Chart(ctxTransp, {
            type: 'doughnut',
            data: {
                labels: labelsDonut,
                datasets: [{ 
                    data: valoresDonut, 
                    backgroundColor: ['#0ea5e9', '#06b6d4', '#6366f1', '#8b5cf6', '#3b82f6'], 
                    borderWidth: 2, 
                    borderColor: '#1e293b' 
                }]
            },
            plugins: [centerTextPlugin],
            options: {
                responsive: true, maintainAspectRatio: true, cutout: '70%', layout: { padding: 20 },
                plugins: { 
                    legend: { position: 'right', labels: { font: { size: 11, family: "'Inter', sans-serif" } } },
                    datalabels: { color: '#f8fafc', anchor: 'end', align: 'end', offset: 4, font: { weight: 'bold', size: 12 } }
                }
            }
        });

        const tbody = document.getElementById('sampleTableBody');
        tbody.innerHTML = '';
        
        const ultimosRegistros = [...filteredData].sort((a,b) => {
            const dA = parseDateTime(a.dataDaBaseExcel, null) || new Date(0);
            const dB = parseDateTime(b.dataDaBaseExcel, null) || new Date(0);
            return dB - dA;
        }).slice(0, 15);
        
        ultimosRegistros.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-800/80 transition-colors';
            tr.innerHTML = `
                <td class="px-6 py-4 font-mono text-xs text-slate-500">${row.dataDaBaseExcel}</td>
                <td class="px-6 py-4 font-mono text-xs text-sky-300">${row.movimento}</td>
                <td class="px-6 py-4 font-medium truncate" title="${row.transportadora}">${row.transportadora.substring(0, 25)}</td>
                <td class="px-6 py-4 text-right font-semibold">${(row.pesoLiquido / 1000).toLocaleString('pt-PT', {maximumFractionDigits: 1})} t</td>
                <td class="px-6 py-4 text-right font-black text-sky-400">${formatarHorasMinutos(row.cicloHoras)}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Erro ao processar Dashboard:", err);
    }
}

async function processAndSaveFile(file) {
    const errorMsgDiv = document.getElementById('errorMsg');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    errorMsgDiv.classList.add('hidden');
    loadingSpinner.classList.remove('hidden');
    loadingSpinner.classList.add('flex');

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const newRows = parseSheetToData(firstSheet);

        let strHistoricoDatas = 'Desconhecida';
        const datasEncontradas = [...new Set(newRows.map(r => r.dataDaBaseExcel).filter(d => d && d !== 'Desconhecida'))];
        
        if (datasEncontradas.length > 0) {
            datasEncontradas.sort((a, b) => {
                const partsA = a.split('/');
                const partsB = b.split('/');
                if(partsA.length === 3 && partsB.length === 3) {
                    return new Date(partsA[2], partsA[1]-1, partsA[0]) - new Date(partsB[2], partsB[1]-1, partsB[0]);
                }
                return 0;
            });
            
            if (datasEncontradas.length === 1) {
                strHistoricoDatas = datasEncontradas[0];
            } else if (datasEncontradas.length <= 3) {
                strHistoricoDatas = datasEncontradas.join(', ');
            } else {
                strHistoricoDatas = `${datasEncontradas[0]} a ${datasEncontradas[datasEncontradas.length - 1]} (${datasEncontradas.length} dias)`; 
            }
        }

        const { data: existingIds, error: selectError } = await supabaseClient.from('historico_viagens').select('movimento');
        if (selectError) throw selectError;
        
        const existingSet = new Set(existingIds ? existingIds.map(e => e.movimento) : []);
        
        let viagensNovas = 0;
        newRows.forEach(item => {
            if(!existingSet.has(item.movimento)) viagensNovas++;
        });

        const { error: upsertError } = await supabaseClient.from('historico_viagens').upsert(newRows);
        if (upsertError) throw upsertError;

        const { error: histError } = await supabaseClient.from('historico_importacoes').insert([{
            "dataBase": strHistoricoDatas,
            "qtdViagens": viagensNovas,
            "dataLancamento": new Date().toLocaleString('pt-PT')
        }]);
        if (histError) throw histError;

        filterTransportadora.value = 'ALL';
        filterData.value = 'ALL';
        setQuickFilterUI('ALL');

        alert(`Sucesso! Foram processadas ${newRows.length} viagens. (${viagensNovas} novas viagens salvas na nuvem).`);
        switchView('dashboard');
        
    } catch (err) {
        console.error(err);
        errorMsgDiv.innerText = "Erro ao processar arquivo: " + err.message;
        errorMsgDiv.classList.remove('hidden');
    } finally {
        loadingSpinner.classList.add('hidden');
        loadingSpinner.classList.remove('flex');
    }
}

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-sky-400', 'bg-sky-900/20'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-sky-400', 'bg-sky-900/20'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-sky-400', 'bg-sky-900/20');
    if (e.dataTransfer.files.length > 0) processAndSaveFile(e.dataTransfer.files[0]);
});
selectFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) processAndSaveFile(e.target.files[0]);
});

btnLimparBanco.addEventListener('click', async () => {
    if(confirm("ATENÇÃO: Deseja apagar todo o histórico de viagens e importações? Esta ação apagará de vez na NUVEM e não pode ser desfeita.")) {
        await supabaseClient.from('historico_viagens').delete().neq('movimento', 'null');
        await supabaseClient.from('historico_importacoes').delete().gt('id', 0);
        alert("Histórico da nuvem apagado com sucesso.");
        carregarHistoricoImportacoes();
        loadDashboardData();
        if(!viewHistorico.classList.contains('hidden')) loadHistoricoCompleto();
    }
});

// Inicialização
switchView('dashboard');