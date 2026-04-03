// ==============================================================
// LÓGICA DO DASHBOARD OPERACIONAL DIÁRIO (ISOLADO DO APP.JS)
// ==============================================================

const opDatePicker = document.getElementById('opDatePicker');
const btnSalvarOp = document.getElementById('btnSalvarOp');
const opStatusFetch = document.getElementById('opStatusFetch');

// Inputs Programados (Editáveis)
const inp_v_prog = document.getElementById('inp_v_prog');
const inp_vol_prog = document.getElementById('inp_vol_prog');
const inp_cx_prog = document.getElementById('inp_cx_prog');
const inp_pbtc_real = document.getElementById('inp_pbtc_real');

// Displays Realizados (Lidos do Banco)
const disp_v_real = document.getElementById('disp_v_real');
const disp_vol_real = document.getElementById('disp_vol_real');
const disp_cx_real = document.getElementById('disp_cx_real');

// Displays e Barras de Porcentagem
const disp_v_perc = document.getElementById('disp_v_perc');
const bar_v_perc = document.getElementById('bar_v_perc');

const disp_vol_perc = document.getElementById('disp_vol_perc');
const bar_vol_perc = document.getElementById('bar_vol_perc');

const disp_cx_perc = document.getElementById('disp_cx_perc');
const bar_cx_perc = document.getElementById('bar_cx_perc');

// Função chamada pelo app.js quando entra na aba "Operacional"
function renderizarTabelaOperacional() {
    // Se o seletor de data estiver vazio, coloca a data de hoje
    if (!opDatePicker.value) {
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        opDatePicker.value = todayStr;
    }
    updateOpDashboard();
}

async function updateOpDashboard() {
    const selectedDateStr = opDatePicker.value; // Ex: 2026-04-01
    if (!selectedDateStr) return;

    // 1. Converter YYYY-MM-DD para DD/MM/YYYY (formato que está no historico_viagens)
    const parts = selectedDateStr.split('-');
    const searchDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

    opStatusFetch.innerText = "Consultando banco de dados...";
    opStatusFetch.className = "text-xs font-mono text-emerald-400 hidden md:block animate-pulse";

    try {
        // 2. Buscar no Supabase diretamente e isoladamente para não mexer no Dashboard Principal
        const { data: viagensDoDia, error } = await supabaseClient
            .from('historico_viagens')
            .select('volumeReal')
            .eq('dataDaBaseExcel', searchDate);

        if (error) throw error;

        // Calcular os totais reais
        const realViagens = viagensDoDia.length;
        const realVolume = viagensDoDia.reduce((sum, d) => sum + (d.volumeReal || 0), 0);
        const realCaixa = realViagens > 0 ? (realVolume / realViagens) : 0;

        // Atualiza a tela com o que a operação realmente fez neste dia
        disp_v_real.innerText = realViagens;
        disp_vol_real.innerText = realVolume.toLocaleString('pt-PT', {maximumFractionDigits: 1});
        disp_cx_real.innerText = realCaixa.toLocaleString('pt-PT', {maximumFractionDigits: 1});

        // 3. Carregar METAS PROGRAMADAS salvas localmente
        const savedData = JSON.parse(localStorage.getItem('serranalog_metas_dash') || '{}');
        const dayData = savedData[selectedDateStr] || { v_prog: '', vol_prog: '', cx_prog: '', pbtc_real: '' };

        inp_v_prog.value = dayData.v_prog;
        inp_vol_prog.value = dayData.vol_prog;
        inp_cx_prog.value = dayData.cx_prog;
        inp_pbtc_real.value = dayData.pbtc_real;

        // 4. Calcular Porcentagens
        calculateOpPercents(realViagens, realVolume, realCaixa);

        opStatusFetch.innerText = "Dados atualizados com sucesso do banco.";
        opStatusFetch.className = "text-xs font-mono text-slate-500 hidden md:block";

    } catch (err) {
        console.error("Erro ao buscar dados reais do dia:", err);
        opStatusFetch.innerText = "Falha ao conectar com banco de dados.";
        opStatusFetch.className = "text-xs font-mono text-rose-400 hidden md:block";
    }
}

function calculateOpPercents(realV, realVol, realCx) {
    if (realV === undefined) {
         realV = parseFloat(disp_v_real.innerText) || 0;
         realVol = parseFloat(disp_vol_real.innerText.replace(/\./g, '').replace(',', '.')) || 0;
         realCx = parseFloat(disp_cx_real.innerText.replace(/\./g, '').replace(',', '.')) || 0;
    }

    const progV = parseFloat(inp_v_prog.value) || 0;
    const progVol = parseFloat(inp_vol_prog.value) || 0;
    const progCx = parseFloat(inp_cx_prog.value) || 0;

    const percV = progV > 0 ? (realV / progV) * 100 : 0;
    const percVol = progVol > 0 ? (realVol / progVol) * 100 : 0;
    const percCx = progCx > 0 ? (realCx / progCx) * 100 : 0; 

    disp_v_perc.innerText = percV.toFixed(1) + '%';
    bar_v_perc.style.width = Math.min(percV, 100) + '%'; 
    disp_v_perc.className = percV >= 100 ? 'text-emerald-400 text-sm font-black' : 'text-blue-400 text-sm font-bold';

    disp_vol_perc.innerText = percVol.toFixed(1) + '%';
    bar_vol_perc.style.width = Math.min(percVol, 100) + '%';
    disp_vol_perc.className = percVol >= 100 ? 'text-emerald-400 text-sm font-black' : 'text-emerald-400 text-sm font-bold';

    disp_cx_perc.innerText = percCx.toFixed(1) + '%';
    bar_cx_perc.style.width = Math.min(percCx, 100) + '%';
    disp_cx_perc.className = percCx >= 100 ? 'text-emerald-400 text-sm font-black' : 'text-amber-400 text-sm font-bold';
}

if (opDatePicker) {
    opDatePicker.addEventListener('change', updateOpDashboard);
}

[inp_v_prog, inp_vol_prog, inp_cx_prog].forEach(inp => {
    if (inp) inp.addEventListener('input', () => calculateOpPercents());
});

if (btnSalvarOp) {
    btnSalvarOp.addEventListener('click', () => {
        const selectedDateStr = opDatePicker.value;
        if (!selectedDateStr) return;

        const savedData = JSON.parse(localStorage.getItem('serranalog_metas_dash') || '{}');
        savedData[selectedDateStr] = {
            v_prog: inp_v_prog.value,
            vol_prog: inp_vol_prog.value,
            cx_prog: inp_cx_prog.value,
            pbtc_real: inp_pbtc_real.value
        };
        localStorage.setItem('serranalog_metas_dash', JSON.stringify(savedData));

        const originalHtml = btnSalvarOp.innerHTML;
        btnSalvarOp.innerHTML = '<i class="fas fa-check"></i> Salvo!';
        btnSalvarOp.classList.replace('bg-emerald-600', 'bg-emerald-500');
        
        setTimeout(() => {
            btnSalvarOp.innerHTML = originalHtml;
            btnSalvarOp.classList.replace('bg-emerald-500', 'bg-emerald-600');
        }, 2000);
    });
}