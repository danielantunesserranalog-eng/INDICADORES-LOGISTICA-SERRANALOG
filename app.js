// SerranaLog Analytics - Main Application Script

// Global variables
let currentWorkbookData = [];
let chartCiclo = null;
let chartTransp = null;

// DOM elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const fileInfoDiv = document.getElementById('fileInfo');
const fileNameSpan = document.getElementById('fileNameDisplay');
const errorMsgDiv = document.getElementById('errorMsg');
const loadingSpinner = document.getElementById('loadingSpinner');
const dashboardContainer = document.getElementById('dashboardContainer');

// KPI elements
const totalViagensSpan = document.getElementById('totalViagens');
const totalPesoLiqSpan = document.getElementById('totalPesoLiq');
const cargaMediaSpan = document.getElementById('cargaMediaValue');
const mediaVolumeRealSpan = document.getElementById('mediaVolumeReal');
const mediaDistanciaSpan = document.getElementById('mediaDistancia');
const cicloMedioSpan = document.getElementById('cicloMedio');
const filaCampoSpan = document.getElementById('filaCampo');
const filaFabricaSpan = document.getElementById('filaFabrica');
const totalRegistrosSpan = document.getElementById('totalRegistrosSpan');
const sampleTableBody = document.getElementById('sampleTableBody');

// Set current date
document.getElementById('currentDateLabel').innerText = new Date().toLocaleDateString('pt-BR');

// Helper: show error message
function showError(msg) {
    errorMsgDiv.innerText = msg;
    errorMsgDiv.classList.remove('hidden');
    setTimeout(() => errorMsgDiv.classList.add('hidden'), 6000);
}

function hideError() {
    errorMsgDiv.classList.add('hidden');
}

// Helper: Parse Date and Time combinations, handling Excel specific serial numbers
function parseDateTime(dateVal, timeVal) {
    if (dateVal === undefined || dateVal === null || dateVal === "") return null;

    let baseDate = null;
    
    // Parse Date
    if (typeof dateVal === 'number') {
        const dateCode = XLSX.SSF.parse_date_code(dateVal);
        if (dateCode) {
            baseDate = new Date(dateCode.y, dateCode.m - 1, dateCode.d);
        }
    } else if (typeof dateVal === 'string') {
        if (dateVal.includes('/')) {
            const parts = dateVal.split(' ')[0].split('/');
            if(parts.length === 3) {
                // assume DD/MM/YYYY
                baseDate = new Date(parts[2], parts[1] - 1, parts[0]);
            } else {
                baseDate = new Date(dateVal);
            }
        } else {
            baseDate = new Date(dateVal);
        }
    }

    if (!baseDate || isNaN(baseDate.getTime())) return null;

    // Parse Time
    let hours = 0, minutes = 0, seconds = 0;
    if (typeof timeVal === 'number') {
        // Excel stores time as a fraction of a day
        let totalSeconds = Math.round(timeVal * 24 * 3600);
        hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        minutes = Math.floor(totalSeconds / 60);
        seconds = totalSeconds % 60;
    } else if (typeof timeVal === 'string' && timeVal.trim() !== "") {
        const parts = timeVal.split(':');
        hours = parseInt(parts[0]) || 0;
        minutes = parseInt(parts[1]) || 0;
        seconds = parseInt(parts[2]) || 0;
    }

    baseDate.setHours(hours, minutes, seconds);
    return baseDate;
}

// Helper: Calculate diff in hours between two sets of Data/Hora
function calcHoursDiff(dtStart, hrStart, dtEnd, hrEnd) {
    const start = parseDateTime(dtStart, hrStart);
    const end = parseDateTime(dtEnd, hrEnd);
    
    if (start && end && !isNaN(start) && !isNaN(end)) {
        let diffMs = end - start;
        let diffHours = diffMs / (1000 * 3600);
        
        // Remove discrepâncias absurdas (ex: erros de digitação maiores que 5 dias)
        if (diffHours >= 0 && diffHours <= 120) {
            return diffHours;
        }
    }
    return null;
}

