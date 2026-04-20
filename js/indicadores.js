// ==========================================
// js/indicadores.js - LÓGICA DA PÁGINA
// ==========================================

// 1. CRIAR CONEXÃO EXCLUSIVA COM O BANCO DE MANUTENÇÃO (CCOL)
if (typeof window.supabaseManutencao === 'undefined') {
    window.supabaseManutencao = window.supabase.createClient(
        'https://ihgiyxzxdldqmrkziijl.supabase.co',
        'sb_publishable_JpMZhW5ZrFKBr7m9KXBkoQ_cpxy1k3x'
    );
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Módulo de Indicadores carregado e pronto para uso.');
    initPainelIndicadores();
});

async function initPainelIndicadores() {
    const elAvgDM = document.getElementById('avgDM');
    if (elAvgDM) elAvgDM.innerHTML = '<i class="fas fa-spinner fa-spin text-slate-500"></i>';

    try {
        // ATUALIZADO: Busca TODAS as Ordens de Serviço paginando (Imune ao limite de 1000)
        let ordensPaginadas = [];
        let from = 0;
        let step = 1000;
        let fetchMore = true;

        while (fetchMore) {
            const { data, error } = await window.supabaseManutencao
                .from('ordens_servico')
                .select('*')
                .range(from, from + step - 1);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                ordensPaginadas = ordensPaginadas.concat(data);
                from += step;
            }
            
            if (!data || data.length < step) {
                fetchMore = false;
            }
        }

        // Busca a frota DIRETAMENTE DO BANCO DO CCOL
        const { data: frotas, error: errFrotas } = await window.supabaseManutencao
            .from('frotas_manutencao')
            .select('cavalo');
            
        if (errFrotas) throw errFrotas;

        window.frotasManutencao = frotas || [];
        window.ordensServico = ordensPaginadas || [];

        console.log(`Sucesso: ${window.frotasManutencao.length} cavalos e ${window.ordensServico.length} OS carregadas do Banco CCOL.`);

        if (typeof window.renderizarGraficoEvolucaoDM === 'function') {
            window.renderizarGraficoEvolucaoDM();
        }

    } catch (error) {
        console.error("Erro ao puxar dados do banco de Manutenção:", error);
        if (elAvgDM) elAvgDM.innerText = "ERRO O.S.";
    }
}

