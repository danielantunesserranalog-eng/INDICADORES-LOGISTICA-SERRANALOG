// ==========================================
// js/operacional.js - METAS OPERACIONAIS
// ==========================================

let dadosHistorico = [];
let metasBase = { v_prog: 0, vol_prog: 0, cx_prog: 0, pbtc_prog: 0 };
let multiplicadorDias = 1;
let modoFiltro = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
    inicializarEventosFiltros();
    carregarDados();
});

function inicializarEventosFiltros() {
    const qfBtns = document.querySelectorAll('.btn-op-qf');
    const datePicker = document.getElementById('opDatePicker');

    qfBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            qfBtns.forEach(b => {
                b.classList.remove('active', 'border-emerald-500/50', 'text-emerald-400', 'bg-emerald-900/30');
                b.classList.add('border-transparent', 'text-slate-400');
            });
            e.target.classList.add('active', 'border-emerald-500/50', 'text-emerald-400', 'bg-emerald-900/30');
            e.target.classList.remove('border-transparent', 'text-slate-400');
            
            modoFiltro = e.target.getAttribute('data-op-qf');
            
            // Define o multiplicador para as metas de volume e viagem
            if (modoFiltro === 'D-1' || modoFiltro === 'D-2') multiplicadorDias = 1;
            else if (modoFiltro === 'D-7') multiplicadorDias = 7;
            else if (modoFiltro === 'D-30') multiplicadorDias = 30;
            else multiplicadorDias = 1; // Para "ALL", não multiplicaremos pelo absurdo de dias
            
            datePicker.value = '';
            processarTela();
        });
    });

    datePicker.addEventListener('change', () => {
        if(datePicker.value) {
            qfBtns.forEach(b => {
                b.classList.remove('active', 'border-emerald-500/50', 'text-emerald-400', 'bg-emerald-900/30');
                b.classList.add('border-transparent', 'text-slate-400');
            });
            modoFiltro = 'CUSTOM';
            multiplicadorDias = 1;
            processarTela();
        }
    });
}

async function carregarDados() {
    try {
        const lblStatus = document.getElementById('opStatusFetch');
        lblStatus.innerText = "Sincronizando com a nuvem...";

        // 1. Busca as Metas
        const { data: mData } = await supabaseClient.from('metas_globais').select('*').eq('id', 1).single();
        if (mData) {
            metasBase.v_prog = mData.v_prog || 0;
            metasBase.vol_prog = mData.vol_prog || 0;
            metasBase.cx_prog = mData.cx_prog || 0;
            metasBase.pbtc_prog = mData.pbtc_prog || 0;
        }

        // 2. Busca Viagens
        const { data: vData } = await supabaseClient.from('historico_viagens').select('*');
        if (vData) dadosHistorico = vData;

        lblStatus.innerText = "Atualizado com sucesso.";
        setTimeout(() => lblStatus.innerText = "", 3000);

        processarTela();
    } catch(e) {
        console.error("Erro na tela operacional:", e);
    }
}

