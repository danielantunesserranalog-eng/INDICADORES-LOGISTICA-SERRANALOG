// ==========================================
// js/jornadas.js - ALERTAS PREDITIVOS E FILTROS
// ==========================================

let fullJornadasData = []; 
let jornadasGlobalData = [];
let activeQuickFilterJor = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
    configurarFiltros();
    carregarPainelJornadas();
});

// CONFIGURAÇÃO DOS BOTÕES DE FILTRO (D-1, D-2...)
function configurarFiltros() {
    const btnQFs = document.querySelectorAll('.btn-qf-jor');
    btnQFs.forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeQuickFilterJor = e.currentTarget.getAttribute('data-qf');
            
            // Atualiza Interface dos Botões
            btnQFs.forEach(b => {
                if (b.getAttribute('data-qf') === activeQuickFilterJor) {
                    b.classList.add('active', 'bg-sky-900/50', 'text-sky-400');
                    b.classList.remove('text-slate-400');
                } else {
                    b.classList.remove('active', 'bg-sky-900/50', 'text-sky-400');
                    b.classList.add('text-slate-400');
                }
            });
            
            renderizarPainelJornadas();
        });
    });
}

// EXTRAIR DATA COM SEGURANÇA
function extrairDataParaFiltro(dataStr) {
    if (!dataStr) return null;
    const match = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
        return new Date(match[3], match[2] - 1, match[1]); // Ano, Mês (0-11), Dia
    }
    return null;
}

// CARREGAR DADOS DO SUPABASE (Apenas na inicialização)
async function carregarPainelJornadas() {
    try {
        const { data: dadosBrutos, error } = await supabaseClient
            .from('historico_jornadas')
            .select('*')
            .order('total_trabalho_horas', { ascending: false });
            
        if (error) throw error;
        
        if (dadosBrutos) {
            fullJornadasData = dadosBrutos.filter(d => d.total_trabalho_horas >= 8);
        }
        
        renderizarPainelJornadas();
    } catch (error) { 
        console.error("Erro ao carregar o painel:", error); 
    }
}

