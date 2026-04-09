// ==========================================
// js/operacional.js - LÓGICA DO PAINEL DE METAS
// ==========================================

// Configuração padrão do Chart.js
if(typeof Chart !== 'undefined') {
    Chart.register(ChartDataLabels);
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
    Chart.defaults.font.family = "'Inter', sans-serif";
}

let fullHistoricoDataOp = [];
let fullHistoricoManutencao = []; 
let metasGlobais = {};
let activeQuickFilterOp = 'ALL';

let chartEvolucao = null;
let chartProjecao = null; 
let chartManutencao = null; 

document.addEventListener('DOMContentLoaded', () => {
    setupOperacionalFilters();
    loadOperacionalData();
});

function setupOperacionalFilters() {
    const btnQFs = document.querySelectorAll('.btn-op-qf');
    const datePicker = document.getElementById('opDatePicker');
    
    btnQFs.forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeQuickFilterOp = e.currentTarget.getAttribute('data-op-qf');
            btnQFs.forEach(b => {
                if(b.getAttribute('data-op-qf') === activeQuickFilterOp) {
                    b.classList.add('active', 'border-emerald-500/50', 'text-emerald-400', 'bg-emerald-900/30');
                    b.classList.remove('border-transparent', 'text-slate-400', 'hover:bg-slate-700/50');
                } else {
                    b.classList.remove('active', 'border-emerald-500/50', 'text-emerald-400', 'bg-emerald-900/30');
                    b.classList.add('border-transparent', 'text-slate-400', 'hover:bg-slate-700/50');
                }
            });
            if(datePicker) datePicker.value = '';
            atualizarPainelOperacional();
        });
    });

    if(datePicker) {
        datePicker.addEventListener('change', () => {
            if(datePicker.value) {
                activeQuickFilterOp = 'DATE';
                btnQFs.forEach(b => {
                    b.classList.remove('active', 'border-emerald-500/50', 'text-emerald-400', 'bg-emerald-900/30');
                    b.classList.add('border-transparent', 'text-slate-400', 'hover:bg-slate-700/50');
                });
                atualizarPainelOperacional();
            }
        });
    }
}

function verificarStatusAtualizacao(datasArray) {
    const indicador = document.getElementById('indicadorAtualizacao');
    const icone = document.getElementById('iconeAtualizacao');
    const texto = document.getElementById('textoAtualizacao');
    if(!indicador) return;

    indicador.classList.remove('hidden');

    if (!datasArray || datasArray.length === 0) {
        indicador.className = "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-inner bg-slate-900/50 text-slate-400 border-slate-600";
        icone.className = "fas fa-times-circle";
        texto.innerText = "Sem Dados";
        return;
    }

    let maxDate = new Date(0);
    let maxDateStr = "";

    datasArray.forEach(dStr => {
        let dt = null;
        const p = String(dStr).split('/');
        if(p.length === 3) {
            let ano = parseInt(p[2]); if(ano < 100) ano += 2000;
            dt = new Date(ano, parseInt(p[1])-1, parseInt(p[0]));
        }

        if (dt && dt > maxDate) {
            maxDate = dt;
            const dia = String(dt.getDate()).padStart(2, '0');
            const mes = String(dt.getMonth() + 1).padStart(2, '0');
            const ano = dt.getFullYear();
            maxDateStr = `${dia}/${mes}/${ano}`;
        }
    });

    const hoje = new Date();
    const diaH = String(hoje.getDate()).padStart(2, '0');
    const mesH = String(hoje.getMonth() + 1).padStart(2, '0');
    const anoH = hoje.getFullYear();
    const hojeStr = `${diaH}/${mesH}/${anoH}`;

    if (maxDateStr === hojeStr) {
        indicador.className = "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-inner bg-emerald-900/30 text-emerald-400 border-emerald-500/50 transition-colors";
        icone.className = "fas fa-check-circle";
        texto.innerText = "Atualizado Hoje";
    } else {
        indicador.className = "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-inner bg-amber-900/30 text-amber-400 border-amber-500/50 transition-colors";
        icone.className = "fas fa-exclamation-triangle";
        texto.innerText = `Base: ${maxDateStr}`;
    }
}

