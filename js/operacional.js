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

        // CORREÇÃO MESTRA 1: Buscando os dados com loop de paginação para quebrar o limite de 1000 do Supabase
        let historico = [];
        let from = 0;
        const step = 1000;
        let fetchMore = true;

        while (fetchMore) {
            const { data, error } = await supabaseClient
                .from('historico_viagens')
                .select('*')
                .range(from, from + step - 1);
            
            if (error) {
                console.error(error);
                break;
            }
            if (data && data.length > 0) {
                historico = historico.concat(data);
                from += step;
            }
            if (!data || data.length < step) {
                fetchMore = false;
            }
        }
        
        if(historico && historico.length > 0) {
            fullHistoricoDataOp = historico.reverse();
        }

        // Buscar Manutenções do banco secundário também paginado
        try {
            let manutencoes = [];
            let fromManut = 0;
            let fetchMoreManut = true;
            
            while (fetchMoreManut) {
                const { data: mData, error: errManut } = await supabaseManutencao
                    .from('ordens_servico')
                    .select('*')
                    .range(fromManut, fromManut + step - 1);
                
                if(errManut) break;
                if(mData && mData.length > 0) {
                    manutencoes = manutencoes.concat(mData);
                    fromManut += step;
                }
                if(!mData || mData.length < step) {
                    fetchMoreManut = false;
                }
            }
            if(manutencoes.length > 0) {
                fullHistoricoManutencao = manutencoes;
            }
        } catch(errManutencao) {
            console.error("Erro ao carregar manutenções do banco:", errManutencao);
        }

        if(fullHistoricoDataOp.length > 0) {
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
        
        // Usa o parser global que já funciona perfeitamente para todas as datas
        const parsed = parseDateTime(d.dataDaBaseExcel, null);
        if(!parsed) return false;

        parsed.setHours(0,0,0,0); 
        const hj = new Date(); hj.setHours(0,0,0,0);

        if (activeQuickFilterOp === 'DATE' && dataRef) {
            const dr = new Date(dataRef + "T00:00:00");
            dr.setHours(0,0,0,0);
            return parsed.getTime() === dr.getTime();
        }

        const diff = Math.round((hj - parsed)/86400000);
        if (activeQuickFilterOp === 'D-1') return diff === 1;
        if (activeQuickFilterOp === 'D-2') return diff === 2;
        if (activeQuickFilterOp === 'D-7') return diff >= 0 && diff <= 7;
        if (activeQuickFilterOp === 'D-30') return diff >= 0 && diff <= 30;
        if (activeQuickFilterOp === 'SEM') {
            const inicioSemana = new Date(hj);
            inicioSemana.setDate(hj.getDate() - hj.getDay());
            return (parsed >= inicioSemana && parsed <= hj);
        }
        if (activeQuickFilterOp === 'MES') {
            return (parsed.getMonth() === hj.getMonth() && parsed.getFullYear() === hj.getFullYear());
        }
        return false;
    });

    // Filtro de Manutenção
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
        if (activeQuickFilterOp === 'SEM') {
            const inicioSemana = new Date(hj);
            inicioSemana.setDate(hj.getDate() - hj.getDay());
            return (parsed >= inicioSemana && parsed <= hj);
        }
        if (activeQuickFilterOp === 'MES') {
            return (parsed.getMonth() === hj.getMonth() && parsed.getFullYear() === hj.getFullYear());
        }
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
    else if (activeQuickFilterOp === 'SEM') diasConsiderados = new Date().getDay() + 1; 
    else if (activeQuickFilterOp === 'MES') diasConsiderados = new Date().getDate(); 

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
    
    // CORREÇÃO 2: Exibir métricas e metas baseadas no panorama Global para igualar à Visão Geral
    if(lblMultiplicador1) lblMultiplicador1.innerText = `${diasConsiderados}d | F:${placasUnicasGlobal} (Global)`;
    if(lblMultiplicador2) lblMultiplicador2.innerText = `${diasConsiderados}d`;

    const totalV_Global = filteredGlobal.length;
    const metaV = (metasGlobais.v_prog || 0) * (placasUnicasGlobal === 0 ? 0 : placasUnicasGlobal) * diasConsiderados;
    
    document.getElementById('disp_v_prog').innerText = metaV;
    document.getElementById('disp_v_real').innerText = totalV_Global;
    atualizarBarra('bar_v_perc', 'disp_v_perc', totalV_Global, metaV);

    const totalVol_Global = filteredGlobal.reduce((s,x)=>s+(parseFloat(String(x.volumeReal).replace(',','.'))||0), 0);
    const metaVol = (metasGlobais.vol_prog || 0) * diasConsiderados; 
    document.getElementById('disp_vol_prog').innerText = metaVol.toLocaleString('pt-PT');
    document.getElementById('disp_vol_real').innerText = totalVol_Global.toLocaleString('pt-PT', {maximumFractionDigits:1});
    atualizarBarra('bar_vol_perc', 'disp_vol_perc', totalVol_Global, metaVol);

    const mediaCx = totalV_Global > 0 ? (totalVol_Global / totalV_Global) : 0;
    const metaCx = metasGlobais.cx_prog || 0;
    document.getElementById('disp_cx_prog').innerText = metaCx;
    document.getElementById('disp_cx_real').innerText = mediaCx.toLocaleString('pt-PT', {maximumFractionDigits:2});
    atualizarBarra('bar_cx_perc', 'disp_cx_perc', mediaCx, metaCx);

    const totalP_Global = filteredGlobal.reduce((s,x)=>s+(parseFloat(String(x.pesoLiquido).replace(',','.'))||0), 0)/1000;
    const mediaPbtc = totalV_Global > 0 ? (totalP_Global / totalV_Global) : 0;
    const metaPbtc = metasGlobais.pbtc_prog || 0;
    document.getElementById('disp_pbtc_prog').innerText = metaPbtc;
    
    let pbtcCor = "text-white";
    let pbtcIcone = "";
    
    if (mediaPbtc > 0) {
        if (mediaPbtc < 74) {
            pbtcCor = "text-yellow-400";
            pbtcIcone = '<i class="fas fa-exclamation-triangle text-yellow-400 text-sm ml-2" title="Abaixo do ideal"></i>';
        } else if (mediaPbtc >= 74 && mediaPbtc <= 77.7) {
            pbtcCor = "text-green-400";
            pbtcIcone = '<i class="fas fa-check-circle text-green-400 text-sm ml-2" title="Ideal"></i>';
        } else if (mediaPbtc > 77.7) {
            pbtcCor = "text-red-500";
            pbtcIcone = '<i class="fas fa-times-circle text-red-500 text-sm ml-2" title="Acima do ideal"></i>';
        }
    }
    document.getElementById('disp_pbtc_real').innerHTML = `<span class="${pbtcCor}">${mediaPbtc.toLocaleString('pt-PT', {maximumFractionDigits:2})}</span>${pbtcIcone}`;
    
    atualizarBarra('bar_pbtc_perc', 'disp_pbtc_perc', mediaPbtc, metaPbtc);

    // Gráficos
    // CORREÇÃO 3: Desenhar a Evolução Diária com TODOS os dados e não apenas o dia filtrado
    renderEvolucaoChart(fullHistoricoDataOp);
    
    renderProjecaoChart(filteredGlobal); 
    renderManutencaoChart(filteredManutencao); 

    // Renderiza Tabelas
    renderLeaderboards(filteredSerrana);
    renderManutencaoTables(filteredManutencao); 
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
        .slice(0, 5);

    const topTipos = Array.from(tipoMap.entries())
        .map(([tipo, qtd]) => ({ tipo, qtd }))
        .sort((a, b) => b.qtd - a.qtd);

    const bCaminhoes = document.getElementById('leaderboardCaminhoesQuebram');
    if (bCaminhoes) {
        bCaminhoes.innerHTML = '';
        topPlacas.forEach((x, i) => {
            const tr = `<tr>
                <td class="px-4 py-3 text-center"><div class="w-6 h-6 rounded-full ${i<3?'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]':'bg-slate-800 text-slate-400'} flex items-center justify-center text-xs font-bold">${i+1}</div></td>
                <td class="px-4 py-3 font-bold text-white text-base">${x.placa}</td>
                <td class="px-4 py-3 text-right font-mono text-white text-lg font-bold">${x.qtd}</td>
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
                <td class="px-4 py-3 font-bold text-white text-base max-w-[150px] truncate" title="${x.tipo}">${x.tipo}</td>
                <td class="px-4 py-3 text-right font-mono text-white text-lg font-bold">${x.qtd}</td>
                <td class="px-4 py-3 text-right font-mono text-slate-400 text-sm">${perc.toFixed(1)}%</td>
            </tr>`;
            bTipos.insertAdjacentHTML('beforeend', tr);
        });

        if (topTipos.length === 0) {
            bTipos.innerHTML = '<tr><td colspan="3" class="px-4 py-4 text-center text-slate-500">Nenhuma ocorrência no período</td></tr>';
        }
    }
}

