// ==========================================
// js/jornadas.js - INTEGRAÇÃO SUPABASE
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    carregarPainelJornadas();
});

async function carregarPainelJornadas() {
    try {
        const { data: dadosBrutos, error } = await supabaseClient
            .from('historico_jornadas')
            .select('*')
            .order('total_trabalho_horas', { ascending: false });

        if (error) throw error;
        
        // FILTRO DE SEGURANÇA NO DASHBOARD: Ignora menores que 8h e descarta lixo do banco antigo
        const dados = dadosBrutos ? dadosBrutos.filter(d => d.total_trabalho_horas >= 8) : [];
        
        if (!dados || dados.length === 0) {
            document.getElementById('jorTotalMotoristas').innerText = '0';
            document.getElementById('jorDataReferencia').innerText = 'Nenhum dado na base';
            
            const tbodyTop = document.getElementById('jorTopEstourosBody');
            if (tbodyTop) tbodyTop.innerHTML = `<tr><td colspan="3" class="p-4 text-sm text-gray-400 text-center">Nenhum dado válido.</td></tr>`;
            
            const tbodyAnalitica = document.getElementById('jorTabelaAnaliticaBody');
            if (tbodyAnalitica) tbodyAnalitica.innerHTML = `<tr><td colspan="7" class="p-4 text-sm text-gray-400 text-center">Nenhum dado válido.</td></tr>`;
            
            return;
        }

        let totalMotoristas = dados.length;
        let qtdEstouros = 0;
        let totalMinutosRefeicao = 0;
        let qtdRefeicao = 0;
        let totalMinutosRepouso = 0;
        let qtdRepouso = 0;
        let motoristasComTempo = [];

        const tbodyAnalitica = document.getElementById('jorTabelaAnaliticaBody');
        if (tbodyAnalitica) tbodyAnalitica.innerHTML = '';

        dados.forEach(linha => {
            const motorista = linha.motorista || "-";
            const placa = linha.placa || "-";
            const inicio = linha.inicio || "-";
            const fim = linha.fim || "-";
            
            const tTrabalhoHoras = linha.total_trabalho_horas || 0;
            const isEstouro = linha.estourou_jornada || tTrabalhoHoras > 12;
            
            if (isEstouro) qtdEstouros++;

            if (linha.refeicao_horas > 0) {
                totalMinutosRefeicao += (linha.refeicao_horas * 60);
                qtdRefeicao++;
            }
            if (linha.repouso_horas > 0) {
                totalMinutosRepouso += (linha.repouso_horas * 60);
                qtdRepouso++;
            }

            motoristasComTempo.push({ motorista, horas: tTrabalhoHoras, inicio, fim });

            if (tbodyAnalitica) {
                const corTrabalho = isEstouro ? 'text-rose-500 font-bold' : 'text-emerald-400 font-semibold';
                const badgeStatus = isEstouro 
                    ? `<span class="border border-red-500 text-red-500 bg-red-900/20 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider shadow-inner">ESTOURO</span>` 
                    : `<span class="border border-emerald-500 text-emerald-500 bg-emerald-900/20 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider shadow-inner">OK</span>`;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="px-4 py-3 text-sky-400 font-semibold whitespace-nowrap">${motorista}</td>
                    <td class="px-4 py-3 text-slate-400">${placa}</td>
                    <td class="px-4 py-3 text-slate-400 whitespace-nowrap">${inicio}</td>
                    <td class="px-4 py-3 text-slate-400 whitespace-nowrap">${fim}</td>
                    <td class="px-4 py-3 text-center ${corTrabalho}">${formatarHorasMinutos(tTrabalhoHoras)}</td>
                    <td class="px-4 py-3 text-center text-amber-500">${formatarHorasMinutos(linha.direcao_horas || 0)}</td>
                    <td class="px-4 py-3 text-center">${badgeStatus}</td>
                `;
                tbodyAnalitica.appendChild(tr);
            }
        });

        document.getElementById('jorTotalMotoristas').textContent = totalMotoristas;
        const taxaEstouro = totalMotoristas > 0 ? ((qtdEstouros / totalMotoristas) * 100).toFixed(1) : 0;
        document.getElementById('jorTaxaEstouro').innerHTML = `${taxaEstouro}%`;

        document.getElementById('jorMediaRefeicao').textContent = formatarHorasMinutos(qtdRefeicao > 0 ? (totalMinutosRefeicao / qtdRefeicao) / 60 : 0);
        document.getElementById('jorMediaRepouso').textContent = formatarHorasMinutos(qtdRepouso > 0 ? (totalMinutosRepouso / qtdRepouso) / 60 : 0);

        const tbodyTop = document.getElementById('jorTopEstourosBody');
        if (tbodyTop) {
            tbodyTop.innerHTML = '';
            const top5 = motoristasComTempo.filter(m => m.horas > 12).slice(0, 5);
            if (top5.length === 0) {
                tbodyTop.innerHTML = `<tr><td colspan="3" class="p-4 text-sm text-gray-400 text-center">Nenhum estouro registrado.</td></tr>`;
            } else {
                top5.forEach((item, index) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="px-4 py-3 font-bold text-rose-500 text-center w-10">${index + 1}º</td>
                        <td class="px-4 py-3 text-slate-300 font-semibold truncate max-w-[150px]">${item.motorista}</td>
                        <td class="px-4 py-3 text-right font-bold text-rose-400">${formatarHorasMinutos(item.horas)}</td>
                    `;
                    tbodyTop.appendChild(tr);
                });
            }
        }
        document.getElementById('jorDataReferencia').textContent = `Base: ${dados.length} jornadas na nuvem`;

    } catch (error) { console.error("Erro ao carregar o painel:", error); }
}