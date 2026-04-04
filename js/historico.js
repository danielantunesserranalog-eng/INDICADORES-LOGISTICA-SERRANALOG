// ==========================================
// js/historico.js - TELA DE AUDITORIA DE PRODUÇÃO (VIAGENS)
// ==========================================

let fullHistoricoData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadHistoricoCompleto();
    const searchInput = document.getElementById('searchHistorico');
    if (searchInput) searchInput.addEventListener('input', renderHistoricoTable);
});

async function loadHistoricoCompleto() {
    try {
        const tbody = document.getElementById('historicoGeralBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-400"><i class="fas fa-spinner fa-spin mr-2"></i>Carregando banco de dados de viagens...</td></tr>`;

        // Puxa os dados sem tentar ordenar pela coluna 'id' para evitar Erro 400
        // CORRIGIDO O LIMITE DO SUPABASE AQUI (limit(100000))
        const { data, error } = await supabaseClient
            .from('historico_viagens')
            .select('*')
            .limit(100000);

        if (error) throw error;
        
        if (data) { 
            // Inverte a lista no próprio JavaScript (mais recentes primeiro)
            fullHistoricoData = data.reverse(); 
            renderHistoricoTable(); 
        }
    } catch(e) {
        console.error("Erro ao carregar histórico:", e);
        const tbody = document.getElementById('historicoGeralBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-rose-500">Erro ao carregar dados. Verifique a conexão.</td></tr>`;
    }
}

function renderHistoricoTable() {
    const t = document.getElementById('historicoGeralBody');
    const searchInput = document.getElementById('searchHistorico');
    const termo = searchInput ? searchInput.value.toLowerCase() : '';
    
    if(t) {
        t.innerHTML = '';
        
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

        // Renderiza as primeiras 300 linhas para o navegador não travar
        filtrados.slice(0, 300).forEach(r => {
            t.insertAdjacentHTML('beforeend', `<tr class="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                <td class="px-6 py-3 text-sm font-semibold text-sky-400 whitespace-nowrap">${r.dataDaBaseExcel || '-'}</td>
                <td class="px-6 py-3 text-xs font-mono text-slate-400 truncate max-w-[150px]" title="${r.movimento}">${r.movimento || '-'}</td>
                <td class="px-6 py-3 text-sm text-slate-300 truncate max-w-[150px]">${r.transportadora || '-'}</td>
                <td class="px-6 py-3 text-sm font-bold text-white">${r.placa || '-'}</td>
                <td class="px-6 py-3 text-right text-sm font-mono text-emerald-400">${r.pesoLiquido ? (r.pesoLiquido/1000).toLocaleString('pt-PT', {maximumFractionDigits:2}) : '0'}</td>
                <td class="px-6 py-3 text-right text-sm font-mono text-amber-400">${r.volumeReal ? r.volumeReal.toLocaleString('pt-PT', {maximumFractionDigits:2}) : '0'}</td>
                <td class="px-6 py-3 text-right text-sm text-slate-400">${formatarHorasMinutos(r.cicloHoras)}</td>
                <td class="px-6 py-3 text-right text-sm text-slate-400">${formatarHorasMinutos(r.filaCampoHoras)}</td>
                <td class="px-6 py-3 text-right text-sm text-slate-400">${formatarHorasMinutos(r.tempoCarregamentoHoras)}</td>
                <td class="px-6 py-3 text-right text-sm text-slate-400">${formatarHorasMinutos(r.filaFabricaHoras)}</td>
            </tr>`);
        });
    }
}