async function loadOperacionalData() {
    try {
        const { data: metas } = await supabaseClient.from('metas_globais').select('*').eq('id', 1).single();
        if(metas) metasGlobais = metas;

        const { data: historico } = await supabaseClient
            .from('historico_viagens')
            .select('*')
            .limit(15000);

        if(historico) {
            fullHistoricoDataOp = historico.reverse();
        }

        // Buscar Manutenções do banco secundário
        try {
            const { data: manutencoes } = await supabaseManutencao
                .from('ordens_servico')
                .select('*')
                .limit(5000);
            if(manutencoes) {
                fullHistoricoManutencao = manutencoes;
            }
        } catch(errManutencao) {
            console.error("Erro ao carregar manutenções do banco:", errManutencao);
        }

        if(historico) {
            const allDates = [...new Set(fullHistoricoDataOp.map(d => d.dataDaBaseExcel))].filter(d => d && d !== 'Desconhecida');
            verificarStatusAtualizacao(allDates);
            atualizarPainelOperacional();
        }
    } catch(e) { console.error("Erro ao carregar dados operacionais:", e); }
}

function atualizarPainelOperacional() {
    const dataRef = document.getElementById('opDatePicker') ? document.getElementById('opDatePicker').value : null;
    let diasConsiderados = 1;

    // Filtro de Viagens
    const filteredGlobal = fullHistoricoDataOp.filter(d => {
        if(activeQuickFilterOp === 'ALL') return true;
        
        const p = d.dataDaBaseExcel.split('/');
        if(p.length !== 3) return false;
        
        let ano = parseInt(p[2]); if(ano < 100) ano += 2000;
        const parsed = new Date(ano, p[1]-1, p[0]);
        parsed.setHours(0,0,0,0); const hj = new Date(); hj.setHours(0,0,0,0);
        
        if (activeQuickFilterOp === 'DATE' && dataRef) {
            const dr = new Date(dataRef + "T00:00:00");
            return parsed.getTime() === dr.getTime();
        }
        
        const diff = Math.round((hj - parsed)/86400000);
        if (activeQuickFilterOp === 'D-1') return diff === 1;
        if (activeQuickFilterOp === 'D-2') return diff === 2;
        if (activeQuickFilterOp === 'D-7') return diff >= 0 && diff <= 7;
        if (activeQuickFilterOp === 'D-30') return diff >= 0 && diff <= 30;
        return false;
    });

    // Filtro de Manutenções
    const filteredManutencao = fullHistoricoManutencao.filter(d => {
        if(activeQuickFilterOp === 'ALL') return true;

        const dateStr = d.data_abertura || d.created_at;
        if(!dateStr) return false;

        const parsed = new Date(dateStr);
        parsed.setHours(0,0,0,0); 
        const hj = new Date(); hj.setHours(0,0,0,0);

        if (activeQuickFilterOp === 'DATE' && dataRef) {
            const dr = new Date(dataRef + "T00:00:00");
            return parsed.getTime() === dr.getTime();
        }

        const diff = Math.round((hj - parsed)/86400000);
        if (activeQuickFilterOp === 'D-1') return diff === 1;
        if (activeQuickFilterOp === 'D-2') return diff === 2;
        if (activeQuickFilterOp === 'D-7') return diff >= 0 && diff <= 7;
        if (activeQuickFilterOp === 'D-30') return diff >= 0 && diff <= 30;
        return false;
    });

    const filteredSerrana = filteredGlobal.filter(d => {
        const transp = String(d.transportadora || "").toUpperCase();
        return transp.includes('SERRANALOG');
    });

    if(activeQuickFilterOp === 'ALL') {
        const dts = new Set(filteredGlobal.map(x=>x.dataDaBaseExcel));
        diasConsiderados = dts.size || 1;
    } else if (activeQuickFilterOp === 'D-7') diasConsiderados = 7;
    else if (activeQuickFilterOp === 'D-30') diasConsiderados = 30;

    const placasUnicasSerrana = new Set(filteredSerrana.map(d => d.placa).filter(p => p && p !== '-' && p.trim() !== '')).size || 0;
    const placasUnicasGlobal = new Set(filteredGlobal.map(d => d.placa).filter(p => p && p !== '-' && p.trim() !== '')).size || 0;

    const opStatusFetch = document.getElementById('opStatusFetch');
    if(opStatusFetch) {
        opStatusFetch.innerHTML = `
            <span class="text-sky-400 font-bold">F. Própria: ${placasUnicasSerrana}</span> | 
            <span class="text-emerald-400 font-bold">F. Global: ${placasUnicasGlobal}</span> | 
            ${diasConsiderados} dia(s)
        `;
    }
    
    const lblMultiplicador1 = document.getElementById('diasMultiplicador1');
    const lblMultiplicador2 = document.getElementById('diasMultiplicador2');
    
    if(lblMultiplicador1) lblMultiplicador1.innerText = `${diasConsiderados}d | F:${placasUnicasSerrana} (Serrana)`;
    if(lblMultiplicador2) lblMultiplicador2.innerText = `${diasConsiderados}d`;

    const totalV_Serrana = filteredSerrana.length;
    const metaV = (metasGlobais.v_prog || 0) * (placasUnicasSerrana === 0 ? 0 : placasUnicasSerrana) * diasConsiderados;
    document.getElementById('disp_v_prog').innerText = metaV;
    document.getElementById('disp_v_real').innerText = totalV_Serrana;
    atualizarBarra('bar_v_perc', 'disp_v_perc', totalV_Serrana, metaV);

    const totalVol_Global = filteredGlobal.reduce((s,x)=>s+(parseFloat(String(x.volumeReal).replace(',','.'))||0), 0);
    const metaVol = (metasGlobais.vol_prog || 0) * diasConsiderados; 
    document.getElementById('disp_vol_prog').innerText = metaVol.toLocaleString('pt-PT');
    document.getElementById('disp_vol_real').innerText = totalVol_Global.toLocaleString('pt-PT', {maximumFractionDigits:1});
    atualizarBarra('bar_vol_perc', 'disp_vol_perc', totalVol_Global, metaVol);

    const totalV_Global = filteredGlobal.length;
    
    const mediaCx = totalV_Global > 0 ? (totalVol_Global / totalV_Global) : 0;
    const metaCx = metasGlobais.cx_prog || 0;
    document.getElementById('disp_cx_prog').innerText = metaCx;
    document.getElementById('disp_cx_real').innerText = mediaCx.toLocaleString('pt-PT', {maximumFractionDigits:2});
    atualizarBarra('bar_cx_perc', 'disp_cx_perc', mediaCx, metaCx);

    const totalP_Global = filteredGlobal.reduce((s,x)=>s+(parseFloat(String(x.pesoLiquido).replace(',','.'))||0), 0)/1000;
    const mediaPbtc = totalV_Global > 0 ? (totalP_Global / totalV_Global) : 0;
    const metaPbtc = metasGlobais.pbtc_prog || 0;
    document.getElementById('disp_pbtc_prog').innerText = metaPbtc;
    document.getElementById('disp_pbtc_real').innerText = mediaPbtc.toLocaleString('pt-PT', {maximumFractionDigits:2});
    atualizarBarra('bar_pbtc_perc', 'disp_pbtc_perc', mediaPbtc, metaPbtc);

    // Gráficos
    renderEvolucaoChart(filteredGlobal);
    renderProjecaoChart(filteredGlobal); 
    renderManutencaoChart(filteredManutencao); 

    // Renderiza Tabelas
    renderLeaderboards(filteredSerrana);
    renderManutencaoTables(filteredManutencao); // CHAMADA DAS NOVAS TABELAS DE MANUTENÇÃO
    renderDashboardsGerenciais(filteredGlobal);
}

