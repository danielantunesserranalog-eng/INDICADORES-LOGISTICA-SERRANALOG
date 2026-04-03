// SerranaLog Analytics - Main Application Script (Dark Executive Edition)

// Registar o Plugin Datalabels globalmente
Chart.register(ChartDataLabels);

// Configuração Global Chart.js para Dark Mode
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
Chart.defaults.font.family = "'Inter', sans-serif";

let currentWorkbookData = [];
let chartCiclo = null;
let chartTransp = null;

// Elementos do DOM
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const fileInfoDiv = document.getElementById('fileInfo');
const fileNameSpan = document.getElementById('fileNameDisplay');
const errorMsgDiv = document.getElementById('errorMsg');
const loadingSpinner = document.getElementById('loadingSpinner');
const dashboardContainer = document.getElementById('dashboardContainer');

// Elementos de KPI
const totalViagensSpan = document.getElementById('totalViagens');
const totalPesoLiqSpan = document.getElementById('totalPesoLiq');
const cargaMediaSpan = document.getElementById('cargaMediaValue');
const mediaVolumeRealSpan = document.getElementById('mediaVolumeReal');
const mediaDistanciaSpan = document.getElementById('mediaDistancia');
const mediaAsfaltoSpan = document.getElementById('mediaAsfalto');
const mediaTerraSpan = document.getElementById('mediaTerra');
const cicloMedioSpan = document.getElementById('cicloMedio');
const filaCampoSpan = document.getElementById('filaCampo');
const filaFabricaSpan = document.getElementById('filaFabrica');
const totalRegistrosSpan = document.getElementById('totalRegistrosSpan');
const sampleTableBody = document.getElementById('sampleTableBody');

// Novos Elementos Executivos
const produtividadeGlobalSpan = document.getElementById('produtividadeGlobal');
const ociosidadeGlobalSpan = document.getElementById('ociosidadeGlobal');

document.getElementById('currentDateLabel').innerText = new Date().toLocaleDateString('pt-PT');

function showError(msg) {
    errorMsgDiv.innerText = msg;
    errorMsgDiv.classList.remove('hidden');
    setTimeout(() => errorMsgDiv.classList.add('hidden'), 7000);
}
function hideError() { errorMsgDiv.classList.add('hidden'); }

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
    if (!rawData || rawData.length === 0) throw new Error("A folha de cálculo não contém dados válidos.");

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
    const transpKey = findKey(['transportadora', 'nome da transportadora', 'fornecedor']);
    const placaKey = findKey(['placa do cavalo', 'placa cavalo', 'placa']);
    
    const pesoLiqKey = findKey(['peso líquido', 'peso liquido', 'peso_liquido']);
    const volumeKey = findKey(['volume real', 'volume_real']);
    const distAsfaltoKey = findKey(['distancia por asfalto', 'distância por asfalto', 'distancia asfalto']);
    const distTerraKey = findKey(['distancia por terra', 'distância por terra', 'distancia terra']);

    const dtSaidaFabKey = findKey(['data saída fábrica', 'data saida fabrica']);
    const dtChegadaCampoKey = findKey(['data chegada campo']);
    const dtInicioCarregCpoKey = findKey(['dt início carreg cpo', 'dt inicio carreg cpo']);
    const dtEntradaKey = findKey(['data de entrada', 'data entrada']);
    const dtInicioDescarFabKey = findKey(['dt início descar fáb', 'dt inicio descar fab']);

    const hrSaidaFabKey = findKey(['hora saída fábrica', 'hora saida fabrica']);
    const hrChegadaCampoKey = findKey(['hora chegada campo']);
    const hrInicioCarregCpoKey = findKey(['hr início carreg cpo', 'hr inicio carreg cpo']);
    const hrEntradaKey = findKey(['hora de entrada', 'hora entrada']);
    const hrInicioDescarFabKey = findKey(['hr início descar fáb', 'hr inicio descar fab']);

    const mappedData = rawData.map((row, idx) => {
        const getValue = (key) => (key && row[key] !== undefined && row[key] !== "") ? row[key] : null;

        const movimento = getValue(movimentoKey) || `MOV-${idx}`;
        let transportadora = String(getValue(transpKey) || "Não identificada").trim();
        transportadora = transportadora.replace(/\s+(LTDA|Ltda|LTDA\.|S\.A\.|EIRELI)$/i, '').trim();

        return {
            movimento: String(movimento),
            transportadora: transportadora,
            placa: String(getValue(placaKey) || "-").trim(),
            pesoLiquido: parsePtBrNumber(getValue(pesoLiqKey)),
            volumeReal: parsePtBrNumber(getValue(volumeKey)),
            distanciaAsfalto: parsePtBrNumber(getValue(distAsfaltoKey)),
            distanciaTerra: parsePtBrNumber(getValue(distTerraKey)),
            cicloHoras: calcHoursDiff(getValue(dtSaidaFabKey), getValue(hrSaidaFabKey), getValue(dtInicioDescarFabKey), getValue(hrInicioDescarFabKey)),
            filaCampoHoras: calcHoursDiff(getValue(dtChegadaCampoKey), getValue(hrChegadaCampoKey), getValue(dtInicioCarregCpoKey), getValue(hrInicioCarregCpoKey)),
            filaFabricaHoras: calcHoursDiff(getValue(dtEntradaKey), getValue(hrEntradaKey), getValue(dtInicioDescarFabKey), getValue(hrInicioDescarFabKey))
        };
    });

    return mappedData.filter(item => item.pesoLiquido > 0 || item.volumeReal > 0 || item.transportadora !== "Não identificada");
}

