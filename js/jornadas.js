// ==========================================
// js/jornadas.js - ALERTAS, FILTROS E LÓGICA DE DATAS
// ==========================================

let fullJornadasData = []; 
let jornadasGlobalData = [];
let activeQuickFilterJor = 'ALL';

// Padrões Regex para caçar data e hora em qualquer formato que a planilha enviar
const regexDate = /(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/;
const regexTime = /(\d{2}:\d{2}(:\d{2})?)/;

document.addEventListener('DOMContentLoaded', () => {
    configurarFiltros();
    carregarPainelJornadas();
});

// CONFIGURAÇÃO DOS BOTÕES DE FILTRO RÁPIDO (D-1, D-2...)
function atualizarBotoesFiltro() {
    const btnQFs = document.querySelectorAll('.btn-qf-jor');
    btnQFs.forEach(b => {
        if (b.getAttribute('data-qf') === activeQuickFilterJor) {
            b.classList.add('active', 'bg-sky-900/50', 'text-sky-400');
            b.classList.remove('text-slate-400');
        } else {
            b.classList.remove('active', 'bg-sky-900/50', 'text-sky-400');
            b.classList.add('text-slate-400');
        }
    });
}

function configurarFiltros() {
    const btnQFs = document.querySelectorAll('.btn-qf-jor');
    btnQFs.forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeQuickFilterJor = e.currentTarget.getAttribute('data-qf');
            atualizarBotoesFiltro();
            
            // Se usou atalho rápido, zera o filtro de data específica
            if (activeQuickFilterJor !== 'ALL') {
                document.getElementById('filterDataSelect').value = 'ALL';
            }
            
            renderizarPainelJornadas();
        });
    });
}

// EXTRAIR DATA COM SEGURANÇA PARA CÁLCULO DE DIFERENÇA DE DIAS
function extrairDataParaFiltro(dataStr) {
    if (!dataStr) return null;
    const match = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
        return new Date(match[3], match[2] - 1, match[1]); // Ano, Mês (0-11), Dia
    }
    const matchISO = dataStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if(matchISO) {
         return new Date(matchISO[1], matchISO[2] - 1, matchISO[3]);
    }
    return null;
}

// POPULAR DROPDOWN DE DATAS ESPECÍFICAS
function popularFiltroDatas() {
    const selectData = document.getElementById('filterDataSelect');
    const datasSet = new Set();
    
    // Coleta todas as datas únicas disponíveis no banco
    fullJornadasData.forEach(d => {
        if (d.inicio) {
            const match = d.inicio.match(regexDate);
            if (match) datasSet.add(match[0]);
        }
    });
    
    // Ordena da mais recente para a mais antiga
    const datasUnicas = Array.from(datasSet).sort((a, b) => {
        const dateA = extrairDataParaFiltro(a);
        const dateB = extrairDataParaFiltro(b);
        return dateB - dateA; 
    });
    
    // Preenche o Select HTML
    selectData.innerHTML = '<option value="ALL">TODAS AS DATAS</option>';
    datasUnicas.forEach(dataStr => {
        selectData.insertAdjacentHTML('beforeend', `<option value="${dataStr}">${dataStr}</option>`);
    });
    
    // Ao escolher uma data específica, aplica a renderização
    selectData.addEventListener('change', (e) => {
        if(e.target.value !== 'ALL') {
            activeQuickFilterJor = 'ALL'; // Desativa os filtros rápidos se escolher uma data exata
            atualizarBotoesFiltro();
        }
        renderizarPainelJornadas();
    });
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
        
        popularFiltroDatas();
        renderizarPainelJornadas();
    } catch (error) { 
        console.error("Erro ao carregar o painel:", error); 
    }
}

