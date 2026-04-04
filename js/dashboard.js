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
        document.getElementById('dbStatusLabel').innerText = "Sem dados";
        document.getElementById('totalViagens').innerText = '0';
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
    document.getElementById('mediaDistancia').innerText = (mediaAsfalto + mediaTerra).toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " km";
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

    // Best Placa
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

    // Gráficos
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
            plugins: { legend: { display: false }, datalabels: { color: '#bae6fd', anchor: 'end', align: 'top', font: { weight: 'bold', size: 11 }, formatter: (v) => v > 0 ? formatarHorasMinutos(v) : '-' } }
        }
    });

    const ctxTransp = document.getElementById('transportadorasChart').getContext('2d');
    chartTransp = new Chart(ctxTransp, {
        type: 'doughnut',
        data: { labels: labelsDonut, datasets: [{ data: valoresDonut, backgroundColor: ['#0ea5e9', '#06b6d4', '#6366f1', '#8b5cf6', '#3b82f6'], borderWidth: 2, borderColor: '#1e293b' }] },
        plugins: [centerTextPlugin],
        options: { responsive: true, maintainAspectRatio: true, cutout: '70%', layout: { padding: 20 }, plugins: { legend: { position: 'right' }, datalabels: { color: '#f8fafc', font: { weight: 'bold', size: 12 } } } }
    });
}

// Inicializa a tela
loadDashboardData();