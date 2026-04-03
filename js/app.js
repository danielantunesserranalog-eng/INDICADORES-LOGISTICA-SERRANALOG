// SerranaLog Analytics - Database & UI Engine
Chart.register(ChartDataLabels);
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
Chart.defaults.font.family = "'Inter', sans-serif";

// UI Elements
const viewDashboard = document.getElementById('viewDashboard');
const viewLancamento = document.getElementById('viewLancamento');
const btnMenuDashboard = document.getElementById('btnMenuDashboard');
const btnMenuLancamento = document.getElementById('btnMenuLancamento');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const dbStatusLabel = document.getElementById('dbStatusLabel');
const btnLimparBanco = document.getElementById('btnLimparBanco');
const dashboardFilters = document.getElementById('dashboardFilters');
const filterTransportadora = document.getElementById('filterTransportadora');

// Navegação do Menu
function switchView(view) {
    if(view === 'dashboard') {
        viewDashboard.classList.remove('hidden');
        viewLancamento.classList.add('hidden');
        dashboardFilters.classList.remove('hidden');
        dashboardFilters.classList.add('flex'); // Mostra os filtros
        
        btnMenuDashboard.classList.add('active', 'text-sky-400');
        btnMenuDashboard.classList.remove('text-slate-400');
        btnMenuLancamento.classList.remove('active', 'text-sky-400');
        btnMenuLancamento.classList.add('text-slate-400');
        pageTitle.innerText = "Dashboard Analítico";
        pageSubtitle.innerText = "Análise do histórico acumulado de viagens";
        loadDashboardData();
    } else {
        viewLancamento.classList.remove('hidden');
        viewDashboard.classList.add('hidden');
        dashboardFilters.classList.add('hidden');
        dashboardFilters.classList.remove('flex'); // Oculta os filtros
        
        btnMenuLancamento.classList.add('active', 'text-sky-400');
        btnMenuLancamento.classList.remove('text-slate-400');
        btnMenuDashboard.classList.remove('active', 'text-sky-400');
        btnMenuDashboard.classList.add('text-slate-400');
        pageTitle.innerText = "Central de Lançamentos";
        pageSubtitle.innerText = "Importe as bases diárias para alimentar o histórico";
        carregarHistoricoImportacoes(); 
    }
}

btnMenuDashboard.addEventListener('click', () => switchView('dashboard'));
btnMenuLancamento.addEventListener('click', () => switchView('lancamento'));

// Ao mudar a transportadora no dropdown, recarrega o dashboard
filterTransportadora.addEventListener('change', () => loadDashboardData());

let chartCiclo = null;
let chartTransp = null;