function processarTela() {
    let dadosFiltrados = dadosHistorico;

    // Lógica de filtro por Data
    if (modoFiltro !== 'ALL') {
        const hj = new Date(); hj.setHours(0,0,0,0);
        
        dadosFiltrados = dadosHistorico.filter(d => {
            const parsedDt = parseDateTime(d.dataDaBaseExcel, null);
            if (!parsedDt) return false;
            parsedDt.setHours(0,0,0,0);
            
            if (modoFiltro === 'CUSTOM') {
                const pickDate = new Date(document.getElementById('opDatePicker').value + 'T00:00:00');
                return parsedDt.getTime() === pickDate.getTime();
            } else {
                const diffDias = Math.round((hj - parsedDt) / 86400000);
                if (modoFiltro === 'D-1') return diffDias === 1;
                if (modoFiltro === 'D-2') return diffDias === 2;
                if (modoFiltro === 'D-7') return diffDias >= 0 && diffDias <= 7;
                if (modoFiltro === 'D-30') return diffDias >= 0 && diffDias <= 30;
            }
            return true;
        });
    }

    // Calcula Acumulados Reais
    const totalVReal = dadosFiltrados.length;
    const totalVolReal = dadosFiltrados.reduce((acc, curr) => acc + (curr.volumeReal || 0), 0);
    const totalPesoKg = dadosFiltrados.reduce((acc, curr) => acc + (curr.pesoLiquido || 0), 0);
    
    const mediaCxReal = totalVReal > 0 ? totalVolReal / totalVReal : 0;
    const mediaPbtcReal = totalVReal > 0 ? (totalPesoKg / 1000) / totalVReal : 0;

    // Metas Calculadas pelo Multiplicador
    const metaViagemCalc = metasBase.v_prog * multiplicadorDias;
    const metaVolCalc = metasBase.vol_prog * multiplicadorDias;
    
    // Atualiza Labels de "Dias" nos Cards
    document.getElementById('diasMultiplicador1').innerText = `${multiplicadorDias}d`;
    document.getElementById('diasMultiplicador2').innerText = `${multiplicadorDias}d`;

    // Função auxiliar para injetar metas na UI
    function updateCard(idProg, idReal, idPerc, idBar, vProg, vReal) {
        document.getElementById(idProg).innerText = vProg.toLocaleString('pt-PT', { maximumFractionDigits: 1 });
        document.getElementById(idReal).innerText = vReal.toLocaleString('pt-PT', { maximumFractionDigits: 1 });
        
        const perc = vProg > 0 ? (vReal / vProg) * 100 : 0;
        const percLabel = Math.min(perc, 100).toFixed(1);
        
        document.getElementById(idPerc).innerText = `${percLabel}%`;
        document.getElementById(idBar).style.width = `${Math.min(perc, 100)}%`;
    }

    updateCard('disp_v_prog', 'disp_v_real', 'disp_v_perc', 'bar_v_perc', metaViagemCalc, totalVReal);
    updateCard('disp_vol_prog', 'disp_vol_real', 'disp_vol_perc', 'bar_vol_perc', metaVolCalc, totalVolReal);
    updateCard('disp_cx_prog', 'disp_cx_real', 'disp_cx_perc', 'bar_cx_perc', metasBase.cx_prog, mediaCxReal);
    updateCard('disp_pbtc_prog', 'disp_pbtc_real', 'disp_pbtc_perc', 'bar_pbtc_perc', metasBase.pbtc_prog, mediaPbtcReal);

    // ===================================
    // Lógica dos Leaderboards
    // ===================================
    const mapaPlacas = new Map();
    
    dadosFiltrados.forEach(d => {
        const p = d.placa || 'Sem Placa';
        if (p === '-' || p === 'Sem Placa') return;
        
        if (!mapaPlacas.has(p)) {
            mapaPlacas.set(p, { placa: p, transp: d.transportadora, viagens: 0, volume: 0, somaCiclos: 0, qtdCiclos: 0 });
        }
        
        const obj = mapaPlacas.get(p);
        obj.viagens++;
        obj.volume += (d.volumeReal || 0);
        if (d.cicloHoras > 0) {
            obj.somaCiclos += d.cicloHoras;
            obj.qtdCiclos++;
        }
    });

    const arrayPlacas = Array.from(mapaPlacas.values());

    // 1. Top Volume (Maior para o Menor)
    const topVolume = [...arrayPlacas].sort((a, b) => b.volume - a.volume).slice(0, 10);
    const tbVol = document.getElementById('leaderboardBody');
    tbVol.innerHTML = '';
    topVolume.forEach((item, index) => {
        const medal = index === 0 ? '<i class="fas fa-medal text-amber-400 text-lg"></i>' : 
                      index === 1 ? '<i class="fas fa-medal text-slate-300 text-lg"></i>' : 
                      index === 2 ? '<i class="fas fa-medal text-amber-700 text-lg"></i>' : `${index + 1}º`;
        
        tbVol.insertAdjacentHTML('beforeend', `<tr>
            <td class="px-4 py-3 font-bold text-slate-400 text-center">${medal}</td>
            <td class="px-4 py-3 font-bold text-emerald-400">${item.placa}</td>
            <td class="px-4 py-3 text-slate-300 text-[11px] truncate max-w-[120px]">${item.transp}</td>
            <td class="px-4 py-3 text-center text-sky-300 font-bold">${item.viagens}</td>
            <td class="px-4 py-3 text-right font-bold text-white">${item.volume.toLocaleString('pt-PT', {maximumFractionDigits:1})}</td>
        </tr>`);
    });

    // 2. Top Ciclo (Menor para o Maior)
    const tbCiclo = document.getElementById('leaderboardCicloBody');
    tbCiclo.innerHTML = '';
    
    // Filtra placas que tenham pelo menos 1 ciclo registrado para entrar no ranking
    const placasComCiclo = arrayPlacas.filter(p => p.qtdCiclos > 0);
    placasComCiclo.forEach(p => p.mediaCiclo = p.somaCiclos / p.qtdCiclos);
    
    const topCiclo = placasComCiclo.sort((a, b) => a.mediaCiclo - b.mediaCiclo).slice(0, 10);
    
    topCiclo.forEach((item, index) => {
        const medal = index === 0 ? '<i class="fas fa-trophy text-amber-400 text-lg"></i>' : `${index + 1}º`;
        tbCiclo.insertAdjacentHTML('beforeend', `<tr>
            <td class="px-4 py-3 font-bold text-slate-400 text-center">${medal}</td>
            <td class="px-4 py-3 font-bold text-sky-400">${item.placa}</td>
            <td class="px-4 py-3 text-slate-300 text-[11px] truncate max-w-[120px]">${item.transp}</td>
            <td class="px-4 py-3 text-center text-emerald-300 font-bold">${item.viagens}</td>
            <td class="px-4 py-3 text-right font-bold text-white">${formatarHorasMinutos(item.mediaCiclo)}</td>
        </tr>`);
    });
}