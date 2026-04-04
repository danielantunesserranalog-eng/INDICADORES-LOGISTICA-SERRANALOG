// ==========================================
// js/operacional.js - LÓGICA DO PAINEL DE METAS
// ==========================================

let fullHistoricoDataOp = [];
let metasGlobais = {};
let activeQuickFilterOp = 'ALL';

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

        const { data: historico } = await supabaseClient.from('historico_viagens').select('*');
        if(historico) {
            fullHistoricoDataOp = historico;
            const allDates = [...new Set(historico.map(d => d.dataDaBaseExcel))].filter(d => d && d !== 'Desconhecida');
            verificarStatusAtualizacao(allDates);
            atualizarPainelOperacional();
        }
    } catch(e) { console.error("Erro ao carregar dados operacionais:", e); }
}

function atualizarPainelOperacional() {
    const dataRef = document.getElementById('opDatePicker') ? document.getElementById('opDatePicker').value : null;
    let diasConsiderados = 1;

    const filtered = fullHistoricoDataOp.filter(d => {
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

    if(activeQuickFilterOp === 'ALL') {
        const dts = new Set(filtered.map(x=>x.dataDaBaseExcel));
        diasConsiderados = dts.size || 1;
    } else if (activeQuickFilterOp === 'D-7') diasConsiderados = 7;
    else if (activeQuickFilterOp === 'D-30') diasConsiderados = 30;

    document.getElementById('opStatusFetch').innerText = `${filtered.length} viagens em ${diasConsiderados} dia(s)`;
    
    document.getElementById('diasMultiplicador1').innerText = `${diasConsiderados}d`;
    document.getElementById('diasMultiplicador2').innerText = `${diasConsiderados}d`;

    const totalV = filtered.length;
    const metaV = (metasGlobais.v_prog || 0) * diasConsiderados;
    document.getElementById('disp_v_prog').innerText = metaV;
    document.getElementById('disp_v_real').innerText = totalV;
    atualizarBarra('bar_v_perc', 'disp_v_perc', totalV, metaV);

    const totalVol = filtered.reduce((s,x)=>s+(x.volumeReal||0), 0);
    const metaVol = (metasGlobais.vol_prog || 0) * diasConsiderados;
    document.getElementById('disp_vol_prog').innerText = metaVol.toLocaleString('pt-PT');
    document.getElementById('disp_vol_real').innerText = totalVol.toLocaleString('pt-PT', {maximumFractionDigits:1});
    atualizarBarra('bar_vol_perc', 'disp_vol_perc', totalVol, metaVol);

    const mediaCx = totalV > 0 ? (totalVol/totalV) : 0;
    const metaCx = metasGlobais.cx_prog || 0;
    document.getElementById('disp_cx_prog').innerText = metaCx;
    document.getElementById('disp_cx_real').innerText = mediaCx.toLocaleString('pt-PT', {maximumFractionDigits:2});
    atualizarBarra('bar_cx_perc', 'disp_cx_perc', mediaCx, metaCx);

    const totalP = filtered.reduce((s,x)=>s+(x.pesoLiquido||0), 0)/1000;
    const mediaPbtc = totalV > 0 ? (totalP/totalV) : 0;
    const metaPbtc = metasGlobais.pbtc_prog || 0;
    document.getElementById('disp_pbtc_prog').innerText = metaPbtc;
    document.getElementById('disp_pbtc_real').innerText = mediaPbtc.toLocaleString('pt-PT', {maximumFractionDigits:2});
    atualizarBarra('bar_pbtc_perc', 'disp_pbtc_perc', mediaPbtc, metaPbtc);

    renderLeaderboards(filtered);
}

function atualizarBarra(barId, txtId, real, meta) {
    const perc = meta > 0 ? Math.min((real/meta)*100, 100) : 0;
    const b = document.getElementById(barId);
    const t = document.getElementById(txtId);
    if(b) b.style.width = `${perc}%`;
    if(t) t.innerText = `${perc.toFixed(1)}%`;
}

function renderLeaderboards(data) {
    const pMap = new Map();
    data.forEach(d => {
        const pl = d.placa || 'N/A';
        if(!pMap.has(pl)) pMap.set(pl, {p: pl, t: d.transportadora||'-', vol: 0, v: 0, ciclos: 0, cCount: 0});
        const o = pMap.get(pl);
        o.vol += (d.volumeReal||0); o.v++;
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