// === LÓGICA DE EVOLUÇÃO HORÁRIA ===
window.renderizarGraficoEvolucaoDM = function(dataFiltro) {
    if (typeof window.frotasManutencao === 'undefined' || !window.frotasManutencao || window.frotasManutencao.length === 0) return;
    if (typeof window.ordensServico === 'undefined') return;
    
    const agora = new Date();
    let dataBase = new Date(); 
    let ehHoje = true;

    if (dataFiltro && dataFiltro !== 'mes_atual' && dataFiltro.length > 5) {
        const partesData = dataFiltro.split('-');
        if(partesData.length === 3) {
            dataBase = new Date(partesData[0], partesData[1] - 1, partesData[2]);
            ehHoje = (dataBase.getDate() === agora.getDate() && 
                      dataBase.getMonth() === agora.getMonth() && 
                      dataBase.getFullYear() === agora.getFullYear());
        }
    } else {
        const inputData = document.getElementById('filtroDataEvolucaoDM');
        if (inputData && !inputData.value) {
            const mesStr = String(agora.getMonth() + 1).padStart(2, '0');
            const diaStr = String(agora.getDate()).padStart(2, '0');
            inputData.value = `${agora.getFullYear()}-${mesStr}-${diaStr}`;
        }
    }

    const labelsX = [];
    const dadosLinhaDM = [];
    const dadosBarraAtivos = [];
    const dadosBarraManut = [];
    const dadosBarraSOS = [];

    const msPorHora = 60 * 60 * 1000;
    const totalFrota = window.frotasManutencao.length;
    if (totalFrota === 0) return; 
    const totalMsDisponivelPorHora = totalFrota * msPorHora;

    let horaLimite = 23;
    if (ehHoje) horaLimite = agora.getHours();

    let somaDM = 0, somaAtivos = 0, somaManut = 0, somaSOS = 0, contagemHoras = 0;

    for (let i = 0; i <= horaLimite; i++) {
        const inicioHora = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate(), i, 0, 0, 0);
        const fimHora = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate(), i, 59, 59, 999);
        
        let msManutencaoNestaHora = 0;
        let qtdEmManutencao = 0;
        let qtdEmSOS = 0;

        window.frotasManutencao.forEach(frota => {
            let manutencaoCavalo = 0;
            let teveManutencaoComum = false;
            let teveSOS = false;

            const todasOSCavalo = window.ordensServico.filter(o => o.placa === frota.cavalo);
            
            todasOSCavalo.forEach(os => {
                let osInicioStr = os.data_abertura;
                if (!osInicioStr) return;
                if (!osInicioStr.includes('T')) osInicioStr += 'T00:00:00';
                const osInicio = new Date(osInicioStr.replace('Z', '').replace('+00:00', ''));
                
                let osFim = agora;
                if (os.data_conclusao) {
                    let osFimStr = os.data_conclusao;
                    if (!osFimStr.includes('T')) osFimStr += 'T00:00:00';
                    osFim = new Date(osFimStr.replace('Z', '').replace('+00:00', ''));
                }

                const overlapInicio = osInicio > inicioHora ? osInicio : inicioHora;
                const overlapFim = osFim < fimHora ? osFim : fimHora;

                if (overlapInicio < overlapFim && os.status !== 'Agendada') {
                    manutencaoCavalo += (overlapFim - overlapInicio);
                    const tipoOS = (os.tipo || os.tipo_manutencao || '').toUpperCase();
                    const descOS = (os.descricao || '').toUpperCase();
                    const prioridadeOS = (os.prioridade || '').toUpperCase();

                    if (tipoOS.includes('S.O.S') || tipoOS.includes('SOS') || tipoOS.includes('SOCORRO') ||
                        descOS.includes('S.O.S') || descOS.includes('SOS') || descOS.includes('SOCORRO') ||
                        prioridadeOS.includes('EMERGÊNCIA')) {
                        teveSOS = true;
                    } else {
                        teveManutencaoComum = true;
                    }
                }
            });
            
            if (manutencaoCavalo > msPorHora) manutencaoCavalo = msPorHora;
            msManutencaoNestaHora += manutencaoCavalo;

            if (teveSOS) qtdEmSOS++;
            else if (teveManutencaoComum) qtdEmManutencao++;
        });

        let dispNestaHora = totalMsDisponivelPorHora - msManutencaoNestaHora;
        if(dispNestaHora < 0) dispNestaHora = 0;
        let percentDM = (dispNestaHora / totalMsDisponivelPorHora) * 100;
        
        labelsX.push(`${String(i).padStart(2,'0')}:00`);
        dadosLinhaDM.push(percentDM.toFixed(2));

        let qtdAtivos = totalFrota - qtdEmManutencao - qtdEmSOS;
        if (qtdAtivos < 0) qtdAtivos = 0;

        dadosBarraAtivos.push(qtdAtivos);
        dadosBarraManut.push(qtdEmManutencao);
        dadosBarraSOS.push(qtdEmSOS);

        somaDM += percentDM;
        somaAtivos += qtdAtivos;
        somaManut += qtdEmManutencao;
        somaSOS += qtdEmSOS;
        contagemHoras++;
    }

    if (contagemHoras > 0) {
        document.getElementById('avgDM').innerText = (somaDM / contagemHoras).toFixed(1) + '%';
        document.getElementById('avgAtivos').innerText = Math.round(somaAtivos / contagemHoras);
        document.getElementById('avgManut').innerText = Math.round(somaManut / contagemHoras);
        document.getElementById('avgSOS').innerText = Math.round(somaSOS / contagemHoras);
    }

    if (typeof echarts === 'undefined') return;

    const chartDomLinha = document.getElementById('graficoEvolucaoDM');
    if (chartDomLinha) {
        let myChartLinha = echarts.getInstanceByDom(chartDomLinha) || echarts.init(chartDomLinha);
        myChartLinha.setOption({
            backgroundColor: 'transparent',
            tooltip: { trigger: 'axis', formatter: '{b} <br/> DM Geral: {c}%' },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: { 
                type: 'category', 
                boundaryGap: false, 
                data: labelsX, 
                axisLabel: { color: '#94a3b8', fontWeight: 'bold' } 
            },
            yAxis: { 
                type: 'value', 
                min: 0, 
                max: 100, 
                axisLabel: { formatter: '{value}%', color: '#94a3b8', fontWeight: 'bold' }, 
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } 
            },
            series: [{
                name: 'DM Horário', 
                type: 'line', 
                data: dadosLinhaDM, 
                smooth: true,
                label: { show: true, position: 'top', formatter: '{c}%', color: '#e2e8f0', fontSize: 11, fontWeight: 'bold' },
                itemStyle: { color: '#3b82f6' }, 
                lineStyle: { width: 4 },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(59, 130, 246, 0.4)' },
                        { offset: 1, color: 'rgba(59, 130, 246, 0)' }
                    ])
                }
            }]
        });
        window.addEventListener('resize', () => myChartLinha.resize());
    }

    const chartDomBarras = document.getElementById('graficoStatusFrotaHorario');
    if (chartDomBarras) {
        let myChartBarras = echarts.getInstanceByDom(chartDomBarras) || echarts.init(chartDomBarras);
        myChartBarras.setOption({
            backgroundColor: 'transparent',
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            legend: { 
                data: ['Disponível', 'Manutenção', 'SOS'], 
                textStyle: { color: '#cbd5e1', fontWeight: 'bold' }, 
                top: 0 
            },
            grid: { top: '15%', left: '3%', right: '3%', bottom: '5%', containLabel: true },
            xAxis: { 
                type: 'category', 
                data: labelsX, 
                axisLabel: { color: '#94a3b8', fontWeight: 'bold' } 
            },
            yAxis: { 
                type: 'value', 
                nameTextStyle: { color: '#94a3b8', padding: [0, 0, 0, 50], fontWeight: 'bold' }, 
                axisLabel: { color: '#94a3b8', fontWeight: 'bold' }, 
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } 
            },
            series: [
                { 
                    name: 'Disponível', 
                    type: 'bar', 
                    itemStyle: { color: '#10b981' }, 
                    data: dadosBarraAtivos, 
                    label: { show: true, position: 'top', color: '#10b981', fontWeight: 'bold', formatter: (p) => p.value > 0 ? p.value : '' } 
                },
                { 
                    name: 'Manutenção', 
                    type: 'bar', 
                    itemStyle: { color: '#f59e0b' }, 
                    data: dadosBarraManut, 
                    label: { show: true, position: 'top', color: '#f59e0b', fontWeight: 'bold', formatter: (p) => p.value > 0 ? p.value : '' } 
                },
                { 
                    name: 'SOS', 
                    type: 'bar', 
                    itemStyle: { color: '#ef4444' }, 
                    data: dadosBarraSOS, 
                    label: { show: true, position: 'top', color: '#ef4444', fontWeight: 'bold', formatter: (p) => p.value > 0 ? p.value : '' } 
                }
            ]
        });
        window.addEventListener('resize', () => myChartBarras.resize());
    }
};