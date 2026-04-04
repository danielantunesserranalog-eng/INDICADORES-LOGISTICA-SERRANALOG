// ==========================================
// js/jornadas.js - ALERTAS, FILTROS E LÓGICA DE DATAS E HORAS
// ==========================================

let fullJornadasData = []; 
let jornadasGlobalData = [];
let activeQuickFilterJor = 'ALL';

// Padrões Regex ATUALIZADOS: Agora aceita DD/MM (como no seu print "02/04 - 02:14")
const regexDate = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{1,2}-\d{1,2})/;
const regexTime = /(\d{1,2}:\d{2}(:\d{2})?)/;

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

// EXTRAIR DATA PARA CÁLCULO DE DIFERENÇA DE DIAS (Lendo o formato curto DD/MM)
function extrairDataParaFiltro(dataStr) {
    if (!dataStr) return null;
    
    // 1. Tenta DD/MM/YYYY
    let match = dataStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (match) {
        let year = parseInt(match[3], 10);
        if (year < 100) year += 2000;
        return new Date(year, match[2] - 1, match[1]); 
    }
    
    // 2. Tenta YYYY-MM-DD
    let matchISO = dataStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (matchISO) {
         return new Date(matchISO[1], matchISO[2] - 1, matchISO[3]);
    }

    // 3. Tenta APENAS DD/MM (Que é o formato que está vindo no seu arquivo)
    let matchCurto = dataStr.match(/(\d{1,2})\/(\d{1,2})/);
    if (matchCurto) {
         let year = new Date().getFullYear(); // Puxa 2026 automático
         return new Date(year, matchCurto[2] - 1, matchCurto[1]);
    }
    
    return null;
}

