// ==========================================
// js/dashboard.js - LÓGICA DO DASHBOARD
// ==========================================
Chart.register(ChartDataLabels);
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
Chart.defaults.font.family = "'Inter', sans-serif";

let fullHistoricoData = [];
let activeQuickFilter = 'ALL';
let chartCiclo = null, chartTransp = null;

const filterTransportadora = document.getElementById('filterTransportadora');
const filterData = document.getElementById('filterData');
const btnQFs = document.querySelectorAll('.btn-qf');

document.addEventListener('DOMContentLoaded', () => {
    setupDashboardFilters();
    loadDashboardDataInit();
});

function setupDashboardFilters() {
    if(filterTransportadora) filterTransportadora.addEventListener('change', () => loadDashboardData());
    if(filterData) filterData.addEventListener('change', () => { setQuickFilterUI('ALL'); loadDashboardData(); });

    btnQFs.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const qf = e.currentTarget.getAttribute('data-qf');
            setQuickFilterUI(qf);
            if (qf !== 'ALL' && filterData) filterData.value = 'ALL';
            loadDashboardData();
        });
    });
}

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

function formatarHorasMinutos(horasDecimais) {
    if (horasDecimais === null || horasDecimais === undefined || isNaN(horasDecimais) || horasDecimais <= 0) return '-';
    const horas = Math.floor(horasDecimais);
    const minutos = Math.round((horasDecimais - horas) * 60);
    if (horas === 0 && minutos === 0) return '0m';
    if (horas === 0) return `${minutos}m`;
    if (minutos === 0) return `${horas}h`;
    return `${horas}h ${minutos.toString().padStart(2, '0')}m`;
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

async function loadDashboardDataInit() {
    const { data } = await supabaseClient.from('historico_viagens').select('*');
    if(data) {
        fullHistoricoData = data;
        loadDashboardData();
    }
}

function loadDashboardData() {
    const storedData = fullHistoricoData;
    if(!storedData.length) return;

    const allTransps = [...new Set(storedData.map(d => d.transportadora))].filter(Boolean).sort();
    const currT = filterTransportadora ? filterTransportadora.value : 'ALL';
    if (filterTransportadora) {
        filterTransportadora.innerHTML = '<option value="ALL">TODAS AS TRANSPORTADORAS</option>';
        allTransps.forEach(t => filterTransportadora.insertAdjacentHTML('beforeend', `<option value="${t}" ${t===currT?'selected':''}>${t}</option>`));
    }

    const allDates = [...new Set(storedData.map(d => d.dataDaBaseExcel))].filter(d => d && d !== 'Desconhecida').sort((a,b)=>{const pA=a.split('/');const pB=b.split('/');return new Date(pA[2],pA[1]-1,pA[0])-new Date(pB[2],pB[1]-1,pB[0]);});
    const currD = filterData ? filterData.value : 'ALL';
    if (filterData) {
        filterData.innerHTML = '<option value="ALL">TODO O PERÍODO</option>';
        allDates.forEach(dt => filterData.insertAdjacentHTML('beforeend', `<option value="${dt}" ${dt===currD?'selected':''}>${dt}</option>`));
    }

    const activeT = filterTransportadora ? filterTransportadora.value : 'ALL';
    const activeD = filterData ? filterData.value : 'ALL';
    
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
    
    const totalVolumeReal = filteredData.reduce((sum, r) => sum + (parseFloat(String(r.volumeReal).replace(',','.')) || 0), 0);
    const mediaVolume = totalViagens > 0 ? totalVolumeReal / totalViagens : 0;
    
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

    // --- PRODUTIVIDADE GLOBAL AGORA USA m³/h ---
    const produtividadeGlobalM3 = somaCiclosTotais > 0 ? (totalVolumeReal / somaCiclosTotais) : 0;

    document.getElementById('totalViagens').innerText = totalViagens.toLocaleString('pt-PT');
    document.getElementById('totalPesoLiq').innerText = totalPesoTon.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " t";
    document.getElementById('mediaVolumeViagem').innerText = mediaVolume.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " m³";
    document.getElementById('totalVolumeReal').innerText = totalVolumeReal.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " m³";
    document.getElementById('mediaDistancia').innerText = mediaDistTotal.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " km";
    document.getElementById('mediaAsfalto').innerText = mediaAsfalto.toLocaleString('pt-PT', {maximumFractionDigits: 1});
    document.getElementById('mediaTerra').innerText = mediaTerra.toLocaleString('pt-PT', {maximumFractionDigits: 1});
    
    document.getElementById('cicloMedio').innerText = formatarHorasMinutos(mediaCiclo);
    document.getElementById('filaCampo').innerText = formatarHorasMinutos(mediaFilaCampo);
    if(document.getElementById('tempoCarregamento')) document.getElementById('tempoCarregamento').innerText = formatarHorasMinutos(mediaTempoCarregamento);
    document.getElementById('filaFabrica').innerText = formatarHorasMinutos(mediaFilaFabrica);
    
    document.getElementById('produtividadeGlobal').innerText = produtividadeGlobalM3.toLocaleString('pt-PT', {maximumFractionDigits: 2});

    const somaFilas = filteredData.reduce((s, d) => s + (d.filaCampoHoras || 0) + (d.filaFabricaHoras || 0), 0);
    const taxaOciosidade = somaCiclosTotais > 0 ? (somaFilas / somaCiclosTotais) * 100 : 0;
    document.getElementById('ociosidadeGlobal').innerText = taxaOciosidade.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + '%';

    // --- CÁLCULO DE CAVALO DESTAQUE EM m³/h ---
    const mapaPlacas = new Map();
    validCycles.forEach(d => {
        const placaFormatada = (d.placa && d.placa.trim() !== '-' && d.placa.trim() !== '') ? d.placa.trim().toUpperCase() : 'DESCONHECIDA';
        if (placaFormatada === 'DESCONHECIDA') return;
        if (!mapaPlacas.has(placaFormatada)) mapaPlacas.set(placaFormatada, { volumeAcumulado: 0, ciclosAcumulados: 0 });
        
        const p = mapaPlacas.get(placaFormatada);
        p.volumeAcumulado += parseFloat(String(d.volumeReal).replace(',','.')) || 0;
        p.ciclosAcumulados += d.cicloHoras;
    });

    let melhorPlacaNome = "---", melhorPlacaProdutividade = 0;
    mapaPlacas.forEach((dados, placa) => {
        if (dados.ciclosAcumulados > 0.5) {
            const prod = dados.volumeAcumulado / dados.ciclosAcumulados;
            if (prod > melhorPlacaProdutividade) { melhorPlacaProdutividade = prod; melhorPlacaNome = placa; }
        }
    });
    
    document.getElementById('bestPlacaValue').innerText = melhorPlacaProdutividade > 0 ? melhorPlacaProdutividade.toLocaleString('pt-PT', {maximumFractionDigits: 1}) : "0.0";
    document.getElementById('bestPlacaName').innerText = `Placa: ${melhorPlacaNome}`;

    // Gráficos e Tabelas secundárias
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

    const ctxCiclo = document.getElementById('cicloChart');
    if(ctxCiclo) {
        const ctxC = ctxCiclo.getContext('2d');
        let gradientBar = ctxC.createLinearGradient(0, 0, 0, 400);
        gradientBar.addColorStop(0, '#38bdf8'); gradientBar.addColorStop(1, '#0284c7'); 

        chartCiclo = new Chart(ctxC, {
            type: 'bar',
            data: { labels: labelsBarras, datasets: [{ label: 'Ciclo (h)', data: cicloMedioPorTransp, backgroundColor: gradientBar, borderRadius: 6, barPercentage: 0.6 }] },
            options: {
                responsive: true, maintainAspectRatio: true, layout: { padding: { top: 30 } },
                plugins: { legend: { display: false }, datalabels: { color: '#bae6fd', anchor: 'end', align: 'top', font: { weight: 'bold', size: 11 }, formatter: (v) => v > 0 ? formatarHorasMinutos(v) : '-' } },
                scales: { y: { beginAtZero: true }, x: { ticks: { font: { size: 10 } } } }
            }
        });
    }

    const ctxTransp = document.getElementById('transportadorasChart');
    if(ctxTransp) {
        const ctxT = ctxTransp.getContext('2d');
        chartTransp = new Chart(ctxT, {
            type: 'doughnut',
            data: { labels: labelsDonut, datasets: [{ data: valoresDonut, backgroundColor: ['#0ea5e9', '#06b6d4', '#6366f1', '#8b5cf6', '#3b82f6'], borderWidth: 2, borderColor: '#1e293b' }] },
            plugins: [centerTextPlugin],
            options: {
                responsive: true, maintainAspectRatio: true, cutout: '70%', layout: { padding: 20 },
                plugins: { legend: { position: 'right', labels: { font: { size: 11, family: "'Inter', sans-serif" } } }, datalabels: { color: '#f8fafc', anchor: 'end', align: 'end', offset: 4, font: { weight: 'bold', size: 12 } } }
            }
        });
    }
}