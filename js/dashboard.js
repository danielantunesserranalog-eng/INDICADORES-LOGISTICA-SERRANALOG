// ==========================================
// js/dashboard.js - LÓGICA DO DASHBOARD
// ==========================================
Chart.register(ChartDataLabels);
Chart.defaults.color = '#94a3b8'; Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)'; Chart.defaults.font.family = "'Inter', sans-serif";

let fullHistoricoData = []; 
let filteredDataGlobal = [];
let activeQuickFilter = 'ALL';
let chartCiclo = null, chartTransp = null;

const filterTransportadora = document.getElementById('filterTransportadora');
const filterPlaca = document.getElementById('filterPlaca');
const filterData = document.getElementById('filterData');
const btnQFs = document.querySelectorAll('.btn-qf');

filterTransportadora.addEventListener('change', () => loadDashboardData());
filterPlaca.addEventListener('change', () => loadDashboardData());
filterData.addEventListener('change', () => { setQuickFilterUI('ALL'); loadDashboardData(); updateClima(); });

btnQFs.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const qf = e.currentTarget.getAttribute('data-qf');
        setQuickFilterUI(qf);
        if (qf !== 'ALL') filterData.value = 'ALL';
        loadDashboardData();
        updateClima();
    });
});

// EXPORTAÇÃO EXCEL (SheetJS)
document.getElementById('btnExportar').addEventListener('click', () => {
    if (filteredDataGlobal.length === 0) return alert("Nenhum dado para exportar.");
    const ws = XLSX.utils.json_to_sheet(filteredDataGlobal.map(d => ({
        "Data Base": d.dataDaBaseExcel, "Movimento": d.movimento, "Transportadora": d.transportadora,
        "Placa": d.placa, "Peso (t)": d.pesoLiquido/1000, "Volume (m3)": d.volumeReal,
        "Ciclo (h)": d.cicloHoras, "Fila Cpo (h)": d.filaCampoHoras, "Fila Fab (h)": d.filaFabricaHoras,
        "Distância Total (km)": (d.distanciaAsfalto||0) + (d.distanciaTerra||0)
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Viagens Filtradas");
    XLSX.writeFile(wb, `SerranaLog_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
});

// MOCK DE INTEGRAÇÃO COM CLIMA
function updateClima() {
    const icone = document.getElementById('iconeClima');
    const texto = document.getElementById('textoClima');
    // Simula uma API de clima baseada no filtro selecionado para justificar filas
    if(activeQuickFilter === 'D-1' || activeQuickFilter === 'D-2') {
        icone.className = "fas fa-cloud-showers-heavy text-2xl text-blue-400";
        texto.innerText = "22°C - Chuva Moderada"; 
    } else {
        icone.className = "fas fa-sun text-2xl text-amber-400";
        texto.innerText = "30°C - Tempo Seco";
    }
}

function setQuickFilterUI(qf) {
    activeQuickFilter = qf;
    btnQFs.forEach(b => {
        if (b.getAttribute('data-qf') === qf) { b.classList.add('active', 'bg-sky-900/50', 'text-sky-400'); b.classList.remove('text-slate-400'); } 
        else { b.classList.remove('active', 'bg-sky-900/50', 'text-sky-400'); b.classList.add('text-slate-400'); }
    });
}

async function loadDashboardData() {
    if(fullHistoricoData.length === 0) {
        const { data } = await supabaseClient.from('historico_viagens').select('*');
        if(data) fullHistoricoData = data;
    }
    const storedData = fullHistoricoData;
    if(!storedData.length) return;

    // Popula Filtros apenas na inicialização ou se estiver ALL
    if (filterTransportadora.options.length <= 1) {
        const allTransps = [...new Set(storedData.map(d => d.transportadora))].filter(Boolean).sort();
        allTransps.forEach(t => filterTransportadora.insertAdjacentHTML('beforeend', `<option value="${t}">${t}</option>`));
        
        const allPlacas = [...new Set(storedData.map(d => d.placa))].filter(p => p && p !== '-').sort();
        allPlacas.forEach(p => filterPlaca.insertAdjacentHTML('beforeend', `<option value="${p}">${p}</option>`));

        const allDates = [...new Set(storedData.map(d => d.dataDaBaseExcel))].filter(d => d && d !== 'Desconhecida');
        allDates.forEach(dt => filterData.insertAdjacentHTML('beforeend', `<option value="${dt}">${dt}</option>`));
    }

    const activeT = filterTransportadora.value;
    const activeP = filterPlaca.value;
    const activeD = filterData.value;
    
    // FILTROS CRUZADOS AVANÇADOS
    const filteredData = storedData.filter(d => {
        const mTransp = activeT === 'ALL' || d.transportadora === activeT;
        const mPlaca = activeP === 'ALL' || d.placa === activeP;
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
        return mTransp && mPlaca && mData;
    });

    filteredDataGlobal = filteredData;
    
    if (filteredData.length === 0) { document.getElementById('dbStatusLabel').innerText = "Sem dados"; return; }

    document.getElementById('dbStatusLabel').innerText = `${filteredData.length} Viagens Filtradas`;
    
    // VARIÁVEIS OPERACIONAIS
    const totalViagens = filteredData.length;
    const totalPesoKg = filteredData.reduce((sum, r) => sum + r.pesoLiquido, 0);
    const totalPesoTon = totalPesoKg / 1000;
    const cargaMediaTon = totalViagens > 0 ? (totalPesoTon / totalViagens) : 0;
    const mediaAsfalto = totalViagens > 0 ? filteredData.reduce((sum, r) => sum + (r.distanciaAsfalto||0), 0) : 0;
    const mediaTerra = totalViagens > 0 ? filteredData.reduce((sum, r) => sum + (r.distanciaTerra||0), 0) : 0;
    const distTotal = mediaAsfalto + mediaTerra;

    // GESTÃO DE CUSTOS E EFICIÊNCIA
    const finStr = localStorage.getItem('cfg_financeiro');
    let precoDiesel = 5.80, consumoKm = 2.0, receitaTon = 45.00;
    if(finStr) { const fin = JSON.parse(finStr); precoDiesel = fin.precoDiesel||5.8; consumoKm = fin.consumoKm||2; receitaTon = fin.receitaTon||45; }

    const litrosGastos = consumoKm > 0 ? (distTotal / consumoKm) : 0;
    const custoDiesel = litrosGastos * precoDiesel;
    const custoPorTon = totalPesoTon > 0 ? (custoDiesel / totalPesoTon) : 0;
    const receitaTotalCalc = totalPesoTon * receitaTon;

    document.getElementById('custoDieselTotal').innerText = `R$ ${custoDiesel.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('custoPorTon').innerHTML = `R$ ${custoPorTon.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span class="text-sm font-normal text-slate-400">/ton</span>`;
    document.getElementById('receitaTotal').innerText = `R$ ${receitaTotalCalc.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    // Atualiza HTML
    document.getElementById('totalViagens').innerText = totalViagens.toLocaleString('pt-PT');
    document.getElementById('totalPesoLiq').innerText = totalPesoTon.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " t";
    document.getElementById('cargaMediaValue').innerText = cargaMediaTon.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " t";
    
    // Ociosidade e Produtividade
    const validCycles = filteredData.filter(d => d.cicloHoras !== null && d.cicloHoras > 0);
    const somaCiclosTotais = validCycles.reduce((s, d) => s + d.cicloHoras, 0);
    const somaFilas = filteredData.reduce((s, d) => s + (d.filaCampoHoras || 0) + (d.filaFabricaHoras || 0), 0);
    
    document.getElementById('produtividadeGlobal').innerText = (somaCiclosTotais > 0 ? (totalPesoTon / somaCiclosTotais) : 0).toLocaleString('pt-PT', {maximumFractionDigits: 2}) + " t/h";
    document.getElementById('ociosidadeGlobal').innerText = (somaCiclosTotais > 0 ? (somaFilas / somaCiclosTotais) * 100 : 0).toLocaleString('pt-PT', {maximumFractionDigits: 1}) + '%';

    // Gráficos (Mantidos)
    const transpCount = new Map();
    const transpCicloSum = new Map();
    const transpCicloCount = new Map();
    filteredData.forEach(d => {
        const nome = d.transportadora || "Outras";
        transpCount.set(nome, (transpCount.get(nome) || 0) + 1);
        if (d.cicloHoras > 0) { transpCicloSum.set(nome, (transpCicloSum.get(nome) || 0) + d.cicloHoras); transpCicloCount.set(nome, (transpCicloCount.get(nome) || 0) + 1); }
    });

    const topParaBarras = Array.from(transpCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (chartCiclo) chartCiclo.destroy();
    chartCiclo = new Chart(document.getElementById('cicloChart').getContext('2d'), {
        type: 'bar',
        data: { labels: topParaBarras.map(t=>t[0].substring(0,10)), datasets: [{ label: 'Ciclo(h)', data: topParaBarras.map(t => (transpCicloSum.get(t[0]) / (transpCicloCount.get(t[0])||1)).toFixed(1)), backgroundColor: '#38bdf8' }] },
        options: { plugins: { legend: { display: false } } }
    });

    const topParaDonut = Array.from(transpCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (chartTransp) chartTransp.destroy();
    chartTransp = new Chart(document.getElementById('transportadorasChart').getContext('2d'), {
        type: 'doughnut',
        data: { labels: topParaDonut.map(t=>t[0].substring(0,10)), datasets: [{ data: topParaDonut.map(t=>t[1]), backgroundColor: ['#0ea5e9','#06b6d4','#6366f1','#8b5cf6','#3b82f6'], borderWidth: 0 }] },
        options: { plugins: { legend: { position: 'right' } } }
    });
}
loadDashboardData();