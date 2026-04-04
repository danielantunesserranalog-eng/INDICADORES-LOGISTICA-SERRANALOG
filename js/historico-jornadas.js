// ==========================================
// js/historico-jornadas.js - TELA DE AUDITORIA DE JORNADAS
// ==========================================

let fullHistoricoJornadas = [];

// Regex para padronizar exibição (como feito no painel principal)
const regexDate = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{1,2}-\d{1,2})/;
const regexTime = /(\d{1,2}:\d{2}(:\d{2})?)/;

document.addEventListener('DOMContentLoaded', () => {
    loadHistoricoJornadasCompleto();
    document.getElementById('searchHistoricoJornadas').addEventListener('input', renderHistoricoJornadasTable);
});

async function loadHistoricoJornadasCompleto() {
    try {
        const tbody = document.getElementById('historicoJornadasBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-slate-400"><i class="fas fa-spinner fa-spin mr-2"></i>Carregando banco de dados de jornadas...</td></tr>`;

        // Puxa as jornadas mais recentes primeiro
        const { data, error } = await supabaseClient
            .from('historico_jornadas')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;
        
        if (data) { 
            fullHistoricoJornadas = data; 
            renderHistoricoJornadasTable(); 
        }
    } catch(e) {
        console.error("Erro ao carregar histórico de jornadas:", e);
    }
}

function renderHistoricoJornadasTable() {
    const t = document.getElementById('historicoJornadasBody');
    const termo = document.getElementById('searchHistoricoJornadas').value.toLowerCase();
    
    if(t) {
        t.innerHTML = '';
        
        // Filtra pelo termo de busca (Motorista ou Placa)
        const filtrados = fullHistoricoJornadas.filter(r => {
            const motorista = (r.motorista || "").toLowerCase();
            const placa = (r.placa || "").toLowerCase();
            return motorista.includes(termo) || placa.includes(termo);
        });

        if(filtrados.length === 0) {
            t.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-slate-500">Nenhuma jornada encontrada.</td></tr>`;
            return;
        }

        // Renderiza no máximo 200 linhas para não travar o navegador na auditoria
        filtrados.slice(0, 200).forEach(r => {
            const horas = r.total_trabalho_horas || 0;
            const isEstouro = horas > 12;
            const isRisco = horas >= 10.5 && horas <= 12;

            // Extração de Horas (Visualização limpa)
            let dtInicio = '-', hrInicio = '-', dtFim = '-', hrFim = '-';
            if (r.inicio) {
                const mD = r.inicio.match(regexDate);
                const mT = r.inicio.match(regexTime);
                if (mD) { dtInicio = mD[0]; if(dtInicio.length <= 5) dtInicio += '/' + new Date().getFullYear(); }
                if (mT) hrInicio = mT[0];
                if (!mD && !mT) hrInicio = r.inicio;
            }
            if (r.fim) {
                const mDF = r.fim.match(regexDate);
                const mTF = r.fim.match(regexTime);
                if (mDF) { dtFim = mDF[0]; if(dtFim.length <= 5) dtFim += '/' + new Date().getFullYear(); } else { dtFim = dtInicio; }
                if (mTF) hrFim = mTF[0]; else hrFim = r.fim.replace(regexDate, '').replace('-', '').trim() || r.fim;
            }

            let corLinha = 'text-emerald-400';
            let badge = `<span class="border border-emerald-500 text-emerald-500 bg-emerald-900/20 px-2 py-1 rounded text-[10px] uppercase font-bold">OK</span>`;
            if(isEstouro) {
                corLinha = 'text-rose-500 font-bold';
                badge = `<span class="border border-rose-500 text-rose-500 bg-rose-900/20 px-2 py-1 rounded text-[10px] uppercase font-bold">INFRAÇÃO</span>`;
            } else if (isRisco) {
                corLinha = 'text-amber-500 font-bold';
                badge = `<span class="border border-amber-500 text-amber-500 bg-amber-900/20 px-2 py-1 rounded text-[10px] uppercase font-bold">RISCO</span>`;
            }

            t.insertAdjacentHTML('beforeend', `<tr class="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                <td class="px-6 py-3 text-sm font-semibold text-sky-400 truncate max-w-[180px]">${r.motorista || '-'}</td>
                <td class="px-6 py-3 text-sm font-bold text-slate-300">${r.placa || '-'}</td>
                <td class="px-6 py-3 text-xs text-slate-400">
                    <span class="text-[10px] text-slate-500 block">${dtInicio}</span>
                    <span class="font-mono text-slate-200">${hrInicio}</span>
                </td>
                <td class="px-6 py-3 text-xs text-slate-400">
                    <span class="text-[10px] text-slate-500 block">${dtFim}</span>
                    <span class="font-mono text-slate-200">${hrFim}</span>
                </td>
                <td class="px-6 py-3 text-center text-sm ${corLinha}">${formatarHorasMinutos(horas)}</td>
                <td class="px-6 py-3 text-center text-sm text-slate-400">${formatarHorasMinutos(r.direcao_horas)}</td>
                <td class="px-6 py-3 text-center text-sm text-slate-400">${formatarHorasMinutos(r.refeicao_horas)}</td>
                <td class="px-6 py-3 text-center text-sm text-slate-400">${formatarHorasMinutos(r.repouso_horas)}</td>
                <td class="px-6 py-3 text-center">${badge}</td>
            </tr>`);
        });
    }
}