// POPULAR DROPDOWN DE DATAS ESPECÍFICAS PADRONIZADO
function popularFiltroDatas() {
    const selectData = document.getElementById('filterDataSelect');
    const datasSet = new Set();
    
    // Coleta todas as datas únicas
    fullJornadasData.forEach(d => {
        if (d.inicio) {
            const match = d.inicio.match(regexDate);
            if (match) {
                let dtStr = match[0];
                // Se a data for só 02/04, adiciona o ano /2026 para padronizar o visual
                if (dtStr.length <= 5) dtStr += '/' + new Date().getFullYear();
                datasSet.add(dtStr);
            }
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
    
    // Evento de Mudança
    selectData.addEventListener('change', (e) => {
        if(e.target.value !== 'ALL') {
            activeQuickFilterJor = 'ALL';
            atualizarBotoesFiltro();
        }
        renderizarPainelJornadas();
    });
}

// CARREGAR DADOS DO SUPABASE
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

// RENDERIZAR O PAINEL E APLICAR FILTROS
function renderizarPainelJornadas() {
    let dados = fullJornadasData;
    const dataEspec = document.getElementById('filterDataSelect').value;

    dados = dados.filter(d => {
        let dataParsedStr = '-';
        const matchDate = d.inicio ? d.inicio.match(regexDate) : null;
        
        // Padroniza a data lida do banco para comparar com o filtro
        if(matchDate) {
            dataParsedStr = matchDate[0];
            if (dataParsedStr.length <= 5) dataParsedStr += '/' + new Date().getFullYear();
        }

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

    if (dados.length === 0) { 
        document.getElementById('jorTotalMotoristas').innerText = '0';
        document.getElementById('jorQtdEstouros').innerText = '0';
        document.getElementById('jorQtdRisco').innerText = '0';
        document.getElementById('jorMediaRefeicao').innerText = '0h 00m';
        document.getElementById('jorTabelaAnaliticaBody').innerHTML = '<tr><td colspan="6" class="text-center py-4 text-slate-500">Nenhum dado encontrado para o filtro selecionado.</td></tr>';
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

        // Variáveis visuais padronizadas
        let dataInicioStr = '-';
        let horaInicioStr = '-';
        let dataFimStr = '-';
        let horaFimStr = '-';

        // MÁGICA DA EXTRAÇÃO ACONTECENDO AQUI
        if (linha.inicio) {
            const mD = linha.inicio.match(regexDate);
            const mT = linha.inicio.match(regexTime);
            if (mD) {
                dataInicioStr = mD[0];
                if (dataInicioStr.length <= 5) dataInicioStr += '/' + new Date().getFullYear();
            }
            if (mT) horaInicioStr = mT[0];
            if (!mD && !mT) horaInicioStr = linha.inicio; // Fallback
        }

        if (linha.fim) {
            const mDF = linha.fim.match(regexDate);
            const mTF = linha.fim.match(regexTime);
            
            if (mDF) {
                dataFimStr = mDF[0];
                if (dataFimStr.length <= 5) dataFimStr += '/' + new Date().getFullYear();
            } else {
                dataFimStr = dataInicioStr; // Se não tem data no Fim, assume que é do mesmo dia
            }

            if (mTF) horaFimStr = mTF[0];
            else horaFimStr = linha.fim.replace(regexDate, '').replace('-', '').trim() || linha.fim;
        }

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

        tbodyAnalitica.insertAdjacentHTML('beforeend', `
            <tr class="hover:bg-slate-800/30 transition-colors">
                <td class="px-4 py-3 text-sky-400 font-semibold truncate max-w-[150px]">${linha.motorista}</td>
                <td class="px-4 py-3">
                    <span class="text-[10px] text-slate-500 mr-2"><i class="far fa-calendar-alt"></i> ${dataInicioStr}</span>
                    <span class="font-mono text-slate-200">${horaInicioStr}</span>
                </td>
                <td class="px-4 py-3">
                    <span class="text-[10px] text-slate-500 mr-2"><i class="far fa-calendar-alt"></i> ${dataFimStr}</span>
                    <span class="font-mono text-slate-200">${horaFimStr}</span>
                </td>
                <td class="px-4 py-3 text-center ${corLinha}">${formatarHorasMinutos(horas)}</td>
                <td class="px-4 py-3 text-center text-slate-400">${formatarHorasMinutos(linha.direcao_horas || 0)}</td>
                <td class="px-4 py-3 text-center">${badge}</td>
            </tr>
        `);
    });

    const motoristasUnicos = new Set(dados.map(d => d.motorista)).size;
    
    document.getElementById('jorTotalMotoristas').textContent = motoristasUnicos;
    document.getElementById('jorQtdEstouros').textContent = qtdEstouros;
    document.getElementById('jorQtdRisco').textContent = qtdRisco;
    document.getElementById('jorMediaRefeicao').textContent = formatarHorasMinutos(qtdRefeicao > 0 ? (totalMinutosRefeicao / qtdRefeicao) / 60 : 0);
    document.getElementById('jorDataReferencia').textContent = `Filtro: ${dataEspec !== 'ALL' ? dataEspec : activeQuickFilterJor}`;
}

// EXPORTAÇÃO EXCEL
document.getElementById('btnExportarJornada').addEventListener('click', () => {
    if (jornadasGlobalData.length === 0) return alert("Nenhum dado para exportar.");
    
    const ws = XLSX.utils.json_to_sheet(jornadasGlobalData.map(d => {
        let dI = '-', hI = '-', dF = '-', hF = '-';
        
        if (d.inicio) {
            const mD = d.inicio.match(regexDate);
            const mT = d.inicio.match(regexTime);
            if (mD) {
                dI = mD[0];
                if (dI.length <= 5) dI += '/' + new Date().getFullYear();
            }
            if (mT) hI = mT[0];
            if (!mD && !mT) hI = d.inicio;
        }
        if (d.fim) {
            const mDF = d.fim.match(regexDate);
            const mTF = d.fim.match(regexTime);
            if (mDF) {
                dF = mDF[0];
                if (dF.length <= 5) dF += '/' + new Date().getFullYear();
            } else {
                dF = dI;
            }
            if (mTF) hF = mTF[0]; else hF = d.fim.replace(regexDate, '').replace('-', '').trim() || d.fim;
        }

        return {
            "Motorista": d.motorista, 
            "Placa": d.placa,
            "Data Início": dI,
            "Hora Início": hI, 
            "Data Fim": dF,
            "Hora Fim": hF,
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