// Normalize data from sheet
function parseSheetToData(sheet) {
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (!rawData || rawData.length === 0) throw new Error("Planilha sem dados ou vazia.");

    const firstRow = rawData[0];
    const keys = Object.keys(firstRow);

    function findKey(possibilities) {
        for (let p of possibilities) {
            const found = keys.find(k => k.toLowerCase().includes(p.toLowerCase()));
            if (found) return found;
        }
        return null;
    }

    // Identificadores base
    const movimentoKey = findKey(['movimento', 'id_movimento']);
    const transpKey = findKey(['transportadora', 'nome da transportadora']);
    const placaKey = findKey(['placa do cavalo', 'placa cavalo']);
    const pesoLiqKey = findKey(['peso líquido', 'peso_liquido']);
    const volumeKey = findKey(['volume real', 'volume_real']);
    const distanciaKey = findKey(['distância', 'distancia']);

    // Datas e Horas para Ciclo e Filas (Corrigido para cruzar colunas separadas)
    const dtSaidaFabKey = findKey(['data saída fábrica', 'data saida fabrica']);
    const hrSaidaFabKey = findKey(['hora saída fábrica', 'hora saida fabrica']);
    
    const dtChegadaCampoKey = findKey(['data chegada campo']);
    const hrChegadaCampoKey = findKey(['hora chegada campo']);
    const dtInicioCarregCpoKey = findKey(['dt início carreg cpo', 'dt inicio carreg cpo']);
    const hrInicioCarregCpoKey = findKey(['hr início carreg cpo', 'hr inicio carreg cpo']);
    
    const dtEntradaKey = findKey(['data de entrada', 'data entrada']);
    const hrEntradaKey = findKey(['hora de entrada', 'hora entrada']);
    const dtInicioDescarFabKey = findKey(['dt início descar fáb', 'dt inicio descar fab', 'data inicio descar fab']);
    const hrInicioDescarFabKey = findKey(['hr início descar fáb', 'hr inicio descar fab', 'hora inicio descar fab']);

    const mappedData = rawData.map((row, idx) => {
        const getValue = (key) => (key && row[key] !== undefined && row[key] !== "") ? row[key] : null;

        const movimento = getValue(movimentoKey) || `MOV-${idx}`;
        let transportadora = String(getValue(transpKey) || "Não identificada").trim();
        const placa = String(getValue(placaKey) || "-").trim();

        let pesoLiq = parseFloat(getValue(pesoLiqKey));
        if (isNaN(pesoLiq)) pesoLiq = 0;
        let volume = parseFloat(getValue(volumeKey));
        if (isNaN(volume)) volume = 0;
        let distancia = parseFloat(getValue(distanciaKey));
        if (isNaN(distancia)) distancia = 0;

        // Cálculos de Tempos da Operação (com base sólida comparando data de inicio vs data de fim)
        const cicloHoras = calcHoursDiff(
            getValue(dtSaidaFabKey), getValue(hrSaidaFabKey),
            getValue(dtInicioDescarFabKey), getValue(hrInicioDescarFabKey)
        );

        const filaCampoHoras = calcHoursDiff(
            getValue(dtChegadaCampoKey), getValue(hrChegadaCampoKey),
            getValue(dtInicioCarregCpoKey), getValue(hrInicioCarregCpoKey)
        );

        const filaFabricaHoras = calcHoursDiff(
            getValue(dtEntradaKey), getValue(hrEntradaKey),
            getValue(dtInicioDescarFabKey), getValue(hrInicioDescarFabKey)
        );

        // Limpeza de nome de transportadora para gráficos
        transportadora = transportadora.replace(/\s+(LTDA|Ltda|LTDA\.|S\.A\.|EIRELI)$/i, '').trim();

        return {
            movimento: String(movimento),
            transportadora: transportadora,
            placa: placa,
            pesoLiquido: pesoLiq,
            volumeReal: volume,
            distanciaKm: distancia,
            cicloHoras: cicloHoras,
            filaCampoHoras: filaCampoHoras,
            filaFabricaHoras: filaFabricaHoras
        };
    });

    return mappedData.filter(item => item.pesoLiquido > 0 || item.volumeReal > 0 || item.distanciaKm > 0);
}