function atualizarBarra(barId, txtId, real, meta) {
    const perc = meta > 0 ? Math.min((real/meta)*100, 100) : 0;
    const b = document.getElementById(barId);
    const t = document.getElementById(txtId);
    if(b) b.style.width = `${perc}%`;
    if(t) t.innerText = `${perc.toFixed(1)}%`;
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

function renderEvolucaoChart(data) {
    const ctxEvo = document.getElementById('evolucaoDiariaChart');
    if(!ctxEvo) return;

    const dailyMap = new Map();
    data.forEach(d => {
        const dt = d.dataDaBaseExcel;
        if (!dt || dt === 'Desconhecida') return;
        if (!dailyMap.has(dt)) dailyMap.set(dt, 0);
        const vol = parseFloat(String(d.volumeReal).replace(',', '.')) || 0;
        dailyMap.set(dt, dailyMap.get(dt) + vol);
    });

    const sortedDates = Array.from(dailyMap.keys()).sort((a, b) => {
        const pA = a.split('/'); const pB = b.split('/');
        return new Date(pA[2], pA[1]-1, pA[0]) - new Date(pB[2], pB[1]-1, pB[0]);
    });

    const displayDates = sortedDates.slice(-30);
    const displayVols = displayDates.map(dt => dailyMap.get(dt));

    if (chartEvolucao) chartEvolucao.destroy();
    
    const ctx = ctxEvo.getContext('2d');
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, '#10b981'); 
    gradient.addColorStop(1, '#047857'); 

    chartEvolucao = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: displayDates.map(d => d.substring(0, 5)), 
            datasets: [{
                label: 'Volume (m³)',
                data: displayVols,
                backgroundColor: gradient,
                borderRadius: 4,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#fff',
                    anchor: 'end',
                    align: 'top',
                    font: { size: 11, weight: 'bold' },
                    formatter: (v) => v > 0 ? v.toFixed(0) : ''
                }
            },
            scales: {
                y: { display: false, beginAtZero: true, suggestedMax: Math.max(...displayVols) * 1.2 }, 
                x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11, weight: 'bold' }, color: '#cbd5e1' } }
            },
            layout: { padding: { top: 25 } }
        }
    });
}