// Funções Auxiliares
function parsePtBrNumber(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let str = String(val).trim();
    if (str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(str) || 0;
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

// Plugin de Texto Central para Donut
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

// ==========================================
// CARREGAMENTO HISTÓRICO IMPORTAÇÕES
// ==========================================

async function carregarHistoricoImportacoes() {
    try {
        const { data: historico, error } = await supabase
            .from('historico_importacoes')
            .select('*')
            .order('id', { ascending: false });

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
                    <td class="px-6 py-3 font-semibold text-sky-300"><i class="far fa-calendar-check mr-2"></i> ${log.dataBase}</td>
                    <td class="px-6 py-3 text-right font-bold text-emerald-400">+ ${log.qtdViagens}</td>
                    <td class="px-6 py-3 text-right font-mono text-xs text-slate-500">${log.dataLancamento}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        console.error("Erro ao carregar histórico", e);
    }
}

// ==========================================
// CÁLCULO E RENDERIZAÇÃO DO DASHBOARD
// ==========================================

async function loadDashboardData() {
    try {
        const { data: storedData, error } = await supabase.from('historico_viagens').select('*');
        
        if (error) throw error;
        
        if(!storedData || storedData.length === 0) {
            dbStatusLabel.innerText = "Banco Vazio";
            dbStatusLabel.className = "text-amber-400";
            return;
        }

        const allTransporters = [...new Set(storedData.map(d => d.transportadora))].filter(Boolean).sort();
        const currentSelection = filterTransportadora.value || 'ALL';
        
        filterTransportadora.innerHTML = '<option value="ALL">TODAS AS TRANSPORTADORAS</option>';
        allTransporters.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.innerText = t.toUpperCase();
            if(t === currentSelection) opt.selected = true;
            filterTransportadora.appendChild(opt);
        });

        const activeFilter = filterTransportadora.value;
        const filteredData = activeFilter === 'ALL' 
            ? storedData 
            : storedData.filter(d => d.transportadora === activeFilter);

        if(filteredData.length === 0) {
            dbStatusLabel.innerText = "Sem dados para o filtro";
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
        
        document.getElementById('cicloMedio').innerText = mediaCiclo.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " h";
        document.getElementById('filaCampo').innerText = mediaFilaCampo.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " h";
        document.getElementById('filaFabrica').innerText = mediaFilaFabrica.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " h";

        document.getElementById('produtividadeGlobal').innerText = produtividade.toLocaleString('pt-PT', {maximumFractionDigits: 2});
        document.getElementById('ociosidadeGlobal').innerText = ociosidadePerc.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + "%";

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
                    datalabels: { color: '#bae6fd', anchor: 'end', align: 'top', font: { weight: 'bold', size: 11 }, formatter: (v) => v > 0 ? v + ' h' : '-' }
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
        const ultimosRegistros = [...filteredData].reverse().slice(0, 15);
        
        ultimosRegistros.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-800/80 transition-colors';
            tr.innerHTML = `
                <td class="px-6 py-4 font-mono text-xs text-slate-500">${row.dataLancamento}</td>
                <td class="px-6 py-4 font-mono text-xs text-sky-300">${row.movimento}</td>
                <td class="px-6 py-4 font-medium truncate" title="${row.transportadora}">${row.transportadora.substring(0, 25)}</td>
                <td class="px-6 py-4 text-right font-semibold">${(row.pesoLiquido / 1000).toLocaleString('pt-PT', {maximumFractionDigits: 1})} t</td>
                <td class="px-6 py-4 text-right font-black text-sky-400">${row.cicloHoras !== null ? row.cicloHoras.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + ' h' : '-'}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Erro ao processar Dashboard:", err);
    }
}

// Processo de Upload e Salvar
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

        let dataDaBase = 'Desconhecida';
        const datasEncontradas = newRows.map(r => r.dataDaBaseExcel).filter(d => d && d !== 'Desconhecida');
        if (datasEncontradas.length > 0) {
            dataDaBase = datasEncontradas[0];
        }

        const { data: existingIds, error: selectError } = await supabase.from('historico_viagens').select('movimento');
        if (selectError) throw selectError;
        
        const existingSet = new Set(existingIds ? existingIds.map(e => e.movimento) : []);
        
        let viagensNovas = 0;
        newRows.forEach(item => {
            if(!existingSet.has(item.movimento)) viagensNovas++;
        });

        const { error: upsertError } = await supabase.from('historico_viagens').upsert(newRows);
        if (upsertError) throw upsertError;

        const { error: histError } = await supabase.from('historico_importacoes').insert([{
            "dataBase": dataDaBase,
            "qtdViagens": viagensNovas,
            "dataLancamento": new Date().toLocaleString('pt-PT')
        }]);
        if (histError) throw histError;

        filterTransportadora.value = 'ALL';

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

// Eventos de Upload
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

// Limpar Banco no Supabase
btnLimparBanco.addEventListener('click', async () => {
    if(confirm("ATENÇÃO: Deseja apagar todo o histórico de viagens e importações? Esta ação apagará de vez na NUVEM e não pode ser desfeita.")) {
        
        await supabase.from('historico_viagens').delete().neq('movimento', 'null');
        await supabase.from('historico_importacoes').delete().gt('id', 0);
        
        alert("Histórico da nuvem apagado com sucesso.");
        carregarHistoricoImportacoes();
        loadDashboardData();
    }
});

// Inicialização
switchView('dashboard');