// Plugin Customizado para texto no meio do Donut Chart
const centerTextPlugin = {
    id: 'centerText',
    beforeDraw: function(chart) {
        if (chart.config.type !== 'doughnut') return;
        
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        
        // Centro da área desenhável do gráfico (ignorando a legenda)
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;

        // Calcula o total exibido no gráfico
        const total = chart.config.data.datasets[0].data.reduce((a, b) => a + b, 0);

        ctx.restore();
        
        // Valor numérico no centro
        ctx.font = "bold 28px 'Inter', sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#38bdf8"; // Cor sky-400
        const text = total.toString();
        const textX = centerX - (ctx.measureText(text).width / 2);
        ctx.fillText(text, textX, centerY - 8);
        
        // Texto "Viagens" menor em baixo
        ctx.font = "bold 11px 'Inter', sans-serif";
        ctx.fillStyle = "#94a3b8"; // Cor slate-400
        const subText = "VIAGENS";
        const subTextX = centerX - (ctx.measureText(subText).width / 2);
        ctx.fillText(subText, subTextX, centerY + 16);
        
        ctx.save();
    }
};

async function processExcelFile(file) {
    hideError();
    loadingSpinner.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array', cellDates: false, defval: "" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) throw new Error("O ficheiro não contém abas válidas.");

        const parsedRows = parseSheetToData(firstSheet);
        if (parsedRows.length === 0) throw new Error("A folha não tem dados na estrutura correta.");

        currentWorkbookData = parsedRows;

        // Cálculos Macro
        const totalViagens = currentWorkbookData.length;
        const totalPesoKg = currentWorkbookData.reduce((sum, r) => sum + r.pesoLiquido, 0);
        const totalPesoTon = totalPesoKg / 1000;
        
        const cargaMediaTon = totalViagens > 0 ? (totalPesoTon / totalViagens) : 0;
        const mediaVolume = totalViagens > 0 ? currentWorkbookData.reduce((sum, r) => sum + r.volumeReal, 0) / totalViagens : 0;
        
        const mediaAsfalto = totalViagens > 0 ? currentWorkbookData.reduce((sum, r) => sum + r.distanciaAsfalto, 0) / totalViagens : 0;
        const mediaTerra = totalViagens > 0 ? currentWorkbookData.reduce((sum, r) => sum + r.distanciaTerra, 0) / totalViagens : 0;
        const mediaDistTotal = mediaAsfalto + mediaTerra;

        // Cálculos Médios de Tempo e Executivos
        const validCycles = currentWorkbookData.filter(d => d.cicloHoras !== null);
        const somaCiclosTotais = validCycles.reduce((s, d) => s + d.cicloHoras, 0);
        const mediaCiclo = validCycles.length > 0 ? somaCiclosTotais / validCycles.length : 0;

        const validFilaCampo = currentWorkbookData.filter(d => d.filaCampoHoras !== null);
        const mediaFilaCampo = validFilaCampo.length > 0 ? validFilaCampo.reduce((s, d) => s + d.filaCampoHoras, 0) / validFilaCampo.length : 0;

        const validFilaFabrica = currentWorkbookData.filter(d => d.filaFabricaHoras !== null);
        const mediaFilaFabrica = validFilaFabrica.length > 0 ? validFilaFabrica.reduce((s, d) => s + d.filaFabricaHoras, 0) / validFilaFabrica.length : 0;

        const somaTempoFila = validCycles.reduce((s, d) => s + (d.filaCampoHoras || 0) + (d.filaFabricaHoras || 0), 0);
        const produtividade = somaCiclosTotais > 0 ? (totalPesoTon / somaCiclosTotais) : 0;
        const ociosidadePerc = somaCiclosTotais > 0 ? (somaTempoFila / somaCiclosTotais) * 100 : 0;

        // Atualizar Visores de KPI
        totalViagensSpan.innerText = totalViagens;
        totalPesoLiqSpan.innerText = totalPesoTon.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " t";
        cargaMediaSpan.innerText = cargaMediaTon.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " t";
        mediaVolumeRealSpan.innerText = mediaVolume.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " m³";
        
        mediaDistanciaSpan.innerText = mediaDistTotal.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " km";
        mediaAsfaltoSpan.innerText = mediaAsfalto.toLocaleString('pt-PT', {maximumFractionDigits: 1});
        mediaTerraSpan.innerText = mediaTerra.toLocaleString('pt-PT', {maximumFractionDigits: 1});
        
        totalRegistrosSpan.innerText = totalViagens;
        cicloMedioSpan.innerText = mediaCiclo.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " h";
        filaCampoSpan.innerText = mediaFilaCampo.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " h";
        filaFabricaSpan.innerText = mediaFilaFabrica.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + " h";

        produtividadeGlobalSpan.innerText = produtividade.toLocaleString('pt-PT', {maximumFractionDigits: 2});
        ociosidadeGlobalSpan.innerText = ociosidadePerc.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + "%";

        // Geração de Dados para Gráficos
        const transpCount = new Map();
        const transpCicloSum = new Map();
        const transpCicloCount = new Map();

        currentWorkbookData.forEach(d => {
            const nome = d.transportadora;
            transpCount.set(nome, (transpCount.get(nome) || 0) + 1);
            if (d.cicloHoras !== null) {
                transpCicloSum.set(nome, (transpCicloSum.get(nome) || 0) + d.cicloHoras);
                transpCicloCount.set(nome, (transpCicloCount.get(nome) || 0) + 1);
            }
        });

        const topTransportadoras = Array.from(transpCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const transpLabels = topTransportadoras.map(t => t[0].length > 20 ? t[0].substring(0, 18) + "..." : t[0]);
        const transpValues = topTransportadoras.map(t => t[1]);

        const cicloMedioPorTransp = topTransportadoras.map(([nome]) => {
            const count = transpCicloCount.get(nome) || 0;
            return count > 0 ? parseFloat((transpCicloSum.get(nome) / count).toFixed(1)) : 0;
        });

        if (chartCiclo) chartCiclo.destroy();
        if (chartTransp) chartTransp.destroy();

        // Gráfico de Barras - Com Labels no Topo
        const ctxCiclo = document.getElementById('cicloChart').getContext('2d');
        let gradientBar = ctxCiclo.createLinearGradient(0, 0, 0, 400);
        gradientBar.addColorStop(0, '#38bdf8'); 
        gradientBar.addColorStop(1, '#0284c7'); 

        chartCiclo = new Chart(ctxCiclo, {
            type: 'bar',
            data: {
                labels: transpLabels,
                datasets: [{
                    label: 'Ciclo Médio (h)',
                    data: cicloMedioPorTransp,
                    backgroundColor: gradientBar,
                    borderRadius: 6,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true, 
                maintainAspectRatio: true,
                layout: {
                    padding: { top: 30 } // Espaço para a label não cortar
                },
                plugins: { 
                    legend: { display: false },
                    datalabels: {
                        color: '#bae6fd', // Azul clarinho para contraste
                        anchor: 'end',    // Posiciona no fim da barra
                        align: 'top',     // Alinha acima da barra
                        font: { weight: 'bold', size: 12 },
                        formatter: function(value) {
                            return value + ' h';
                        }
                    }
                },
                scales: { y: { beginAtZero: true } }
            }
        });

        // Gráfico Donut - Com Labels Fora e Total no Centro
        const ctxTransp = document.getElementById('transportadorasChart').getContext('2d');
        chartTransp = new Chart(ctxTransp, {
            type: 'doughnut',
            data: {
                labels: transpLabels,
                datasets: [{
                    data: transpValues,
                    backgroundColor: ['#0ea5e9', '#06b6d4', '#6366f1', '#8b5cf6', '#3b82f6'],
                    borderWidth: 2,
                    borderColor: '#1e293b'
                }]
            },
            plugins: [centerTextPlugin], // Adiciona o plugin do texto central
            options: {
                responsive: true, 
                maintainAspectRatio: true, 
                cutout: '70%', // Espessura do anel
                layout: {
                    padding: 20 // Espaço para as labels de fora não cortarem
                },
                plugins: { 
                    legend: { 
                        position: 'right', 
                        labels: { font: { size: 11, family: "'Inter', sans-serif" } } 
                    },
                    datalabels: {
                        color: '#f8fafc',
                        anchor: 'end', // Ancora na borda externa
                        align: 'end',  // Empurra para fora do gráfico
                        offset: 4,     // Distância do anel
                        font: { weight: 'bold', size: 12 },
                        formatter: function(value) {
                            return value; // Mostra apenas o número
                        }
                    }
                }
            }
        });

        // Preencher Tabela Analítica
        sampleTableBody.innerHTML = '';
        const sampleRows = currentWorkbookData.slice(0, 8);
        sampleRows.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-800/80 transition-colors';
            const distTotalRow = row.distanciaAsfalto + row.distanciaTerra;
            tr.innerHTML = `
                <td class="px-6 py-4 font-mono text-xs text-sky-300">${row.movimento.substring(0, 14)}</td>
                <td class="px-6 py-4 font-medium max-w-xs truncate" title="${row.transportadora}">${row.transportadora.substring(0, 30)}</td>
                <td class="px-6 py-4 font-mono text-xs text-slate-400">${row.placa}</td>
                <td class="px-6 py-4 text-right font-semibold">${(row.pesoLiquido / 1000).toLocaleString('pt-PT', {maximumFractionDigits: 1})}</td>
                <td class="px-6 py-4 text-right">${distTotalRow.toLocaleString('pt-PT', {maximumFractionDigits: 1})}</td>
                <td class="px-6 py-4 text-right font-black text-sky-400">${row.cicloHoras !== null ? row.cicloHoras.toLocaleString('pt-PT', {maximumFractionDigits: 1}) + ' h' : '-'}</td>
            `;
            sampleTableBody.appendChild(tr);
        });

        dashboardContainer.classList.remove('hidden');
        dashboardContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
        console.error(err);
        showError("Erro de leitura: " + err.message);
        dashboardContainer.classList.add('hidden');
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

// Controladores de Eventos
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.name.match(/\.(xlsx|xls)$/i)) {
            fileInfoDiv.classList.remove('hidden'); fileNameSpan.innerText = `📄 ${file.name}`;
            processExcelFile(file);
        } else { showError("Formato inválido. Apenas Excel (.xlsx ou .xls)"); }
    }
});

selectFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        const file = e.target.files[0];
        fileInfoDiv.classList.remove('hidden'); fileNameSpan.innerText = `📄 ${file.name}`;
        processExcelFile(file);
    }
});

dropZone.addEventListener('click', (e) => {
    if (e.target === dropZone || (e.target.closest('.upload-zone') && !e.target.closest('#selectFileBtn'))) fileInput.click();
});