function renderProjecaoChart(data) {
    const ctxProj = document.getElementById('projecaoDiariaChart');
    if(!ctxProj) return;

    const dailyMap = new Map();
    data.forEach(d => {
        const dt = d.dataDaBaseExcel;
        if (!dt || dt === 'Desconhecida') return;
        if (!dailyMap.has(dt)) dailyMap.set(dt, 0);
        const vol = parseFloat(String(d.volumeReal).replace(',', '.')) || 0;
        dailyMap.set(dt, dailyMap.get(dt) + vol);
    });

    const sortedDates = Array.from(dailyMap.keys()).sort((a, b) => {
        const pA = a.split('/'); const pB = b.split('/');
        return new Date(pA[2], pA[1]-1, pA[0]) - new Date(pB[2], pB[1]-1, pB[0]);
    });

    if (sortedDates.length === 0) return;

    const last7 = sortedDates.slice(-7);
    let sum7 = 0;
    last7.forEach(dt => sum7 += dailyMap.get(dt));
    const avgVol = last7.length > 0 ? sum7 / last7.length : 0;

    const lastDateStr = sortedDates[sortedDates.length - 1];
    const pL = lastDateStr.split('/');
    let lastDateObj = new Date(parseInt(pL[2]) < 100 ? parseInt(pL[2])+2000 : parseInt(pL[2]), parseInt(pL[1])-1, parseInt(pL[0]));

    const projLabels = [];
    const projData = [];

    for(let i=1; i<=5; i++) {
        const nextD = new Date(lastDateObj);
        nextD.setDate(nextD.getDate() + i);
        const d = String(nextD.getDate()).padStart(2, '0');
        const m = String(nextD.getMonth() + 1).padStart(2, '0');
        projLabels.push(`${d}/${m}`);
        
        const variacao = avgVol * (1 + ((Math.random() - 0.5) * 0.04));
        projData.push(variacao);
    }

    if (chartProjecao) chartProjecao.destroy();
    
    const ctx = ctxProj.getContext('2d');
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, '#38bdf8'); 
    gradient.addColorStop(1, '#0369a1'); 

    chartProjecao = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: projLabels,
            datasets: [{
                label: 'Projeção (m³)',
                data: projData,
                backgroundColor: gradient,
                borderRadius: 4,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#bae6fd', 
                    anchor: 'end',
                    align: 'top',
                    font: { size: 11, weight: 'bold' },
                    formatter: (v) => v > 0 ? v.toFixed(0) : ''
                }
            },
            scales: {
                y: { display: false, beginAtZero: true, suggestedMax: avgVol * 1.3 }, 
                x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11, weight: 'bold' }, color: '#cbd5e1' } }
            },
            layout: { padding: { top: 25 } }
        }
    });
}