// Process file and render dashboard
async function processExcelFile(file) {
    hideError();
    loadingSpinner.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array', cellDates: false, defval: "" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) throw new Error("Nenhuma aba encontrada no arquivo.");

        const parsedRows = parseSheetToData(firstSheet);
        if (parsedRows.length === 0) throw new Error("Nenhum dado válido encontrado. Verifique as colunas base da operação.");

        currentWorkbookData = parsedRows;

        // Calculate KPIs Gerais
        const totalViagens = currentWorkbookData.length;
        const totalPesoKg = currentWorkbookData.reduce((sum, r) => sum + (r.pesoLiquido || 0), 0);
        const totalPesoTon = totalPesoKg / 1000;
        const cargaMediaTon = totalPesoTon / totalViagens;
        const mediaVolume = currentWorkbookData.reduce((sum, r) => sum + (r.volumeReal || 0), 0) / totalViagens;
        const mediaDist = currentWorkbookData.reduce((sum, r) => sum + (r.distanciaKm || 0), 0) / totalViagens;

        // Calculate KPIs de Tempos (médias ignorando nulos)
        const validCycles = currentWorkbookData.filter(d => d.cicloHoras !== null);
        const mediaCiclo = validCycles.length > 0 ? validCycles.reduce((s, d) => s + d.cicloHoras, 0) / validCycles.length : 0;

        const validFilaCampo = currentWorkbookData.filter(d => d.filaCampoHoras !== null);
        const mediaFilaCampo = validFilaCampo.length > 0 ? validFilaCampo.reduce((s, d) => s + d.filaCampoHoras, 0) / validFilaCampo.length : 0;

        const validFilaFabrica = currentWorkbookData.filter(d => d.filaFabricaHoras !== null);
        const mediaFilaFabrica = validFilaFabrica.length > 0 ? validFilaFabrica.reduce((s, d) => s + d.filaFabricaHoras, 0) / validFilaFabrica.length : 0;

        // Atualizar painéis no DOM
        totalViagensSpan.innerText = totalViagens;
        totalPesoLiqSpan.innerText = totalPesoTon.toFixed(1) + " t";
        cargaMediaSpan.innerText = cargaMediaTon.toFixed(1) + " t";
        mediaVolumeRealSpan.innerText = mediaVolume.toFixed(1) + " m³";
        mediaDistanciaSpan.innerText = mediaDist.toFixed(1) + " km";
        totalRegistrosSpan.innerText = totalViagens;

        cicloMedioSpan.innerText = mediaCiclo.toFixed(1) + " h";
        filaCampoSpan.innerText = mediaFilaCampo.toFixed(1) + " h";
        filaFabricaSpan.innerText = mediaFilaFabrica.toFixed(1) + " h";

        // Preparar dados para Gráficos: Top 5 Transportadoras
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

        const topTransportadoras = Array.from(transpCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const transpLabels = topTransportadoras.map(t => t[0].length > 20 ? t[0].substring(0, 18) + "..." : t[0]);
        const transpValues = topTransportadoras.map(t => t[1]);

        const cicloMedioPorTransp = topTransportadoras.map(([nome]) => {
            const count = transpCicloCount.get(nome) || 0;
            return count > 0 ? parseFloat((transpCicloSum.get(nome) / count).toFixed(1)) : 0;
        });

        if (chartCiclo) chartCiclo.destroy();
        if (chartTransp) chartTransp.destroy();

        // Gráfico 1: Ciclo Médio
        const ctxCiclo = document.getElementById('cicloChart').getContext('2d');
        chartCiclo = new Chart(ctxCiclo, {
            type: 'bar',
            data: {
                labels: transpLabels,
                datasets: [{
                    label: 'Ciclo Médio (h)',
                    data: cicloMedioPorTransp,
                    backgroundColor: '#4f46e5',
                    borderRadius: 6,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } }
            }
        });

        // Gráfico 2: Distribuição de Viagens
        const ctxTransp = document.getElementById('transportadorasChart').getContext('2d');
        chartTransp = new Chart(ctxTransp, {
            type: 'pie',
            data: {
                labels: transpLabels,
                datasets: [{
                    data: transpValues,
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'right', labels: { font: { size: 11 } } }
                }
            }
        });

        // Preencher Tabela de Amostra (Agregado Coluna Ciclo)
        sampleTableBody.innerHTML = '';
        const sampleRows = currentWorkbookData.slice(0, 8);
        sampleRows.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50';
            tr.innerHTML = `
                <td class="px-4 py-3 font-mono text-xs text-gray-600">${row.movimento.substring(0, 14)}</td>
                <td class="px-4 py-3 max-w-xs truncate" title="${row.transportadora}">${row.transportadora.substring(0, 30)}</td>
                <td class="px-4 py-3 font-mono text-xs">${row.placa}</td>
                <td class="px-4 py-3 text-right">${(row.pesoLiquido / 1000).toFixed(1)} t</td>
                <td class="px-4 py-3 text-right">${row.distanciaKm.toFixed(1)} km</td>
                <td class="px-4 py-3 text-right font-bold text-indigo-600">${row.cicloHoras !== null ? row.cicloHoras.toFixed(1) + ' h' : '-'}</td>
            `;
            sampleTableBody.appendChild(tr);
        });

        dashboardContainer.classList.remove('hidden');
        dashboardContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
        console.error(err);
        showError("Erro ao processar arquivo: " + err.message);
        dashboardContainer.classList.add('hidden');
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

// Event Listeners para Drag & Drop e Clique
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.name.match(/\.(xlsx|xls)$/i)) {
            fileInfoDiv.classList.remove('hidden');
            fileNameSpan.innerText = `📄 ${file.name}`;
            processExcelFile(file);
        } else {
            showError("Formato inválido. Envie arquivo .xlsx ou .xls");
        }
    }
});

selectFileBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        const file = e.target.files[0];
        fileInfoDiv.classList.remove('hidden');
        fileNameSpan.innerText = `📄 ${file.name}`;
        processExcelFile(file);
    }
});

dropZone.addEventListener('click', (e) => {
    if (e.target === dropZone || (e.target.closest('.upload-zone') && !e.target.closest('#selectFileBtn'))) {
        fileInput.click();
    }
});

console.log("SerranaLog Analytics carregado. Aguardando upload.");