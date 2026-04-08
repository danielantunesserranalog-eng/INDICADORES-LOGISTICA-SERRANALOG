// ==========================================
// js/jornadas.js
// ==========================================

Chart.register(ChartDataLabels);
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
Chart.defaults.font.family = "'Inter', sans-serif";

let fullJornadasData = []; 
let jornadasGlobalData = [];
let activeQuickFilterJor = 'ALL';
let currentStatusFilter = 'ALL'; 

let chartStatusFrota = null;
let chartFaixaHoras = null;

const regexDate = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{1,2}-\d{1,2})/;
const regexTime = /(\d{1,2}:\d{2}(:\d{2})?)/;

document.addEventListener('DOMContentLoaded', () => {
    configurarFiltros();
    carregarPainelJornadas();
});

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
            if (activeQuickFilterJor !== 'ALL') { document.getElementById('filterDataSelect').value = 'ALL'; }
            currentStatusFilter = 'ALL'; 
            renderizarPainelJornadas();
        });
    });
}

function extrairDataParaFiltro(dataStr) {
    if (!dataStr) return null;
    let match = dataStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (match) {
        let year = parseInt(match[3], 10);
        if (year < 100) year += 2000;
        return new Date(year, match[2] - 1, match[1]); 
    }
    let matchISO = dataStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (matchISO) return new Date(matchISO[1], matchISO[2] - 1, matchISO[3]);

    let matchCurto = dataStr.match(/(\d{1,2})\/(\d{1,2})/);
    if (matchCurto) {
         return new Date(new Date().getFullYear(), matchCurto[2] - 1, matchCurto[1]);
    }
    return null;
}

function verificarStatusAtualizacao(datasArray) {
    const indicador = document.getElementById('indicadorAtualizacao');
    const icone = document.getElementById('iconeAtualizacao');
    const texto = document.getElementById('textoAtualizacao');
    if(!indicador) return;

    indicador.classList.remove('hidden');

    if (!datasArray || datasArray.length === 0) {
        indicador.className = "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-inner bg-slate-900/50 text-slate-400 border-slate-600";
        icone.className = "fas fa-times-circle";
        texto.innerText = "Sem Dados";
        return;
    }

    let maxDate = new Date(0);
    let maxDateStr = "";

    datasArray.forEach(dStr => {
        const dt = extrairDataParaFiltro(dStr);
        if (dt && dt > maxDate) {
            maxDate = dt;
            const dia = String(dt.getDate()).padStart(2, '0');
            const mes = String(dt.getMonth() + 1).padStart(2, '0');
            const ano = dt.getFullYear();
            maxDateStr = `${dia}/${mes}/${ano}`;
        }
    });

    const hoje = new Date();
    const diaH = String(hoje.getDate()).padStart(2, '0');
    const mesH = String(hoje.getMonth() + 1).padStart(2, '0');
    const anoH = hoje.getFullYear();
    const hojeStr = `${diaH}/${mesH}/${anoH}`;

    if (maxDateStr === hojeStr) {
        indicador.className = "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-inner bg-emerald-900/30 text-emerald-400 border-emerald-500/50 transition-colors";
        icone.className = "fas fa-check-circle";
        texto.innerText = "Atualizado Hoje";
    } else {
        indicador.className = "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-inner bg-amber-900/30 text-amber-400 border-amber-500/50 transition-colors";
        icone.className = "fas fa-exclamation-triangle";
        texto.innerText = `Base: ${maxDateStr}`;
    }
}

function popularFiltroDatas() {
    const selectData = document.getElementById('filterDataSelect');
    const datasSet = new Set();
    fullJornadasData.forEach(d => {
        if (d.inicio) {
            const match = d.inicio.match(regexDate);
            if (match) {
                let dtStr = match[0];
                if (dtStr.length <= 5) dtStr += '/' + new Date().getFullYear();
                datasSet.add(dtStr);
            }
        }
    });
    
    verificarStatusAtualizacao(Array.from(datasSet));

    const datasUnicas = Array.from(datasSet).sort((a, b) => {
        return extrairDataParaFiltro(b) - extrairDataParaFiltro(a); 
    });
    
    selectData.innerHTML = '<option value="ALL">TODAS AS DATAS</option>';
    datasUnicas.forEach(dataStr => selectData.insertAdjacentHTML('beforeend', `<option value="${dataStr}">${dataStr}</option>`));
    
    selectData.addEventListener('change', (e) => {
        if(e.target.value !== 'ALL') { activeQuickFilterJor = 'ALL'; atualizarBotoesFiltro(); }
        currentStatusFilter = 'ALL'; 
        renderizarPainelJornadas();
    });
}