function renderManutencaoChart(data) {
    const ctxMan = document.getElementById('evolucaoManutencaoChart');
    if(!ctxMan) return;

    const dailyMap = new Map();

    data.forEach(d => {
        const dateStr = d.data_abertura || d.created_at;
        if (!dateStr) return;

        const dtObj = new Date(dateStr);
        const dtKey = dtObj.toISOString().split('T')[0]; 
        
        dailyMap.set(dtKey, (dailyMap.get(dtKey) || 0) + 1);
    });

    const sortedDates = Array.from(dailyMap.keys()).sort();
    const displayDates = sortedDates.slice(-30);
    const displayCounts = displayDates.map(dt => dailyMap.get(dt));
    
    const displayLabels = displayDates.map(dt => {
        const parts = dt.split('-');
        return `${parts[2]}/${parts[1]}`;
    });

    if (chartManutencao) chartManutencao.destroy();
    
    const ctx = ctxMan.getContext('2d');
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, '#f43f5e'); // rose-500
    gradient.addColorStop(1, '#be123c'); // rose-700

    chartManutencao = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: displayLabels,
            datasets: [{
                label: 'OS Abertas',
                data: displayCounts,
                backgroundColor: gradient,
                borderRadius: 4,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#fff',
                    anchor: 'end',
                    align: 'top',
                    font: { size: 11, weight: 'bold' },
                    formatter: (v) => v > 0 ? v : ''
                }
            },
            scales: {
                y: { display: false, beginAtZero: true, suggestedMax: Math.max(...displayCounts, 1) * 1.3 }, 
                x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11, weight: 'bold' }, color: '#cbd5e1' } }
            },
            layout: { padding: { top: 25 } }
        }
    });
}

function renderLeaderboards(data) {
    const pMap = new Map();
    data.forEach(d => {
        const pl = d.placa || 'N/A';
        const volNum = parseFloat(String(d.volumeReal).replace(',', '.')) || 0;
        if(!pMap.has(pl)) pMap.set(pl, {p: pl, t: d.transportadora||'-', vol: 0, v: 0, ciclos: 0, cCount: 0});
        const o = pMap.get(pl);
        o.vol += volNum; o.v++;
        if(d.cicloHoras > 0) { o.ciclos += d.cicloHoras; o.cCount++; }
    });

    const arr = Array.from(pMap.values());
    const topVol = [...arr].sort((a,b)=>b.vol - a.vol).slice(0,10);
    const topCiclo = [...arr].filter(x=>x.cCount > 0).map(x=>({...x, cMedio: x.ciclos/x.cCount})).sort((a,b)=>a.cMedio - b.cMedio).slice(0,10);

    const bVol = document.getElementById('leaderboardBody');
    if(bVol) {
        bVol.innerHTML = '';
        topVol.forEach((x,i) => {
            const tr = `<tr><td class="px-4 py-3 text-center"><div class="w-6 h-6 rounded-full ${i<3?'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]':'bg-slate-800 text-slate-400'} flex items-center justify-center text-xs font-bold">${i+1}</div></td><td class="px-4 py-3 font-bold text-white">${x.p}</td><td class="px-4 py-3 text-slate-400 truncate max-w-[100px]">${x.t}</td><td class="px-4 py-3 text-center text-slate-300">${x.v}</td><td class="px-4 py-3 text-right font-mono text-emerald-400">${x.vol.toLocaleString('pt-PT',{maximumFractionDigits:1})}</td></tr>`;
            bVol.insertAdjacentHTML('beforeend', tr);
        });
    }

    const bCiclo = document.getElementById('leaderboardCicloBody');
    if(bCiclo) {
        bCiclo.innerHTML = '';
        topCiclo.forEach((x,i) => {
            const tr = `<tr><td class="px-4 py-3 text-center"><div class="w-6 h-6 rounded-full ${i<3?'bg-sky-500 text-white shadow-[0_0_10px_rgba(14,165,233,0.5)]':'bg-slate-800 text-slate-400'} flex items-center justify-center text-xs font-bold">${i+1}</div></td><td class="px-4 py-3 font-bold text-white">${x.p}</td><td class="px-4 py-3 text-slate-400 truncate max-w-[100px]">${x.t}</td><td class="px-4 py-3 text-center text-slate-300">${x.v}</td><td class="px-4 py-3 text-right font-mono text-sky-400">${formatarHorasMinutos(x.cMedio)}</td></tr>`;
            bCiclo.insertAdjacentHTML('beforeend', tr);
        });
    }
}