// RENDERIZAR O PAINEL (Com base nos filtros)
function renderizarPainelJornadas() {
    let dados = fullJornadasData;
    const dataEspec = document.getElementById('filterDataSelect').value;

    // Aplicação dos Filtros Cruzados (Data Específica e/ou Atalhos Rápidos)
    dados = dados.filter(d => {
        let dataParsedStr = '-';
        const matchDate = d.inicio ? d.inicio.match(regexDate) : null;
        if(matchDate) dataParsedStr = matchDate[0];

        // 1. Filtro Data Específica
        if (dataEspec !== 'ALL' && dataParsedStr !== dataEspec) {
            return false;
        }

        // 2. Filtro Atalho Rápido (D-1, D-2 etc)
        if (activeQuickFilterJor !== 'ALL') {
            const dataParsed = extrairDataParaFiltro(d.inicio);
            if (dataParsed) {
                const hj = new Date(); 
                hj.setHours(0, 0, 0, 0);
                dataParsed.setHours(0, 0, 0, 0);
                
                const diffDias = Math.round((hj - dataParsed) / 86400000);
                
                if (activeQuickFilterJor === 'D-1' && diffDias !== 1) return false;
                if (activeQuickFilterJor === 'D-2' && diffDias !== 2) return false;
                if (activeQuickFilterJor === 'D-7' && (diffDias < 0 || diffDias > 7)) return false;
                if (activeQuickFilterJor === 'D-30' && (diffDias < 0 || diffDias > 30)) return false;
            } else {
                return false;
            }
        }
        
        return true;
    });

    jornadasGlobalData = dados;
    document.getElementById('jorFilterStatus').innerText = `${dados.length} Registros`;

    // Reseta Contadores Visuais
    if (dados.length === 0) { 
        document.getElementById('jorTotalMotoristas').innerText = '0';
        document.getElementById('jorQtdEstouros').innerText = '0';
        document.getElementById('jorQtdRisco').innerText = '0';
        document.getElementById('jorMediaRefeicao').innerText = '0h 00m';
        document.getElementById('jorTabelaAnaliticaBody').innerHTML = '<tr><td colspan="7" class="text-center py-4 text-slate-500">Nenhum dado encontrado para o filtro selecionado.</td></tr>';
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

        // Extração Robusta (Inteligente) de Data, Início e Fim via Regex
        let dataFormatada = '-';
        let horaInicioStr = '-';
        let horaFimStr = '-';

        if (linha.inicio) {
            const matchDate = linha.inicio.match(regexDate);
            const matchTime = linha.inicio.match(regexTime);
            if (matchDate) dataFormatada = matchDate[0];
            if (matchTime) horaInicioStr = matchTime[0];
            
            // Se por acaso a origem não tem hora legível, exibe a string inteira na hora pra não ficar vazio
            if(!matchTime && !matchDate) horaInicioStr = linha.inicio;
        }

        if (linha.fim) {
            const matchTimeFim = linha.fim.match(regexTime);
            if (matchTimeFim) horaFimStr = matchTimeFim[0];
            else {
                // Tenta remover a data para deixar só a hora (caso o regex da hora falhe por formato estranho)
                horaFimStr = linha.fim.replace(regexDate, '').trim() || linha.fim;
            }
        }

        // Configuração Visual do Badge de Status
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

        // Monta a Tabela Analítica Geral (Com horas arrumadas)
        tbodyAnalitica.insertAdjacentHTML('beforeend', `
            <tr class="hover:bg-slate-800/30 transition-colors">
                <td class="px-4 py-3 text-sky-400 font-semibold truncate max-w-[150px]">${linha.motorista}</td>
                <td class="px-4 py-3 text-slate-300">${dataFormatada}</td>
                <td class="px-4 py-3 text-center text-slate-400 font-mono">${horaInicioStr}</td>
                <td class="px-4 py-3 text-center text-slate-400 font-mono">${horaFimStr}</td>
                <td class="px-4 py-3 text-center ${corLinha}">${formatarHorasMinutos(horas)}</td>
                <td class="px-4 py-3 text-center text-slate-400">${formatarHorasMinutos(linha.direcao_horas || 0)}</td>
                <td class="px-4 py-3 text-center">${badge}</td>
            </tr>
        `);
    });

    // Conta apenas motoristas ÚNICOS (Remove duplicados de dias diferentes)
    const motoristasUnicos = new Set(dados.map(d => d.motorista)).size;
    
    document.getElementById('jorTotalMotoristas').textContent = motoristasUnicos;
    document.getElementById('jorQtdEstouros').textContent = qtdEstouros;
    document.getElementById('jorQtdRisco').textContent = qtdRisco;
    document.getElementById('jorMediaRefeicao').textContent = formatarHorasMinutos(qtdRefeicao > 0 ? (totalMinutosRefeicao / qtdRefeicao) / 60 : 0);
    document.getElementById('jorDataReferencia').textContent = `Filtro: ${dataEspec !== 'ALL' ? dataEspec : activeQuickFilterJor}`;
}

// EXPORTAÇÃO EXCEL (SheetJS) APRIMORADA
document.getElementById('btnExportarJornada').addEventListener('click', () => {
    if (jornadasGlobalData.length === 0) return alert("Nenhum dado para exportar.");
    
    const ws = XLSX.utils.json_to_sheet(jornadasGlobalData.map(d => {
        // Extrai a data e hora formatada também para o Excel ficar perfeitamente limpo
        let dataF = '-', hrI = '-', hrF = '-';
        if (d.inicio) {
            const mD = d.inicio.match(regexDate);
            const mT = d.inicio.match(regexTime);
            if (mD) dataF = mD[0];
            if (mT) hrI = mT[0];
            if (!mD && !mT) hrI = d.inicio;
        }
        if (d.fim) {
            const mTF = d.fim.match(regexTime);
            if (mTF) hrF = mTF[0];
            else hrF = d.fim.replace(regexDate, '').trim() || d.fim;
        }

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