// ==========================================
// js/jornadas.js - ALERTAS PREDITIVOS E SUPABASE
// ==========================================

let jornadasGlobalData = [];

document.addEventListener('DOMContentLoaded', () => {
    carregarPainelJornadas();
});

// EXPORTAÇÃO EXCEL (SheetJS)
document.getElementById('btnExportarJornada').addEventListener('click', () => {
    if (jornadasGlobalData.length === 0) return alert("Nenhum dado para exportar.");
    const ws = XLSX.utils.json_to_sheet(jornadasGlobalData.map(d => ({
        "Motorista": d.motorista, "Placa": d.placa,
        "Início": d.inicio, "Fim": d.fim,
        "T. Trabalho (h)": d.total_trabalho_horas, "T. Direção (h)": d.direcao_horas,
        "Refeição (h)": d.refeicao_horas, "Repouso (h)": d.repouso_horas,
        "Status": d.total_trabalho_horas > 12 ? 'INFRAÇÃO' : (d.total_trabalho_horas >= 10.5 ? 'ALERTA RISCO' : 'OK')
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jornadas");
    XLSX.writeFile(wb, `SerranaLog_Jornadas_${new Date().toISOString().slice(0,10)}.xlsx`);
});

async function carregarPainelJornadas() {
    try {
        const { data: dadosBrutos, error } = await supabaseClient.from('historico_jornadas').select('*').order('total_trabalho_horas', { ascending: false });
        if (error) throw error;
        
        const dados = dadosBrutos ? dadosBrutos.filter(d => d.total_trabalho_horas >= 8) : [];
        jornadasGlobalData = dados;

        if (dados.length === 0) { document.getElementById('jorTotalMotoristas').innerText = '0'; return; }

        let qtdEstouros = 0; let qtdRisco = 0;
        let totalMinutosRefeicao = 0; let qtdRefeicao = 0;
        const tbodyAnalitica = document.getElementById('jorTabelaAnaliticaBody'); tbodyAnalitica.innerHTML = '';
        const tbodyRisco = document.getElementById('jorRiscoBody'); tbodyRisco.innerHTML = '';
        const tbodyEstouro = document.getElementById('jorTopEstourosBody'); tbodyEstouro.innerHTML = '';

        dados.forEach(linha => {
            const horas = linha.total_trabalho_horas || 0;
            const isEstouro = horas > 12;
            const isRisco = horas >= 10.5 && horas <= 12; // Alerta Preditivo!
            
            if (isEstouro) qtdEstouros++;
            if (isRisco) qtdRisco++;
            if (linha.refeicao_horas > 0) { totalMinutosRefeicao += (linha.refeicao_horas * 60); qtdRefeicao++; }

            // Configuração Visual do Status
            let corLinha = 'text-emerald-400';
            let badge = `<span class="border border-emerald-500 text-emerald-500 bg-emerald-900/20 px-2 py-1 rounded text-[10px] uppercase font-bold">OK</span>`;
            
            if(isEstouro) {
                corLinha = 'text-rose-500 font-bold';
                badge = `<span class="border border-rose-500 text-rose-500 bg-rose-900/20 px-2 py-1 rounded text-[10px] uppercase font-bold animate-pulse">INFRAÇÃO</span>`;
                tbodyEstouro.insertAdjacentHTML('beforeend', `<tr><td class="px-3 py-2 text-slate-300 truncate max-w-[120px]">${linha.motorista}</td><td class="px-3 py-2 text-right font-black text-rose-500">${formatarHorasMinutos(horas)}</td></tr>`);
            } else if (isRisco) {
                corLinha = 'text-amber-500 font-bold';
                badge = `<span class="border border-amber-500 text-amber-500 bg-amber-900/20 px-2 py-1 rounded text-[10px] uppercase font-bold">ALERTA PREVENTIVO</span>`;
                tbodyRisco.insertAdjacentHTML('beforeend', `<tr><td class="px-3 py-2 text-slate-300 truncate max-w-[120px]">${linha.motorista}</td><td class="px-3 py-2 text-right font-black text-amber-400">${formatarHorasMinutos(horas)}</td></tr>`);
            }

            // Tabela Analítica Geral
            tbodyAnalitica.insertAdjacentHTML('beforeend', `
                <tr class="hover:bg-slate-800/30">
                    <td class="px-4 py-3 text-sky-400 font-semibold truncate max-w-[150px]">${linha.motorista}</td>
                    <td class="px-4 py-3 text-slate-400">${linha.inicio || '-'}</td>
                    <td class="px-4 py-3 text-center ${corLinha}">${formatarHorasMinutos(horas)}</td>
                    <td class="px-4 py-3 text-center text-slate-400">${formatarHorasMinutos(linha.direcao_horas || 0)}</td>
                    <td class="px-4 py-3 text-center">${badge}</td>
                </tr>
            `);
        });

        document.getElementById('jorTotalMotoristas').textContent = dados.length;
        document.getElementById('jorQtdEstouros').textContent = qtdEstouros;
        document.getElementById('jorQtdRisco').textContent = qtdRisco;
        document.getElementById('jorMediaRefeicao').textContent = formatarHorasMinutos(qtdRefeicao > 0 ? (totalMinutosRefeicao / qtdRefeicao) / 60 : 0);
        document.getElementById('jorDataReferencia').textContent = `Base: ${dados.length} registros`;

    } catch (error) { console.error("Erro ao carregar o painel:", error); }
}