// NOVA FUNÇÃO: RENDERIZA TABELAS DE MANUTENÇÃO (Top Caminhões e Tipo Serviço)
function renderManutencaoTables(data) {
    const placaMap = new Map();
    const tipoMap = new Map();
    let totalOS = data.length;

    data.forEach(d => {
        const pl = d.placa ? d.placa.trim().toUpperCase() : 'N/A';
        const tp = d.tipo ? d.tipo.trim().toUpperCase() : 'NÃO INFORMADO';

        placaMap.set(pl, (placaMap.get(pl) || 0) + 1);
        tipoMap.set(tp, (tipoMap.get(tp) || 0) + 1);
    });

    const topPlacas = Array.from(placaMap.entries())
        .map(([placa, qtd]) => ({ placa, qtd }))
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, 5); // TOP 5

    const topTipos = Array.from(tipoMap.entries())
        .map(([tipo, qtd]) => ({ tipo, qtd }))
        .sort((a, b) => b.qtd - a.qtd); // Lista os tipos mais recorrentes

    const bCaminhoes = document.getElementById('leaderboardCaminhoesQuebram');
    if (bCaminhoes) {
        bCaminhoes.innerHTML = '';
        topPlacas.forEach((x, i) => {
            const tr = `<tr>
                <td class="px-4 py-3 text-center"><div class="w-6 h-6 rounded-full ${i<3?'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]':'bg-slate-800 text-slate-400'} flex items-center justify-center text-xs font-bold">${i+1}</div></td>
                <td class="px-4 py-3 font-bold text-white">${x.placa}</td>
                <td class="px-4 py-3 text-right font-mono text-rose-400 font-bold">${x.qtd}</td>
            </tr>`;
            bCaminhoes.insertAdjacentHTML('beforeend', tr);
        });
        if (topPlacas.length === 0) {
            bCaminhoes.innerHTML = '<tr><td colspan="3" class="px-4 py-4 text-center text-slate-500">Nenhuma ocorrência no período</td></tr>';
        }
    }

    const bTipos = document.getElementById('leaderboardTiposServico');
    if (bTipos) {
        bTipos.innerHTML = '';
        topTipos.forEach((x) => {
            const perc = totalOS > 0 ? (x.qtd / totalOS) * 100 : 0;
            const tr = `<tr>
                <td class="px-4 py-3 font-bold text-white max-w-[150px] truncate" title="${x.tipo}">${x.tipo}</td>
                <td class="px-4 py-3 text-right font-mono text-amber-400 font-bold">${x.qtd}</td>
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] text-slate-400 w-8 text-right">${perc.toFixed(0)}%</span>
                        <div class="w-full bg-slate-800 rounded-full h-1.5 shadow-inner">
                            <div class="bg-amber-500 h-1.5 rounded-full transition-all duration-500" style="width: ${perc}%"></div>
                        </div>
                    </div>
                </td>
            </tr>`;
            bTipos.insertAdjacentHTML('beforeend', tr);
        });
        if (topTipos.length === 0) {
            bTipos.innerHTML = '<tr><td colspan="3" class="px-4 py-4 text-center text-slate-500">Nenhuma ocorrência no período</td></tr>';
        }
    }
}

