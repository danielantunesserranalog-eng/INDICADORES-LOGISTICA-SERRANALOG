// ==========================================
// js/historico-jornadas.js - TELA DE AUDITORIA DE JORNADAS
// ==========================================

let fullHistoricoJornadas = [];

// Regex para padronizar exibição 
const regexDate = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{1,2}-\d{1,2})/;
const regexTime = /(\d{1,2}:\d{2}(:\d{2})?)/;

document.addEventListener('DOMContentLoaded', () => {
    loadHistoricoJornadasCompleto();
    
    // Configura os ouvintes de eventos para ambos os filtros
    document.getElementById('searchHistoricoJornadas').addEventListener('input', renderHistoricoJornadasTable);
    document.getElementById('filterMotoristaDropdown').addEventListener('change', renderHistoricoJornadasTable);
});

async function loadHistoricoJornadasCompleto() {
    try {
        const tbody = document.getElementById('historicoJornadasBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-slate-400"><i class="fas fa-spinner fa-spin mr-2"></i>Carregando banco de dados de jornadas...</td></tr>`;

        // Puxa as jornadas do Supabase
        const { data, error } = await supabaseClient
            .from('historico_jornadas')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;
        
        if (data) { 
            fullHistoricoJornadas = data; 
            popularFiltroMotoristasDropdown();
            renderHistoricoJornadasTable(); 
        }
    } catch(e) {
        console.error("Erro ao carregar histórico de jornadas:", e);
    }
}

// Função que popula a caixa de seleção apenas com os nomes únicos
function popularFiltroMotoristasDropdown() {
    const select = document.getElementById('filterMotoristaDropdown');
    if (!select) return;

    // Extrai motoristas únicos e ordena alfabeticamente
    const motoristasUnicos = [...new Set(fullHistoricoJornadas.map(d => d.motorista))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

    select.innerHTML = '<option value="ALL">TODOS OS MOTORISTAS</option>';
    motoristasUnicos.forEach(m => {
        select.insertAdjacentHTML('beforeend', `<option value="${m}">${m}</option>`);
    });
}

function renderHistoricoJornadasTable() {
    const t = document.getElementById('historicoJornadasBody');
    const termoInput = document.getElementById('searchHistoricoJornadas').value.toLowerCase();
    const motoristaSelecionado = document.getElementById('filterMotoristaDropdown').value;
    
    if(t) {
        t.innerHTML = '';
        
        // Filtro Duplo: Avalia o Dropdown e depois a Busca por Texto Livre
        const filtrados = fullHistoricoJornadas.filter(r => {
            // Verifica o Dropdown
            const matchDropdown = (motoristaSelecionado === 'ALL') || (r.motorista === motoristaSelecionado);
            
            // Verifica o Texto Livre
            const motoristaTexto = (r.motorista || "").toLowerCase();
            const placaTexto = (r.placa || "").toLowerCase();
            const matchTexto = motoristaTexto.includes(termoInput) || placaTexto.includes(termoInput);

            return matchDropdown && matchTexto;
        });

        if(filtrados.length === 0) {
            t.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-slate-500">Nenhuma jornada encontrada para este filtro.</td></tr>`;
            return;
        }

        // Renderiza no máximo 200 linhas para evitar travamento
        filtrados.slice(0, 200).forEach(r => {
            const horas = r.total_trabalho_horas || 0;
            const isEstouro = horas > 12;

            // Extração de Horas
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