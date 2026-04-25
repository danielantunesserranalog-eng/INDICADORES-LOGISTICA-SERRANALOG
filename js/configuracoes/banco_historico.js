// ==========================================
// js/configuracoes/banco_historico.js 
// ==========================================

async function carregarHistoricoImportacoes() {
    const tb = document.getElementById('importHistoryBody');
    if (!tb) return;
    tb.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-slate-500"><i class="fas fa-spinner fa-spin mr-2"></i> Atualizando...</td></tr>';
    try {
        const { data, error } = await supabaseClient.from('historico_importacoes').select('*').order('id', { ascending: false }).limit(10); 
        if (error) throw error;
        tb.innerHTML = '';
        if (!data || data.length === 0) {
            tb.innerHTML = '<tr><td colspan="3" class="text-center py-6 text-slate-500">Nenhum histórico de importação encontrado.</td></tr>';
            return;
        }
        data.forEach(d => {
            let icone = '<i class="fas fa-database text-slate-500"></i>';
            if (d.dataBase.toUpperCase().includes('JORNADA')) icone = '<i class="fas fa-user-clock text-amber-500"></i>';
            if (d.dataBase.toUpperCase().includes('VIAGEN')) icone = '<i class="fas fa-truck text-sky-500"></i>';

            tb.insertAdjacentHTML('beforeend', `
                <tr class="hover:bg-slate-800/30 transition-colors">
                    <td class="px-6 py-3 font-mono text-slate-400">${d.dataLancamento}</td>
                    <td class="px-6 py-3 font-semibold text-slate-200">${icone} <span class="ml-2">${d.dataBase}</span></td>
                    <td class="px-6 py-3 text-center font-bold text-emerald-400">+ ${d.qtdViagens}</td>
                </tr>
            `);
        });
    } catch (e) {
        tb.innerHTML = '<tr><td colspan="3" class="text-center py-6 text-rose-500">Erro ao carregar histórico.</td></tr>';
    }
}

function initBancoHistorico() {
    document.getElementById('btnAtualizarHistorico').addEventListener('click', carregarHistoricoImportacoes);

    const btnLimparBanco = document.getElementById('btnLimparBanco');
    if (btnLimparBanco) {
        btnLimparBanco.addEventListener('click', async () => {
            const elTipoExclusao = document.getElementById('tipoExclusao');
            if (!elTipoExclusao) return;
            
            const tipo = elTipoExclusao.value;
            let mensagemConfirmacao = "";

            if (tipo === 'tudo') mensagemConfirmacao = "ALERTA MÁXIMO: Apagar TODOS os dados?";
            else if (tipo === 'viagens') mensagemConfirmacao = "ATENÇÃO: Apagar APENAS banco de Produção (Viagens)?";
            else if (tipo === 'jornadas') mensagemConfirmacao = "ATENÇÃO: Apagar APENAS banco de Jornadas?";
            else if (tipo === 'eventos') mensagemConfirmacao = "ATENÇÃO: Apagar APENAS banco de Eventos?";

            if(confirm(mensagemConfirmacao)) {
                const conteudoOriginal = btnLimparBanco.innerHTML;
                try {
                    btnLimparBanco.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Apagando...';
                    btnLimparBanco.disabled = true;
                    btnLimparBanco.classList.add('opacity-50', 'cursor-not-allowed');

                    async function apagarEmLotes(tabela, colunaReferencia) {
                        let temDados = true;
                        let contador = 0; 
                        while (temDados && contador < 100) {
                            contador++;
                            const { data, error } = await supabaseClient.from(tabela).select(colunaReferencia).limit(1);
                            if (error || !data || data.length === 0) temDados = false; 
                            else await supabaseClient.from(tabela).delete().not(colunaReferencia, 'is', null);
                        }
                    }

                    if (tipo === 'tudo' || tipo === 'viagens') await apagarEmLotes('historico_viagens', 'movimento');
                    if (tipo === 'tudo' || tipo === 'jornadas') await apagarEmLotes('historico_jornadas', 'motorista');
                    if (tipo === 'tudo' || tipo === 'eventos') await apagarEmLotes('historico_eventos', 'motorista');
                    
                    await supabaseClient.from('historico_importacoes').insert([{
                        "dataBase": `[DADOS APAGADOS] - Módulo: ${tipo.toUpperCase()}`,
                        "qtdViagens": 0,
                        "dataLancamento": new Date().toLocaleString('pt-PT')
                    }]);

                    alert("Operação concluída. Os dados foram apagados da nuvem.");
                    carregarHistoricoImportacoes(); 
                } catch (error) {
                    alert("Erro ao apagar os dados.");
                } finally {
                    btnLimparBanco.innerHTML = conteudoOriginal;
                    btnLimparBanco.disabled = false;
                    btnLimparBanco.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            }
        });
    }
}