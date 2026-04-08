// ==========================================
// js/historico.js - TELA DE AUDITORIA DE PRODUÇÃO (VIAGENS)
// ==========================================

let fullHistoricoData = [];
let paginaAtual = 0;
const itensPorPagina = 50;
let termoBuscaAtual = '';
let carregando = false;
let fimDosDados = false;
let debounceTimer;

document.addEventListener('DOMContentLoaded', () => {
    loadHistoricoCompleto(true);
    const searchInput = document.getElementById('searchHistorico');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            // Delay de 500ms para não sobrecarregar o banco ao digitar
            debounceTimer = setTimeout(() => {
                termoBuscaAtual = e.target.value.trim().toLowerCase();
                loadHistoricoCompleto(true);
            }, 500); 
        });
    }
});

async function loadHistoricoCompleto(reset = false) {
    if (carregando) return;
    carregando = true;

    if (reset) {
        paginaAtual = 0;
        fullHistoricoData = [];
        fimDosDados = false;
        const tbody = document.getElementById('historicoGeralBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-400"><i class="fas fa-spinner fa-spin mr-2"></i>Buscando dados no servidor...</td></tr>`;
    }

    if (fimDosDados) {
        carregando = false;
        return;
    }

    try {
        const de = paginaAtual * itensPorPagina;
        const ate = de + itensPorPagina - 1;

        let query = supabaseClient
            .from('historico_viagens')
            .select('*')
            .order('id', { ascending: false })
            .range(de, ate);

        if (termoBuscaAtual) {
            // Busca otimizada direto no banco de dados (muito mais rápido)
            query = query.or(`placa.ilike.%${termoBuscaAtual}%,transportadora.ilike.%${termoBuscaAtual}%,movimento.ilike.%${termoBuscaAtual}%`);
        }

        const { data, error } = await query;

        if (error) throw error;
        
        if (data) { 
            if (data.length < itensPorPagina) {
                fimDosDados = true;
            }
            fullHistoricoData = [...fullHistoricoData, ...data];
            paginaAtual++;
            renderHistoricoTable(); 
        }
    } catch(e) {
        console.error("Erro ao carregar histórico:", e);
        const tbody = document.getElementById('historicoGeralBody');
        if (tbody && reset) tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-rose-500">Erro ao carregar dados. Verifique a conexão.</td></tr>`;
    } finally {
        carregando = false;
    }
}

function renderHistoricoTable() {
    const t = document.getElementById('historicoGeralBody');
    if(!t) return;
    
    t.innerHTML = '';
    
    if(fullHistoricoData.length === 0) {
        t.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-500">Nenhuma viagem encontrada.</td></tr>`;
        return;
    }

    fullHistoricoData.forEach(r => {
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

    if (!fimDosDados) {
        t.insertAdjacentHTML('beforeend', `
            <tr id="rowCarregarMais">
                <td colspan="10" class="text-center py-6">
                    <button onclick="loadHistoricoCompleto()" class="bg-sky-600/20 hover:bg-sky-600/40 text-sky-400 border border-sky-500/50 font-bold py-2.5 px-8 rounded-full transition-all text-sm shadow-lg">
                        <i class="fas fa-chevron-down mr-2"></i> Carregar Mais Registros
                    </button>
                </td>
            </tr>
        `);
    }
}