async function carregarPainelJornadas() {
    try {
        const { data: dadosBrutos, error } = await supabaseClient
            .from('historico_jornadas')
            .select('*')
            .order('id', { ascending: false })
            .limit(10000);

        if (error) throw error;
        if (dadosBrutos) fullJornadasData = dadosBrutos.filter(d => d.total_trabalho_horas >= 8);
        popularFiltroDatas();
        renderizarPainelJornadas();
    } catch (error) { console.error("Erro:", error); }
}

const centerTextPluginJornadas = {
    id: 'centerText',
    beforeDraw: function(chart) {
        if (chart.config.type !== 'doughnut') return;
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;
        const total = chart.config.data.datasets[0].data.reduce((a, b) => a + b, 0);
        ctx.restore();
        
        ctx.font = "bold 28px 'Inter', sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#f8fafc"; 
        const text = total;
        ctx.fillText(text, centerX - (ctx.measureText(text).width / 2), centerY - 6);
        
        ctx.font = "bold 12px 'Inter', sans-serif";
        ctx.fillStyle = "#94a3b8"; 
        ctx.fillText("REGISTROS", centerX - (ctx.measureText("REGISTROS").width / 2), centerY + 18);
        ctx.save();
    }
};

function renderizarPainelJornadas() {
    let dados = fullJornadasData;
    const dataEspec = document.getElementById('filterDataSelect').value;

    dados = dados.filter(d => {
        let dataParsedStr = '-';
        const matchDate = d.inicio ? d.inicio.match(regexDate) : null;
        if(matchDate) {
            dataParsedStr = matchDate[0];
            if (dataParsedStr.length <= 5) dataParsedStr += '/' + new Date().getFullYear();
        }
        if (dataEspec !== 'ALL' && dataParsedStr !== dataEspec) return false;

        if (activeQuickFilterJor !== 'ALL') {
            const dataParsed = extrairDataParaFiltro(d.inicio);
            if (dataParsed) {
                const hj = new Date(); hj.setHours(0, 0, 0, 0); dataParsed.setHours(0, 0, 0, 0);
                const diffDias = Math.round((hj - dataParsed) / 86400000);
                if (activeQuickFilterJor === 'D-1' && diffDias !== 1) return false;
                if (activeQuickFilterJor === 'D-2' && diffDias !== 2) return false;
                if (activeQuickFilterJor === 'D-7' && (diffDias < 0 || diffDias > 7)) return false;
                if (activeQuickFilterJor === 'D-30' && (diffDias < 0 || diffDias > 30)) return false;
            } else return false;
        }
        return true;
    });

    jornadasGlobalData = dados;

    if (dados.length === 0) { 
        document.getElementById('jorFilterStatus').innerText = '0 Registros';
        document.getElementById('jorTotalMotoristas').innerText = '0';
        document.getElementById('jorQtdEstouros').innerText = '0';
        document.getElementById('jorMediaDirecao').innerText = '0h 00m';
        document.getElementById('jorTabelaAnaliticaBody').innerHTML = '<tr><td colspan="9" class="text-center py-4 text-slate-500">Nenhum dado encontrado para o filtro.</td></tr>';
        document.getElementById('jorTopEstourosBody').innerHTML = '';
        document.getElementById('jorTopNoturnasBody').innerHTML = '';
        document.getElementById('jorTopExtrasBody').innerHTML = '';
        if(chartStatusFrota) chartStatusFrota.destroy();
        if(chartFaixaHoras) chartFaixaHoras.destroy();
        return; 
    }

    let qtdOk = 0, qtdEstouros = 0;
    dados.forEach(linha => {
        if ((linha.total_trabalho_horas || 0) > 12) qtdEstouros++; else qtdOk++;
    });

    let dadosFiltrados = dados.filter(d => {
        const isEstouro = (d.total_trabalho_horas || 0) > 12;
        if (currentStatusFilter === 'OK' && isEstouro) return false;
        if (currentStatusFilter === 'INFRACAO' && !isEstouro) return false;
        return true;
    });

    document.getElementById('jorFilterStatus').innerText = `${dadosFiltrados.length} Registros`;

    let totalMinutosDirecao = 0; let qtdDirecao = 0;
    let fx8_10 = 0, fx10_12 = 0, fx12_14 = 0, fx14mais = 0;
    
    const tbodyAnalitica = document.getElementById('jorTabelaAnaliticaBody'); tbodyAnalitica.innerHTML = '';
    const tbodyEstouro = document.getElementById('jorTopEstourosBody'); tbodyEstouro.innerHTML = '';
    
    const agregacaoMotoristas = new Map();

    dadosFiltrados.forEach(linha => {
        const horas = linha.total_trabalho_horas || 0;
        const isEstouro = horas > 12;
        const motNome = linha.motorista;

        if (horas >= 8 && horas < 10) fx8_10++;
        else if (horas >= 10 && horas <= 12) fx10_12++;
        else if (horas > 12 && horas <= 14) fx12_14++;
        else if (horas > 14) fx14mais++;

        if (linha.direcao_horas > 0) { totalMinutosDirecao += (linha.direcao_horas * 60); qtdDirecao++; }

        if (!agregacaoMotoristas.has(motNome)) {
            agregacaoMotoristas.set(motNome, { nome: motNome, noturnas: 0, extras: 0, maxTrabalho: 0 });
        }
        const motObj = agregacaoMotoristas.get(motNome);
        motObj.noturnas += (linha.horas_noturnas || 0);
        motObj.extras += (linha.horas_extras || 0);
        if (horas > motObj.maxTrabalho) motObj.maxTrabalho = horas;

        let dataInicioStr = '-', horaInicioStr = '-', dataFimStr = '-', horaFimStr = '-';
        if (linha.inicio) {
            const mD = linha.inicio.match(regexDate); const mT = linha.inicio.match(regexTime);
            if (mD) { dataInicioStr = mD[0]; if (dataInicioStr.length <= 5) dataInicioStr += '/' + new Date().getFullYear(); }
            if (mT) horaInicioStr = mT[0]; if (!mD && !mT) horaInicioStr = linha.inicio;
        }
        if (linha.fim) {
            const mDF = linha.fim.match(regexDate); const mTF = linha.fim.match(regexTime);
            if (mDF) { dataFimStr = mDF[0]; if (dataFimStr.length <= 5) dataFimStr += '/' + new Date().getFullYear(); } else dataFimStr = dataInicioStr; 
            if (mTF) horaFimStr = mTF[0]; else horaFimStr = linha.fim.replace(regexDate, '').replace('-', '').trim() || linha.fim;
        }

        let corLinha = 'text-emerald-400';
        let badge = `<span class="border border-emerald-500 text-emerald-500 bg-emerald-900/20 px-2 py-1 rounded text-[10px] uppercase font-bold">OK</span>`;
        
        if(isEstouro) {
            corLinha = 'text-rose-500 font-bold';
            badge = `<span class="border border-rose-500 text-rose-500 bg-rose-900/20 px-2 py-1 rounded text-[10px] uppercase font-bold animate-pulse">INFRAÇÃO</span>`;
            tbodyEstouro.insertAdjacentHTML('beforeend', `<tr><td class="px-3 py-2 text-slate-300 truncate max-w-[120px]">${motNome}</td><td class="px-3 py-2 text-right font-black text-rose-500">${formatarHorasMinutos(horas)}</td></tr>`);
        }

        tbodyAnalitica.insertAdjacentHTML('beforeend', `
            <tr class="hover:bg-slate-800/30 transition-colors border-b border-slate-800/50">
                <td class="px-4 py-3 text-sky-400 font-semibold truncate max-w-[150px]">${motNome}</td>
                <td class="px-4 py-3"><span class="text-[10px] text-slate-500 mr-2"><i class="far fa-calendar-alt"></i> ${dataInicioStr}</span></td>
                <td class="px-4 py-3 text-center text-slate-200 font-mono">${horaInicioStr}</td>
                <td class="px-4 py-3 text-center text-slate-200 font-mono">${horaFimStr}</td>
                <td class="px-4 py-3 text-center text-indigo-400 font-bold">${formatarHorasMinutos(linha.horas_noturnas)}</td>
                <td class="px-4 py-3 text-center text-amber-400 font-bold">${formatarHorasMinutos(linha.horas_extras)}</td>
                <td class="px-4 py-3 text-center ${corLinha}">${formatarHorasMinutos(horas)}</td>
                <td class="px-4 py-3 text-center text-slate-400">${formatarHorasMinutos(linha.direcao_horas || 0)}</td>
                <td class="px-4 py-3 text-center">${badge}</td>
            </tr>
        `);
    });

    const arrMot = Array.from(agregacaoMotoristas.values());

    const tbodyNoturnas = document.getElementById('jorTopNoturnasBody');
    tbodyNoturnas.innerHTML = '';
    const topNoturnas = arrMot.filter(m => m.noturnas > 0).sort((a,b) => b.noturnas - a.noturnas).slice(0,5);
    if(topNoturnas.length === 0) tbodyNoturnas.innerHTML = '<tr><td colspan="2" class="p-2 text-center text-slate-500 text-xs">Sem horas noturnas.</td></tr>';
    topNoturnas.forEach(m => {
        tbodyNoturnas.insertAdjacentHTML('beforeend', `<tr><td class="px-3 py-2 text-slate-300 truncate max-w-[120px]">${m.nome}</td><td class="px-3 py-2 text-right font-black text-indigo-400">${formatarHorasMinutos(m.noturnas)}</td></tr>`);
    });

    const tbodyExtras = document.getElementById('jorTopExtrasBody');
    tbodyExtras.innerHTML = '';
    const topExtras = arrMot.filter(m => m.extras > 0).sort((a,b) => b.extras - a.extras).slice(0,5);
    if(topExtras.length === 0) tbodyExtras.innerHTML = '<tr><td colspan="2" class="p-2 text-center text-slate-500 text-xs">Sem horas extras.</td></tr>';
    topExtras.forEach(m => {
        tbodyExtras.insertAdjacentHTML('beforeend', `<tr><td class="px-3 py-2 text-slate-300 truncate max-w-[120px]">${m.nome}</td><td class="px-3 py-2 text-right font-black text-amber-400">${formatarHorasMinutos(m.extras)}</td></tr>`);
    });

    document.getElementById('jorTotalMotoristas').textContent = arrMot.length;
    document.getElementById('jorQtdEstouros').textContent = dadosFiltrados.filter(d => (d.total_trabalho_horas || 0) > 12).length;
    document.getElementById('jorMediaDirecao').textContent = formatarHorasMinutos(qtdDirecao > 0 ? (totalMinutosDirecao / qtdDirecao) / 60 : 0);
    
    let filterText = dataEspec !== 'ALL' ? dataEspec : activeQuickFilterJor;
    if (currentStatusFilter !== 'ALL') filterText += ` | Status: ${currentStatusFilter}`;
    document.getElementById('jorDataReferencia').textContent = `Filtro: ${filterText}`;

    if (chartStatusFrota) chartStatusFrota.destroy();
    if (chartFaixaHoras) chartFaixaHoras.destroy();

    const totalStatus = qtdOk + qtdEstouros;
    
    const bgColors = ['#10b981', '#f43f5e'];
    if (currentStatusFilter === 'OK') bgColors[1] = '#f43f5e33'; 
    if (currentStatusFilter === 'INFRACAO') bgColors[0] = '#10b98133';

    const ctxStatus = document.getElementById('statusFrotaChart').getContext('2d');
    chartStatusFrota = new Chart(ctxStatus, {
        type: 'doughnut',
        data: { 
            labels: ['OK (<= 12h)', 'Infração (> 12h)'], 
            datasets: [{ 
                data: [qtdOk, qtdEstouros], 
                backgroundColor: bgColors, 
                borderWidth: 2, 
                borderColor: '#1e293b' 
            }] 
        },
        plugins: [centerTextPluginJornadas],
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            cutout: '60%', 
            layout: {
                padding: { top: 40, bottom: 40, left: 20, right: 20 } 
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    if (index === 0) currentStatusFilter = currentStatusFilter === 'OK' ? 'ALL' : 'OK';
                    else currentStatusFilter = currentStatusFilter === 'INFRACAO' ? 'ALL' : 'INFRACAO';
                } else {
                    currentStatusFilter = 'ALL';
                }
                renderizarPainelJornadas();
            },
            onHover: (event, elements) => {
                event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
            },
            plugins: { 
                legend: { 
                    position: 'right', 
                    labels: { boxWidth: 12, font: { size: 12 } } 
                }, 
                datalabels: { 
                    display: true,
                    color: '#f8fafc',
                    font: { weight: 'bold', size: 14 }, 
                    textAlign: 'center',
                    anchor: 'end',
                    align: 'end',
                    offset: 8, 
                    formatter: (value) => {
                        if (value === 0) return null;
                        const perc = totalStatus > 0 ? ((value / totalStatus) * 100).toFixed(1) : 0;
                        return `${value}\n(${perc}%)`;
                    }
                } 
            } 
        }
    });

    const ctxFaixas = document.getElementById('faixaHorasChart').getContext('2d');
    let gradientBar = ctxFaixas.createLinearGradient(0, 0, 0, 400);
    gradientBar.addColorStop(0, '#10b981'); gradientBar.addColorStop(1, '#059669'); 

    chartFaixaHoras = new Chart(ctxFaixas, {
        type: 'bar',
        data: { 
            labels: ['8h a 10h', '10h a 12h', '12h a 14h', '> 14h'], 
            datasets: [{ 
                label: 'Qtd de Jornadas', 
                data: [fx8_10, fx10_12, fx12_14, fx14mais], 
                backgroundColor: [gradientBar, gradientBar, '#f43f5e', '#9f1239'], 
                borderRadius: 4, 
                barPercentage: 0.6 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            layout: { 
                padding: { top: 25, bottom: 10 } // Adicionado espaço inferior
            }, 
            plugins: { 
                legend: { display: false }, 
                datalabels: { 
                    color: '#fff', 
                    anchor: 'end', 
                    align: 'top', 
                    font: { weight: 'bold', size: 13 } 
                } 
            }, 
            scales: { 
                y: { display: false }, 
                x: { 
                    grid: { display: false }, 
                    border: { display: false },
                    ticks: { 
                        color: '#cbd5e1', // Cor mais clara para o texto
                        font: { size: 13, weight: '600' } // Fonte um pouco maior e negrito
                    } 
                } 
            } 
        }
    });
}

document.getElementById('btnExportarJornada').addEventListener('click', () => {
    if (jornadasGlobalData.length === 0) return alert("Nenhum dado para exportar.");
    const ws = XLSX.utils.json_to_sheet(jornadasGlobalData.map(d => {
        let dI = '-', hI = '-', dF = '-', hF = '-';
        if (d.inicio) {
            const mD = d.inicio.match(regexDate); const mT = d.inicio.match(regexTime);
            if (mD) { dI = mD[0]; if (dI.length <= 5) dI += '/' + new Date().getFullYear(); }
            if (mT) hI = mT[0]; if (!mD && !mT) hI = d.inicio;
        }
        if (d.fim) {
            const mDF = d.fim.match(regexDate); const mTF = d.fim.match(regexTime);
            if (mDF) { dF = mDF[0]; if (dF.length <= 5) dF += '/' + new Date().getFullYear(); } else dF = dI;
            if (mTF) hF = mTF[0]; else hF = d.fim.replace(regexDate, '').replace('-', '').trim() || d.fim;
        }
        return {
            "Motorista": d.motorista, "Placa": d.placa, "Data Início": dI, "Hora Início": hI, "Data Fim": dF, "Hora Fim": hF,
            "H. Noturnas": formatarHorasMinutos(d.horas_noturnas), "H. Extras (Soma)": formatarHorasMinutos(d.horas_extras),
            "T. Trabalho (h)": d.total_trabalho_horas, "T. Direção (h)": d.direcao_horas, "Refeição (h)": d.refeicao_horas, "Repouso (h)": d.repouso_horas,
            "Status": d.total_trabalho_horas > 12 ? 'INFRAÇÃO' : 'OK'
        };
    }));
    const wb = XLSX.utils.book_new(); XLSX.book_append_sheet(wb, ws, "Jornadas");
    XLSX.writeFile(wb, `SerranaLog_Jornadas_${new Date().toISOString().slice(0,10)}.xlsx`);
});