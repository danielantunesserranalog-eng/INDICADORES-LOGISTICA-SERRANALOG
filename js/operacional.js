// ==============================================================
// LÓGICA DO DASHBOARD OPERACIONAL DIÁRIO (Rankings Cruzados)
// ==============================================================

const opDatePicker = document.getElementById('opDatePicker');
const opStatusFetch = document.getElementById('opStatusFetch');
const btnOpQFs = document.querySelectorAll('.btn-op-qf');

// Tabelas de Ranking
const leaderboardBody = document.getElementById('leaderboardBody');
const leaderboardCicloBody = document.getElementById('leaderboardCicloBody');

// Displays (Metas)
const disp_v_prog = document.getElementById('disp_v_prog');
const disp_vol_prog = document.getElementById('disp_vol_prog');
const disp_cx_prog = document.getElementById('disp_cx_prog');
const disp_pbtc_prog = document.getElementById('disp_pbtc_prog');

const diasMultiplicador1 = document.getElementById('diasMultiplicador1');
const diasMultiplicador2 = document.getElementById('diasMultiplicador2');

// Displays Realizados
const disp_v_real = document.getElementById('disp_v_real');
const disp_vol_real = document.getElementById('disp_vol_real');
const disp_cx_real = document.getElementById('disp_cx_real');
const disp_pbtc_real = document.getElementById('disp_pbtc_real');

// Barras
const disp_v_perc = document.getElementById('disp_v_perc'); const bar_v_perc = document.getElementById('bar_v_perc');
const disp_vol_perc = document.getElementById('disp_vol_perc'); const bar_vol_perc = document.getElementById('bar_vol_perc');
const disp_cx_perc = document.getElementById('disp_cx_perc'); const bar_cx_perc = document.getElementById('bar_cx_perc');
const disp_pbtc_perc = document.getElementById('disp_pbtc_perc'); const bar_pbtc_perc = document.getElementById('bar_pbtc_perc');

let activeOpFilter = 'DATE'; 

btnOpQFs.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const qf = e.currentTarget.getAttribute('data-op-qf');
        setOpQuickFilterUI(qf);
        if(qf !== 'DATE') opDatePicker.value = ''; 
        updateOpDashboard();
    });
});

if (opDatePicker) {
    opDatePicker.addEventListener('change', () => {
        if(opDatePicker.value) { setOpQuickFilterUI('DATE'); updateOpDashboard(); }
    });
}

function setOpQuickFilterUI(qf) {
    activeOpFilter = qf;
    btnOpQFs.forEach(b => {
        if (b.getAttribute('data-op-qf') === qf) {
            b.classList.add('bg-emerald-900/50', 'text-emerald-400', 'border-emerald-800/50');
            b.classList.remove('text-slate-400', 'hover:bg-slate-700/50', 'border-transparent');
        } else {
            b.classList.remove('bg-emerald-900/50', 'text-emerald-400', 'border-emerald-800/50');
            b.classList.add('text-slate-400', 'hover:bg-slate-700/50', 'border-transparent');
        }
    });
}