// RENDERIZAR O PAINEL (Com base nos filtros)
function renderizarPainelJornadas() {
    let dados = fullJornadasData;

    // Aplicação do Filtro de Data
    if (activeQuickFilterJor !== 'ALL') {
        dados = dados.filter(d => {
            const dataParsed = extrairDataParaFiltro(d.inicio);
            if (dataParsed) {
                const hj = new Date(); 
                hj.setHours(0, 0, 0, 0);
                dataParsed.setHours(0, 0, 0, 0);
                
                const diffDias = Math.round((hj - dataParsed) / 86400000);
                
                if (activeQuickFilterJor === 'D-1') return diffDias === 1;
                if (activeQuickFilterJor === 'D-2') return diffDias === 2;
                if (activeQuickFilterJor === 'D-7') return diffDias >= 0 && diffDias <= 7;
                if (activeQuickFilterJor === 'D-30') return diffDias >= 0 && diffDias <= 30;
            }
            return false; // Remove se não bater no filtro
        });
    }

    jornadasGlobalData = dados;
    document.getElementById('jorFilterStatus').innerText = `${dados.length} Jornadas Registradas`;

    if (dados.length === 0) { 
        document.getElementById('jorTotalMotoristas').innerText = '0';
        document.getElementById('jorQtdEstouros').innerText = '0';
        document.getElementById('jorQtdRisco').innerText = '0';
        document.getElementById('jorMediaRefeicao').innerText = '0h 00m';
        document.getElementById('jorTabelaAnaliticaBody').innerHTML = '<tr><td colspan="7" class="text-center py-4 text-slate-500">Nenhum dado encontrado para este filtro.</td></tr>';
        document.getElementById('jorRiscoBody').innerHTML = '';
        document.getElementById('jorTopEstourosBody').innerHTML = '';
        return; 
    }

    let qtdEstouros = 0; let qtdRisco = 0;
    let totalMinutosRefeicao = 0; let qtdRefeicao = 0;
    
    const tbodyAnalitica = document.getElementById('jorTabelaAnaliticaBody'); tbodyAnalitica.innerHTML = '';
    const tbodyRisco = document.getElementById('jorRiscoBody'); tbodyRisco.innerHTML = '';
    const tbodyEstouro = document.getElementById('jorTopEstourosBody'); tbodyEstouro.innerHTML = '';

    dados.forEach(linha => {
        const horas = linha.total_trabalho_horas || 0;
        const isEstouro = horas > 12;
        const isRisco = horas >= 10.5 && horas <= 12; // Alerta Preditivo
        
        if (isEstouro) qtdEstouros++;
        if (isRisco) qtdRisco++;
        if (linha.refeicao_horas > 0) { totalMinutosRefeicao += (linha.refeicao_horas * 60); qtdRefeicao++; }

        // Extração Inteligente de Data, Início e Fim
        let dataFormatada = '-';
        let horaInicioStr = linha.inicio || '-';
        let horaFimStr = linha.fim || '-';

        if (linha.inicio && linha.inicio.includes(' ')) {
            const p = linha.inicio.split(' ');
            dataFormatada = p[0]; // Pega a Data
            horaInicioStr = p[1]; // Pega a Hora
        } else if (linha.inicio && linha.inicio.match(/\d{2}\/\d{2}\/\d{4}/)) {
            dataFormatada = linha.inicio; // Caso tenha vindo só a data
        }

        if (linha.fim && linha.fim.includes(' ')) {
            horaFimStr = linha.fim.split(' ')[1]; // Pega apenas a Hora do final
        }

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

        // Tabela Analítica Geral Atualizada (Data, Entrada e Saída Separados)
        tbodyAnalitica.insertAdjacentHTML('beforeend', `
            <tr class="hover:bg-slate-800/30 transition-colors">
                <td class="px-4 py-3 text-sky-400 font-semibold truncate max-w-[150px]">${linha.motorista}</td>
                <td class="px-4 py-3 text-slate-300">${dataFormatada}</td>
                <td class="px-4 py-3 text-slate-400">${horaInicioStr}</td>
                <td class="px-4 py-3 text-slate-400">${horaFimStr}</td>
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
    document.getElementById('jorDataReferencia').textContent = `Filtro Aplicado: ${activeQuickFilterJor}`;
}

// EXPORTAÇÃO EXCEL (SheetJS)
document.getElementById('btnExportarJornada').addEventListener('click', () => {
    if (jornadasGlobalData.length === 0) return alert("Nenhum dado para exportar.");
    
    const ws = XLSX.utils.json_to_sheet(jornadasGlobalData.map(d => {
        let dataF = '-', hrI = d.inicio || '-', hrF = d.fim || '-';
        if (d.inicio && d.inicio.includes(' ')) { const p = d.inicio.split(' '); dataF = p[0]; hrI = p[1]; }
        else if (d.inicio && d.inicio.match(/\d{2}\/\d{2}\/\d{4}/)) { dataF = d.inicio; }
        if (d.fim && d.fim.includes(' ')) { hrF = d.fim.split(' ')[1]; }

        return {
            "Motorista": d.motorista, 
            "Placa": d.placa,
            "Data": dataF,
            "Início": hrI, 
            "Fim": hrF,
            "T. Trabalho (h)": d.total_trabalho_horas, 
            "T. Direção (h)": d.direcao_horas,
            "Refeição (h)": d.refeicao_horas, 
            "Repouso (h)": d.repouso_horas,
            "Status": d.total_trabalho_horas > 12 ? 'INFRAÇÃO' : (d.total_trabalho_horas >= 10.5 ? 'ALERTA RISCO' : 'OK')
        };
    }));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jornadas");
    XLSX.writeFile(wb, `SerranaLog_Jornadas_${new Date().toISOString().slice(0,10)}.xlsx`);
});