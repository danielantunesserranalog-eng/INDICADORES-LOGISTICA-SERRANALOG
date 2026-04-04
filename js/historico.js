// ==========================================
// js/historico.js - TELA DE AUDITORIA
// ==========================================

let fullHistoricoData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadHistoricoCompleto();
    document.getElementById('searchHistorico').addEventListener('input', renderHistoricoTable);
});

async function loadHistoricoCompleto() {
    try {
        const tbody = document.getElementById('historicoGeralBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-400"><i class="fas fa-spinner fa-spin mr-2"></i>Carregando banco de dados...</td></tr>`;

        // Puxa as viagens mais recentes primeiro
        const { data, error } = await supabaseClient
            .from('historico_viagens')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;
        
        if (data) { 
            fullHistoricoData = data; 
            renderHistoricoTable(); 
        }
    } catch(e) {
        console.error("Erro ao carregar histórico:", e);
    }
}

function renderHistoricoTable() {
    const t = document.getElementById('historicoGeralBody');
    const termo = document.getElementById('searchHistorico').value.toLowerCase();
    
    if(t) {
        t.innerHTML = '';
        
        // Filtra pelo termo de busca
        const filtrados = fullHistoricoData.filter(r => {
            const placa = (r.placa || "").toLowerCase();
            const transp = (r.transportadora || "").toLowerCase();
            const mov = (r.movimento || "").toLowerCase();
            return placa.includes(termo) || transp.includes(termo) || mov.includes(termo);
        });

        if(filtrados.length === 0) {
            t.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-500">Nenhuma viagem encontrada.</td></tr>`;
            return;
        }

        // Renderiza no máximo 200 linhas para não travar o navegador
        filtrados.slice(0, 200).forEach(r => {
            t.insertAdjacentHTML('beforeend', `<tr class="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                <td class="px-6 py-3 text-xs">${r.dataDaBaseExcel || '-'}</td>
                <td class="px-6 py-3 text-sky-400 text-xs font-mono">${r.movimento || '-'}</td>
                <td class="px-6 py-3 text-xs truncate max-w-[150px]" title="${r.transportadora || ''}">${r.transportadora || '-'}</td>
                <td class="px-6 py-3 font-bold text-emerald-400">${r.placa || '-'}</td>
                <td class="px-6 py-3 text-right">${r.pesoLiquido ? (r.pesoLiquido/1000).toFixed(1) : '-'}</td>
                <td class="px-6 py-3 text-right text-slate-400">${r.volumeReal || '-'}</td>
                <td class="px-6 py-3 text-right text-sky-300 font-bold">${formatarHorasMinutos(r.cicloHoras)}</td>
                <td class="px-6 py-3 text-right text-amber-400 font-bold">${formatarHorasMinutos(r.filaCampoHoras)}</td>
                <td class="px-6 py-3 text-right text-emerald-400 font-bold">${formatarHorasMinutos(r.tempoCarregamentoHoras)}</td>
                <td class="px-6 py-3 text-right text-rose-400 font-bold">${formatarHorasMinutos(r.filaFabricaHoras)}</td>
            </tr>`);
        });
    }
}