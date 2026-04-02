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
const mediaVolumeRealSpan = document.getElementById('mediaVolumeReal');
const mediaDistanciaSpan = document.getElementById('mediaDistancia');
const totalRegistrosSpan = document.getElementById('totalRegistrosSpan');
const sampleTableBody = document.getElementById('sampleTableBody');

// Set current date
document.getElementById('currentDateLabel').innerText = new Date().toLocaleDateString('pt-BR');

// Helper: show error message
function showError(msg) {
    errorMsgDiv.innerText = msg;
    errorMsgDiv.classList.remove('hidden');
    setTimeout(() => errorMsgDiv.classList.add('hidden'), 5000);
}

function hideError() {
    errorMsgDiv.classList.add('hidden');
}

// Normalize data from sheet (mapping columns based on header row)
function parseSheetToData(sheet) {
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (!rawData || rawData.length === 0) throw new Error("Planilha sem dados ou vazia.");

    const firstRow = rawData[0];
    const keys = Object.keys(firstRow);

    // Find column key by possibilities
    function findKey(possibilities) {
        for (let p of possibilities) {
            const found = keys.find(k => k.toLowerCase().includes(p.toLowerCase()));
            if (found) return found;
        }
        return null;
    }

    const movimentoKey = findKey(['movimento', 'id_movimento', 'id movimento']);
    const transpKey = findKey(['transportadora', 'nome da transportadora', 'nome_transportadora']);
    const placaKey = findKey(['placa do cavalo', 'placa cavalo', 'placa_cavalo']);
    const pesoLiqKey = findKey(['peso líquido', 'peso liquido', 'peso_liquido', 'peso líquido (kg)']);
    const volumeKey = findKey(['volume real', 'volume_real', 'volume']);
    const distanciaKey = findKey(['distância', 'distancia']);

    // Time fields for cycle calculation
    const dataSaidaFabKey = findKey(['data saída fábrica', 'data saida fabrica', 'data_saida_fabrica']);
    const hrSaidaFabKey = findKey(['hora saída fábrica', 'hora saida fabrica']);
    const hrInicioDescarFabKey = findKey(['hr início descar fáb', 'hr inicio descar fab', 'hora inicio descarga fabrica']);

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

        // Calculate cycle time (hours between factory departure and factory unload start)
        let cicloHoras = null;
        const dataSaidaFab = getValue(dataSaidaFabKey);
        const hrSaidaFab = getValue(hrSaidaFabKey);
        const hrInicioDescarFab = getValue(hrInicioDescarFabKey);

        function parseDateTime(dateVal, timeVal) {
            if (!dateVal && !timeVal) return null;
            let baseDate = null;
            if (dateVal && typeof dateVal === 'number') {
                // Excel serial date
                const dateCode = XLSX.SSF.parse_date_code(dateVal);
                if (dateCode) baseDate = new Date(dateCode.y, dateCode.m - 1, dateCode.d);
                else baseDate = new Date();
            } else if (dateVal && typeof dateVal === 'string' && dateVal.includes('-')) {
                baseDate = new Date(dateVal);
            } else if (dateVal) {
                baseDate = new Date(dateVal);
            } else {
                baseDate = new Date();
            }
            if (isNaN(baseDate.getTime())) baseDate = new Date();

            let timeStr = (timeVal && timeVal !== "") ? timeVal.toString() : "00:00:00";
            const parts = timeStr.split(':');
            const hours = parseInt(parts[0]) || 0;
            const minutes = parseInt(parts[1]) || 0;
            const seconds = parseInt(parts[2]) || 0;
            const result = new Date(baseDate);
            result.setHours(hours, minutes, seconds);
            return result;
        }

        const saidaFabDate = parseDateTime(dataSaidaFab, hrSaidaFab);
        const inicioDescFabDate = parseDateTime(dataSaidaFab, hrInicioDescarFab);

        if (saidaFabDate && inicioDescFabDate && !isNaN(saidaFabDate) && !isNaN(inicioDescFabDate)) {
            let diffMs = inicioDescFabDate - saidaFabDate;
            cicloHoras = diffMs / (1000 * 3600);
            // Adjust for overnight trips (if negative, add 24h)
            if (cicloHoras < 0) cicloHoras += 24;
            // Filter unrealistic values
            if (cicloHoras < 0 || cicloHoras > 72) cicloHoras = null;
        }

        // Clean transportadora name - remove common suffixes for better grouping
        transportadora = transportadora.replace(/\s+(LTDA|Ltda|LTDA\.|S\.A\.|EIRELI)$/i, '').trim();

        return {
            movimento: String(movimento),
            transportadora: transportadora,
            placa: placa,
            pesoLiquido: pesoLiq,
            volumeReal: volume,
            distanciaKm: distancia,
            cicloHoras: cicloHoras
        };
    });

    // Filter valid records (at least one meaningful metric)
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
        if (parsedRows.length === 0) throw new Error("Nenhum dado válido encontrado. Verifique as colunas de peso/volume.");

        currentWorkbookData = parsedRows;

        // Calculate KPIs
        const totalViagens = currentWorkbookData.length;
        const totalPesoKg = currentWorkbookData.reduce((sum, r) => sum + (r.pesoLiquido || 0), 0);
        const totalPesoTon = totalPesoKg / 1000;
        const mediaVolume = currentWorkbookData.reduce((sum, r) => sum + (r.volumeReal || 0), 0) / totalViagens;
        const mediaDist = currentWorkbookData.reduce((sum, r) => sum + (r.distanciaKm || 0), 0) / totalViagens;
        const cargaMediaTon = totalPesoTon / totalViagens;

        // Update KPI displays
        totalViagensSpan.innerText = totalViagens;
        totalPesoLiqSpan.innerText = totalPesoTon.toFixed(1) + " t";
        mediaVolumeRealSpan.innerText = mediaVolume.toFixed(1) + " m³";
        mediaDistanciaSpan.innerText = mediaDist.toFixed(1) + " km";
        totalRegistrosSpan.innerText = totalViagens;

        // Add/Update extra KPI card for average load
        let extraCard = document.getElementById('extraPayloadCard');
        const kpiGrid = document.getElementById('kpiGrid');
        if (!extraCard && kpiGrid) {
            extraCard = document.createElement('div');
            extraCard.id = 'extraPayloadCard';
            extraCard.className = 'bg-white rounded-2xl shadow-md p-5 border-l-8 border-rose-500 card-hover';
            extraCard.innerHTML = `
                <div><p class="text-gray-500 text-sm uppercase tracking-wide">Carga Média por Viagem</p>
                <p id="cargaMediaValue" class="text-3xl font-extrabold text-gray-800 mt-1">${cargaMediaTon.toFixed(1)} t</p></div>
                <i class="fas fa-boxes text-rose-400 text-3xl float-right -mt-8"></i>
            `;
            kpiGrid.appendChild(extraCard);
        } else if (extraCard) {
            const cargaSpan = extraCard.querySelector('#cargaMediaValue');
            if (cargaSpan) cargaSpan.innerText = cargaMediaTon.toFixed(1) + " t";
        }

        // Prepare data for charts: Top 5 transporters by trips
        const transpCount = new Map();
        const transpCicloSum = new Map();
        const transpCicloCount = new Map();

        currentWorkbookData.forEach(d => {
            const nome = d.transportadora;
            transpCount.set(nome, (transpCount.get(nome) || 0) + 1);
            if (d.cicloHoras && d.cicloHoras > 0) {
                transpCicloSum.set(nome, (transpCicloSum.get(nome) || 0) + d.cicloHoras);
                transpCicloCount.set(nome, (transpCicloCount.get(nome) || 0) + 1);
            }
        });

        const topTransportadoras = Array.from(transpCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const transpLabels = topTransportadoras.map(t => t[0].length > 22 ? t[0].substring(0, 20) + "..." : t[0]);
        const transpValues = topTransportadoras.map(t => t[1]);

        // Calculate average cycle time per transporter (for top 5)
        const cicloMedioPorTransp = topTransportadoras.map(([nome]) => {
            const soma = transpCicloSum.get(nome) || 0;
            const count = transpCicloCount.get(nome) || 0;
            return count > 0 ? parseFloat((soma / count).toFixed(1)) : 0;
        });

        // Destroy existing charts if any
        if (chartCiclo) chartCiclo.destroy();
        if (chartTransp) chartTransp.destroy();

        // Create Cycle Time Chart
        const ctxCiclo = document.getElementById('cicloChart').getContext('2d');
        chartCiclo = new Chart(ctxCiclo, {
            type: 'bar',
            data: {
                labels: transpLabels,
                datasets: [{
                    label: 'Ciclo Médio (horas)',
                    data: cicloMedioPorTransp,
                    backgroundColor: '#2d6a4f',
                    borderRadius: 8,
                    barPercentage: 0.65
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.raw} horas` } }
                },
                scales: {
                    y: { title: { display: true, text: 'Horas', font: { size: 11 } }, beginAtZero: true }
                }
            }
        });

        // Create Transporter Distribution Chart (Pie)
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
                    legend: { position: 'right', labels: { font: { size: 11 } } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} viagens (${((ctx.raw / totalViagens) * 100).toFixed(1)}%)` } }
                }
            }
        });

        // Fill sample table (first 8 records)
        sampleTableBody.innerHTML = '';
        const sampleRows = currentWorkbookData.slice(0, 8);
        sampleRows.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50';
            tr.innerHTML = `
                <td class="px-4 py-2 font-mono text-xs">${row.movimento.substring(0, 14)}</td>
                <td class="px-4 py-2 max-w-xs truncate" title="${row.transportadora}">${row.transportadora.substring(0, 35)}</td>
                <td class="px-4 py-2 font-mono text-xs">${row.placa}</td>
                <td class="px-4 py-2 text-right">${(row.pesoLiquido / 1000).toFixed(1)} t</td>
                <td class="px-4 py-2 text-right">${row.volumeReal.toFixed(1)} m³</td>
                <td class="px-4 py-2 text-right">${row.distanciaKm.toFixed(1)} km</td>
            `;
            sampleTableBody.appendChild(tr);
        });

        // Show dashboard
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

// Drag & Drop handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

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

// Click handlers
selectFileBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        const file = e.target.files[0];
        fileInfoDiv.classList.remove('hidden');
        fileNameSpan.innerText = `📄 ${file.name}`;
        processExcelFile(file);
    }
});

// Click on drop zone to trigger file selection
dropZone.addEventListener('click', (e) => {
    if (e.target === dropZone || (e.target.closest('.upload-zone') && !e.target.closest('#selectFileBtn'))) {
        fileInput.click();
    }
});

console.log("SerranaLog Analytics carregado. Aguardando upload do arquivo diário.");