function renderDashboardsGerenciais(data) {
    const placaMap = new Map();
    let somaFilaCpo = 0, countFilaCpo = 0;
    let somaCarreg = 0, countCarreg = 0;
    let somaFilaFab = 0, countFilaFab = 0;
    const viagensComCiclo = [];

    const calcularInicioFim = (d, ciclo) => {
        let dtIn = d.dataDaBaseExcel || '-';
        let hrIn = '--:--';
        let dtOut = '-';
        let hrOut = '--:--';

        let possibleTime = d.horaSaidaFabrica || d.hora_saida_fabrica || d.horaSaida || null;

        if (!possibleTime) {
            for (let key in d) {
                if (typeof d[key] === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(d[key].trim())) {
                    possibleTime = d[key].trim();
                    break;
                }
            }
        }

        if (possibleTime && possibleTime.includes(':')) {
            hrIn = possibleTime.substring(0, 5); 

            if (dtIn !== '-' && ciclo > 0) {
                const p = dtIn.split('/');
                if (p.length === 3) {
                    let y = parseInt(p[2], 10); if (y < 100) y += 2000;
                    let m = parseInt(p[1], 10) - 1;
                    let day = parseInt(p[0], 10);
                    let base = new Date(y, m, day);
                    
                    const t = possibleTime.split(':');
                    base.setHours(parseInt(t[0], 10) || 0, parseInt(t[1], 10) || 0, 0, 0);

                    base.setTime(base.getTime() + (ciclo * 3600 * 1000));
                    
                    const fD = String(base.getDate()).padStart(2, '0');
                    const fM = String(base.getMonth() + 1).padStart(2, '0');
                    const fY = base.getFullYear();
                    const fH = String(base.getHours()).padStart(2, '0');
                    const fMin = String(base.getMinutes()).padStart(2, '0');
                    
                    dtOut = `${fD}/${fM}/${fY}`;
                    hrOut = `${fH}:${fMin}`;
                }
            }
        }

        return { dtIn, hrIn, dtOut, hrOut };
    };

    data.forEach(d => {
        const transpNome = String(d.transportadora || "").toUpperCase();
        if (transpNome.includes('SERRANALOG')) {
            const pl = d.placa || 'N/A';
            const vol = parseFloat(String(d.volumeReal).replace(',', '.')) || 0;
            
            if(!placaMap.has(pl)) placaMap.set(pl, { nome: pl, volTotal: 0, viagens: 0 });
            const objP = placaMap.get(pl);
            objP.volTotal += vol;
            objP.viagens++;
        }

        if (d.filaCampoHoras > 0) { somaFilaCpo += d.filaCampoHoras; countFilaCpo++; }
        if (d.tempoCarregamentoHoras > 0) { somaCarreg += d.tempoCarregamentoHoras; countCarreg++; }
        if (d.filaFabricaHoras > 0) { somaFilaFab += d.filaFabricaHoras; countFilaFab++; }

        if (d.cicloHoras > 0) {
            const temp = calcularInicioFim(d, d.cicloHoras);
            viagensComCiclo.push({
                placa: d.placa || '-',
                transp: d.transportadora || '-',
                ciclo: d.cicloHoras,
                dtIn: temp.dtIn,
                hrIn: temp.hrIn,
                dtOut: temp.dtOut,
                hrOut: temp.hrOut
            });
        }
    });

    const topCaixaMedia = Array.from(placaMap.values())
        .map(x => ({ ...x, media: x.volTotal / (x.viagens || 1) }))
        .sort((a,b) => b.media - a.media);

    const bodyCaixa = document.getElementById('leaderboardCaixaMedia');
    if(bodyCaixa) {
        bodyCaixa.innerHTML = '';
        
        const metaCx = metasGlobais.cx_prog || (topCaixaMedia.length > 0 ? topCaixaMedia[0].media : 1);

        topCaixaMedia.forEach((x, i) => {
            const perc = Math.min((x.media / metaCx) * 100, 100);
            
            let corBarra = 'bg-indigo-500';
            if (perc >= 95) corBarra = 'bg-emerald-500';
            else if (perc >= 80) corBarra = 'bg-amber-500';
            else corBarra = 'bg-rose-500';

            const tr = `<tr>
                <td class="px-4 py-3 font-bold text-white truncate max-w-[150px]"><span class="text-slate-500 mr-1">${i+1}.</span> ${x.nome}</td>
                <td class="px-4 py-3 text-center text-slate-300">${x.viagens}</td>
                <td class="px-4 py-3 text-right">
                    <div class="flex flex-col items-end justify-center gap-1.5">
                        <span class="font-mono text-white text-[15px] sm:text-base font-black">${x.media.toLocaleString('pt-PT',{maximumFractionDigits:2})}</span>
                        <div class="w-full max-w-[90px] bg-slate-800 rounded-full h-1.5 shadow-inner overflow-hidden" title="${perc.toFixed(1)}% da Meta">
                            <div class="${corBarra} h-1.5 rounded-full transition-all duration-500 shadow-[0_0_8px_currentColor]" style="width: ${perc}%"></div>
                        </div>
                    </div>
                </td>
            </tr>`;
            bodyCaixa.insertAdjacentHTML('beforeend', tr);
        });
    }

    const gargalos = [
        { nome: '1. Fila no Campo', media: countFilaCpo > 0 ? (somaFilaCpo/countFilaCpo) : 0, amostras: countFilaCpo },
        { nome: '2. Carregamento', media: countCarreg > 0 ? (somaCarreg/countCarreg) : 0, amostras: countCarreg },
        { nome: '3. Fila na Fábrica/Balança', media: countFilaFab > 0 ? (somaFilaFab/countFilaFab) : 0, amostras: countFilaFab }
    ];

    const bodyGargalos = document.getElementById('leaderboardGargalos');
    if(bodyGargalos) {
        bodyGargalos.innerHTML = '';
        gargalos.forEach((x) => {
            const tr = `<tr>
                <td class="px-4 py-3 font-bold text-white truncate max-w-[150px]">${x.nome}</td>
                <td class="px-4 py-3 text-center text-slate-300">${x.amostras}</td>
                <td class="px-4 py-3 text-right font-mono text-white text-sm font-bold">${formatarHorasMinutos(x.media)}</td>
            </tr>`;
            bodyGargalos.insertAdjacentHTML('beforeend', tr);
        });
    }

    const topPioresCiclos = viagensComCiclo.sort((a,b) => b.ciclo - a.ciclo).slice(0, 10);

    const bodyPiores = document.getElementById('leaderboardPioresCiclos');
    if(bodyPiores) {
        bodyPiores.innerHTML = '';
        topPioresCiclos.forEach((x, i) => {
            let transpShort = x.transp.length > 15 ? x.transp.substring(0,12) + '...' : x.transp;

            const tr = `<tr>
                <td class="px-4 py-2">
                    <div class="font-bold text-white text-sm"><span class="text-slate-500 text-xs mr-1">${i+1}.</span>${x.placa}</div>
                    <div class="text-[10px] text-slate-400 truncate max-w-[100px]" title="${x.transp}">${transpShort}</div>
                </td>
                <td class="px-4 py-2">
                    <div class="font-bold text-white text-sm">${x.dtIn}</div>
                    <div class="text-xs text-slate-400 font-mono">${x.hrIn}</div>
                </td>
                <td class="px-4 py-2">
                    <div class="font-bold text-white text-sm">${x.dtOut}</div>
                    <div class="text-xs text-slate-400 font-mono">${x.hrOut}</div>
                </td>
                <td class="px-4 py-2 text-right">
                    <div class="font-mono text-white text-sm font-bold">${formatarHorasMinutos(x.ciclo)}</div>
                </td>
            </tr>`;
            bodyPiores.insertAdjacentHTML('beforeend', tr);
        });
    }
}