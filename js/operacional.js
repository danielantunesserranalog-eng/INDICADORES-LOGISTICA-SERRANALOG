// ==============================================================
// LÓGICA DO DASHBOARD OPERACIONAL DIÁRIO (CONECTADO AO SUPABASE)
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

    // Converter YYYY-MM-DD para DD/MM/YYYY (formato que está no historico_viagens)
    const parts = selectedDateStr.split('-');
    const searchDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

    opStatusFetch.innerText = "Consultando nuvem...";
    opStatusFetch.className = "text-xs font-mono text-emerald-400 hidden md:block animate-pulse";

    try {
        // 1. Buscar REALIZADO no Supabase (historico_viagens)
        const { data: viagensDoDia, error: errViagens } = await supabaseClient
            .from('historico_viagens')
            .select('volumeReal')
            .eq('dataDaBaseExcel', searchDate);

        if (errViagens) throw errViagens;

        const realViagens = viagensDoDia.length;
        const realVolume = viagensDoDia.reduce((sum, d) => sum + (d.volumeReal || 0), 0);
        const realCaixa = realViagens > 0 ? (realVolume / realViagens) : 0;

        disp_v_real.innerText = realViagens;
        disp_vol_real.innerText = realVolume.toLocaleString('pt-PT', {maximumFractionDigits: 1});
        disp_cx_real.innerText = realCaixa.toLocaleString('pt-PT', {maximumFractionDigits: 1});

        // 2. Buscar METAS PROGRAMADAS no Supabase (metas_diarias)
        const { data: metasDoDia, error: errMetas } = await supabaseClient
            .from('metas_diarias')
            .select('*')
            .eq('data_referencia', selectedDateStr)
            .maybeSingle();

        if (errMetas) throw errMetas;

        // Se encontrou meta salva no banco para aquele dia, preenche. Se não, limpa.
        if (metasDoDia) {
            inp_v_prog.value = metasDoDia.v_prog !== null ? metasDoDia.v_prog : '';
            inp_vol_prog.value = metasDoDia.vol_prog !== null ? metasDoDia.vol_prog : '';
            inp_cx_prog.value = metasDoDia.cx_prog !== null ? metasDoDia.cx_prog : '';
            inp_pbtc_real.value = metasDoDia.pbtc_real !== null ? metasDoDia.pbtc_real : '';
        } else {
            inp_v_prog.value = '';
            inp_vol_prog.value = '';
            inp_cx_prog.value = '';
            inp_pbtc_real.value = '';
        }

        // 3. Calcular Porcentagens com os dados preenchidos
        calculateOpPercents(realViagens, realVolume, realCaixa);

        opStatusFetch.innerText = "Dados sincronizados com a nuvem (Supabase).";
        opStatusFetch.className = "text-xs font-mono text-slate-500 hidden md:block";

    } catch (err) {
        console.error("Erro ao buscar dados do dia:", err);
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

// Botão de Salvar manda para o Supabase
if (btnSalvarOp) {
    btnSalvarOp.addEventListener('click', async () => {
        const selectedDateStr = opDatePicker.value;
        if (!selectedDateStr) return;

        const originalHtml = btnSalvarOp.innerHTML;
        btnSalvarOp.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando na nuvem...';
        
        try {
            // Prepara o objeto com as metas digitadas
            const dadosMeta = {
                data_referencia: selectedDateStr,
                v_prog: parseFloat(inp_v_prog.value) || null,
                vol_prog: parseFloat(inp_vol_prog.value) || null,
                cx_prog: parseFloat(inp_cx_prog.value) || null,
                pbtc_real: parseFloat(inp_pbtc_real.value) || null
            };

            // Upsert: Se já existir essa data, ele atualiza (Update). Se não, ele insere (Insert).
            const { error } = await supabaseClient
                .from('metas_diarias')
                .upsert(dadosMeta, { onConflict: 'data_referencia' });

            if (error) throw error;

            btnSalvarOp.innerHTML = '<i class="fas fa-check"></i> Salvo com Sucesso!';
            btnSalvarOp.classList.replace('bg-emerald-600', 'bg-emerald-500');
            
        } catch (err) {
            console.error("Erro ao salvar metas:", err);
            btnSalvarOp.innerHTML = '<i class="fas fa-times"></i> Erro ao salvar!';
            btnSalvarOp.classList.replace('bg-emerald-600', 'bg-rose-600');
        } finally {
            // Volta o botão ao normal depois de 2.5 segundos
            setTimeout(() => {
                btnSalvarOp.innerHTML = originalHtml;
                btnSalvarOp.classList.remove('bg-emerald-500', 'bg-rose-600');
                btnSalvarOp.classList.add('bg-emerald-600');
            }, 2500);
        }
    });
}