function getFormattedDate(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function getSelectedDates() {
    const today = new Date();
    const dates = [];
    if (activeOpFilter === 'DATE') {
        if(opDatePicker.value) dates.push(opDatePicker.value); 
    } else if (activeOpFilter === 'D-1') {
        const d = new Date(today); d.setDate(d.getDate() - 1); dates.push(getFormattedDate(d));
    } else if (activeOpFilter === 'D-2') {
        const d = new Date(today); d.setDate(d.getDate() - 2); dates.push(getFormattedDate(d));
    } else if (activeOpFilter === 'D-7') {
        for(let i=0; i<7; i++) { const d = new Date(today); d.setDate(d.getDate() - i); dates.push(getFormattedDate(d)); }
    } else if (activeOpFilter === 'D-30') {
        for(let i=0; i<30; i++) { const d = new Date(today); d.setDate(d.getDate() - i); dates.push(getFormattedDate(d)); }
    }
    return dates;
}

function renderizarTabelaOperacional() {
    if (!opDatePicker.value && activeOpFilter === 'DATE') {
        opDatePicker.value = getFormattedDate(new Date());
    }
    updateOpDashboard();
}

function normalizarDataPT(dataStr) {
    if (!dataStr) return "";
    const parts = dataStr.split('/');
    if (parts.length === 3) return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
    return dataStr;
}

// FORMATADOR DE TEMPO ISOLADO
function formatarHorasMinutosJS(horasDecimais) {
    if (horasDecimais === null || horasDecimais === undefined || isNaN(horasDecimais) || horasDecimais === 0) return '-';
    const horas = Math.floor(horasDecimais);
    const minutos = Math.round((horasDecimais - horas) * 60);
    if (horas === 0 && minutos === 0) return '0m';
    if (horas === 0) return `${minutos}m`;
    if (minutos === 0) return `${horas}h`;
    return `${horas}h ${minutos.toString().padStart(2, '0')}m`;
}

async function updateOpDashboard() {
    const datesYMD = getSelectedDates();
    if (datesYMD.length === 0) return;
    const numDias = datesYMD.length;

    const datesDMY = datesYMD.map(d => { 
        const parts = d.split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; 
    });

    opStatusFetch.innerText = "Cruzando dados...";

    try {
        if (typeof fullHistoricoData === 'undefined' || fullHistoricoData.length === 0) {
            const { data } = await supabaseClient.from('historico_viagens').select('*');
            fullHistoricoData = data || [];
        }

        const viagensFiltradas = fullHistoricoData.filter(v => {
            const dataNormalizada = normalizarDataPT(v.dataDaBaseExcel);
            return datesDMY.includes(dataNormalizada);
        });
        
        const realViagens = viagensFiltradas.length;
        const realVolume = viagensFiltradas.reduce((sum, d) => sum + (d.volumeReal || 0), 0);
        const realPesoTot = viagensFiltradas.reduce((sum, d) => sum + (d.pesoLiquido || 0), 0) / 1000;
        const realCaixaMedia = realViagens > 0 ? (realVolume / realViagens) : 0;
        const realPbtcMedio = realViagens > 0 ? (realPesoTot / realViagens) : 0;

        disp_v_real.innerText = realViagens.toLocaleString('pt-PT');
        disp_vol_real.innerText = realVolume.toLocaleString('pt-PT', {maximumFractionDigits: 1});
        disp_cx_real.innerText = realCaixaMedia.toLocaleString('pt-PT', {maximumFractionDigits: 1});
        disp_pbtc_real.innerText = realPbtcMedio.toLocaleString('pt-PT', {maximumFractionDigits: 1});

        let configMeta = { v_prog: 0, vol_prog: 0, cx_prog: 0, pbtc_prog: 0 };
        try {
            const { data } = await supabaseClient.from('metas_globais').select('*').eq('id', 1).single();
            if(data) configMeta = data;
        } catch(e) {
            const local = localStorage.getItem('cfg_metas');
            if(local) configMeta = JSON.parse(local);
        }

        const targetV = configMeta.v_prog * numDias;
        const targetVol = configMeta.vol_prog * numDias;
        const targetCx = configMeta.cx_prog; 
        const targetPbtc = configMeta.pbtc_prog;

        diasMultiplicador1.innerText = `${numDias}d`;
        diasMultiplicador2.innerText = `${numDias}d`;
        disp_v_prog.innerText = targetV.toLocaleString('pt-PT');
        disp_vol_prog.innerText = targetVol.toLocaleString('pt-PT');
        disp_cx_prog.innerText = targetCx.toLocaleString('pt-PT');
        disp_pbtc_prog.innerText = targetPbtc.toLocaleString('pt-PT');

        calculatePerc(realViagens, targetV, disp_v_perc, bar_v_perc);
        calculatePerc(realVolume, targetVol, disp_vol_perc, bar_vol_perc);
        calculatePerc(realCaixaMedia, targetCx, disp_cx_perc, bar_cx_perc);
        calculatePerc(realPbtcMedio, targetPbtc, disp_pbtc_perc, bar_pbtc_perc);

        // Gera as Duas Tabelas de Ranking (Volume e Ciclo)
        renderTruckLeaderboards(viagensFiltradas);
        
        opStatusFetch.innerText = "Sincronizado.";
    } catch (err) {
        console.error("Erro painel operacional:", err);
        opStatusFetch.innerText = "Erro ao processar dados.";
    }
}

function calculatePerc(real, target, labelEl, barEl) {
    const perc = target > 0 ? (real / target) * 100 : 0;
    labelEl.innerText = perc.toFixed(1) + '%';
    barEl.style.width = Math.min(perc, 100) + '%';
    
    labelEl.classList.remove('text-emerald-400', 'text-blue-400', 'text-amber-400', 'text-rose-400');
    if(perc >= 100) { labelEl.classList.add('text-emerald-400'); } 
    else {
        if(labelEl.id === 'disp_v_perc') labelEl.classList.add('text-blue-400');
        else if(labelEl.id === 'disp_vol_perc') labelEl.classList.add('text-emerald-400');
        else if(labelEl.id === 'disp_cx_perc') labelEl.classList.add('text-amber-400');
        else if(labelEl.id === 'disp_pbtc_perc') labelEl.classList.add('text-rose-400');
    }
}

// GERAÇÃO DOS DOIS RANKINGS LADO A LADO
function renderTruckLeaderboards(viagens) {
    if (leaderboardBody) leaderboardBody.innerHTML = '';
    if (leaderboardCicloBody) leaderboardCicloBody.innerHTML = '';

    if (viagens.length === 0) {
        if(leaderboardBody) leaderboardBody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-slate-500 font-medium">Nenhuma viagem no período selecionado.</td></tr>`;
        if(leaderboardCicloBody) leaderboardCicloBody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-slate-500 font-medium">Nenhum dado de ciclo no período.</td></tr>`;
        return;
    }

    const map = new Map();
    viagens.forEach(v => {
        const placa = (v.placa && v.placa.trim() !== '-' && v.placa.trim() !== '') ? v.placa.trim().toUpperCase() : 'DESCONHECIDA';
        if (placa === 'DESCONHECIDA') return;
        if (!map.has(placa)) map.set(placa, { placa: placa, transp: v.transportadora, qtdViagens: 0, volumeTotal: 0, somaCiclo: 0, qtdCicloValido: 0 });
        
        const d = map.get(placa);
        d.qtdViagens += 1; 
        d.volumeTotal += (v.volumeReal || 0); 
        if (v.cicloHoras > 0) { d.somaCiclo += v.cicloHoras; d.qtdCicloValido += 1; }
    });

    const arrayBase = Array.from(map.values());

    // -----------------------------------------------------
    // 1. RANKING POR VOLUME (Mais Produtivos)
    // -----------------------------------------------------
    const arrayVolume = [...arrayBase].sort((a, b) => b.volumeTotal - a.volumeTotal);
    const maxViagens = Math.max(...arrayVolume.map(c => c.qtdViagens), 1);

    arrayVolume.forEach((c, index) => {
        let posBadge = `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-[10px] font-bold border border-slate-700">${index + 1}</span>`;
        if (index === 0) posBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]"><i class="fas fa-trophy"></i></span>`;
        else if (index === 1) posBadge = `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300/20 text-slate-300 text-[10px] font-bold border border-slate-300/50">2</span>`;
        else if (index === 2) posBadge = `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-700/20 text-emerald-600 text-[10px] font-bold border border-emerald-700/50">3</span>`;

        const pctBar = (c.qtdViagens / maxViagens) * 100;

        if(leaderboardBody) {
            leaderboardBody.insertAdjacentHTML('beforeend', `
                <tr class="hover:bg-slate-800/60 transition-colors border-b border-slate-800/50 group">
                    <td class="px-4 py-3 text-center">${posBadge}</td>
                    <td class="px-4 py-3 font-bold text-emerald-400 tracking-wider text-[11px]"><i class="fas fa-truck mr-2 text-slate-600 group-hover:text-emerald-500"></i>${c.placa}</td>
                    <td class="px-4 py-3 text-[11px] font-medium text-slate-300 truncate max-w-[100px]">${c.transp}</td>
                    <td class="px-4 py-3 w-28">
                        <div class="flex items-center justify-between mb-1"><span class="text-[11px] font-black text-white">${c.qtdViagens}</span></div>
                        <div class="w-full bg-slate-800 rounded-full h-1.5 shadow-inner"><div class="bg-sky-500 h-1.5 rounded-full" style="width: ${pctBar}%"></div></div>
                    </td>
                    <td class="px-4 py-3 text-right font-black text-white text-[11px]">${c.volumeTotal.toLocaleString('pt-PT', {maximumFractionDigits: 1})}</td>
                </tr>
            `);
        }
    });

    // -----------------------------------------------------
    // 2. RANKING POR CICLO MÉDIO (Mais Rápidos)
    // -----------------------------------------------------
    // Só entra quem teve algum ciclo registrado
    const arrayCiclo = [...arrayBase]
        .filter(c => c.qtdCicloValido > 0)
        .map(c => { c.mediaCiclo = c.somaCiclo / c.qtdCicloValido; return c; })
        .sort((a, b) => a.mediaCiclo - b.mediaCiclo); // Ordem crescente (do menor tempo para o maior)

    if (arrayCiclo.length === 0 && leaderboardCicloBody) {
        leaderboardCicloBody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-slate-500 font-medium">Sem registro de ciclos para calcular o tempo.</td></tr>`;
    }

    arrayCiclo.forEach((c, index) => {
        const strCiclo = formatarHorasMinutosJS(c.mediaCiclo);

        let posBadge = `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-[10px] font-bold border border-slate-700">${index + 1}</span>`;
        if (index === 0) posBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-bold shadow-[0_0_10px_rgba(56,189,248,0.3)]"><i class="fas fa-medal"></i></span>`;
        else if (index === 1) posBadge = `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300/20 text-slate-300 text-[10px] font-bold border border-slate-300/50">2</span>`;
        else if (index === 2) posBadge = `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-700/20 text-sky-600 text-[10px] font-bold border border-sky-700/50">3</span>`;

        if(leaderboardCicloBody) {
            leaderboardCicloBody.insertAdjacentHTML('beforeend', `
                <tr class="hover:bg-slate-800/60 transition-colors border-b border-slate-800/50 group">
                    <td class="px-4 py-3 text-center">${posBadge}</td>
                    <td class="px-4 py-3 font-bold text-sky-400 tracking-wider text-[11px]"><i class="fas fa-truck mr-2 text-slate-600 group-hover:text-sky-500"></i>${c.placa}</td>
                    <td class="px-4 py-3 text-[11px] font-medium text-slate-300 truncate max-w-[100px]">${c.transp}</td>
                    <td class="px-4 py-3 text-center font-bold text-white text-[11px]">${c.qtdViagens}</td>
                    <td class="px-4 py-3 text-right font-black text-[12px] ${c.mediaCiclo > 8 ? 'text-rose-400' : 'text-sky-300'}">${strCiclo}</td>
                </tr>
            `);
        }
    });
}