function renderDashboardsGerenciais(data) {
    const tMap = new Map();
    data.forEach(d => {
        const tr = d.transportadora || 'N/A';
        const vol = parseFloat(String(d.volumeReal).replace(',', '.')) || 0;
        if(!tMap.has(tr)) tMap.set(tr, {vol:0, v:0});
        const o = tMap.get(tr);
        o.vol += vol; o.v++;
    });

    const arr = Array.from(tMap.entries()).map(x => ({t: x[0], vol: x[1].vol, v: x[1].v})).sort((a,b)=>b.vol - a.vol);
    const totVol = arr.reduce((s,x)=>s+x.vol, 0);

    const bPerf = document.getElementById('perfTranspBody');
    if(bPerf) {
        bPerf.innerHTML = '';
        arr.forEach(x => {
            const perc = totVol > 0 ? (x.vol/totVol)*100 : 0;
            const tr = `<tr><td class="px-4 py-3 font-bold text-white">${x.t}</td><td class="px-4 py-3 text-center text-slate-300">${x.v}</td><td class="px-4 py-3 text-right font-mono text-emerald-400">${x.vol.toLocaleString('pt-PT',{maximumFractionDigits:1})}</td><td class="px-4 py-3 text-right font-mono text-sky-400">${perc.toFixed(1)}%</td></tr>`;
            bPerf.insertAdjacentHTML('beforeend', tr);
        });
    }

    const tRes = document.getElementById('resumoOperacionalBody');
    if(tRes) {
        const dSerrana = data.filter(d=>String(d.transportadora||'').toUpperCase().includes('SERRANALOG'));
        const dOutras = data.filter(d=>!String(d.transportadora||'').toUpperCase().includes('SERRANALOG'));
        
        const calcResumo = (arrD) => {
            const v = arrD.length;
            const vol = arrD.reduce((s,x)=>s+(parseFloat(String(x.volumeReal).replace(',','.'))||0),0);
            return {v, vol};
        };

        const rS = calcResumo(dSerrana);
        const rO = calcResumo(dOutras);
        const rG = calcResumo(data);

        tRes.innerHTML = `
            <tr class="hover:bg-slate-800/30 transition-colors border-b border-slate-700/50">
                <td class="px-4 py-3 font-bold text-white">Serranalog</td>
                <td class="px-4 py-3 text-center font-mono text-slate-300">${rS.v}</td>
                <td class="px-4 py-3 text-right font-mono text-emerald-400">${rS.vol.toLocaleString('pt-PT',{maximumFractionDigits:1})}</td>
                <td class="px-4 py-3 text-right font-mono text-sky-400">${rG.vol>0?((rS.vol/rG.vol)*100).toFixed(1):'0.0'}%</td>
            </tr>
            <tr class="hover:bg-slate-800/30 transition-colors border-b border-slate-700/50">
                <td class="px-4 py-3 font-bold text-white">Terceiros</td>
                <td class="px-4 py-3 text-center font-mono text-slate-300">${rO.v}</td>
                <td class="px-4 py-3 text-right font-mono text-emerald-400">${rO.vol.toLocaleString('pt-PT',{maximumFractionDigits:1})}</td>
                <td class="px-4 py-3 text-right font-mono text-sky-400">${rG.vol>0?((rO.vol/rG.vol)*100).toFixed(1):'0.0'}%</td>
            </tr>
            <tr class="bg-slate-800/50 border-t border-slate-600">
                <td class="px-4 py-3 font-bold text-white uppercase tracking-wider text-xs">Total Global</td>
                <td class="px-4 py-3 text-center font-mono font-bold text-white">${rG.v}</td>
                <td class="px-4 py-3 text-right font-mono font-bold text-emerald-400">${rG.vol.toLocaleString('pt-PT',{maximumFractionDigits:1})}</td>
                <td class="px-4 py-3 text-right font-mono font-bold text-sky-400">100.0%</td>
            </tr>
        `;
    }
}