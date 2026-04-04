// ==========================================
// FUNÇÕES AUXILIARES DE CÁLCULO DE TEMPO
// ==========================================

// Transforma "12:37" em minutos totais para facilitar cálculos de média e alertas
function tempoParaMinutos(strTempo) {
    if (!strTempo || typeof strTempo !== 'string') return 0;
    const partes = strTempo.split(':');
    if (partes.length < 2) return 0;
    const horas = parseInt(partes[0], 10) || 0;
    const minutos = parseInt(partes[1], 10) || 0;
    return (horas * 60) + minutos;
}

// Transforma minutos totais de volta para "HHh MMm"
function minutosParaFormatohhMM(minutosTotais) {
    if (!minutosTotais || minutosTotais === 0) return "0h 00m";
    const horas = Math.floor(minutosTotais / 60);
    const minutos = Math.round(minutosTotais % 60);
    return `${horas}h ${minutos.toString().padStart(2, '0')}m`;
}

// ==========================================
// LÓGICA DO PAINEL DE JORNADAS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Pega os elementos da aba de Configurações (onde você faz o Upload)
    const fileInputJornadas = document.getElementById('fileInputJornadas');
    const selectFileBtnJornadas = document.getElementById('selectFileBtnJornadas');
    const dropZoneJornadas = document.getElementById('dropZoneJornadas');
    const loadingSpinner = document.getElementById('loadingSpinnerJornadas');
    
    // Abre o explorador de arquivos ao clicar no botão "Buscar Arquivo"
    if(selectFileBtnJornadas && fileInputJornadas) {
        selectFileBtnJornadas.addEventListener('click', () => {
            fileInputJornadas.click();
        });
        
        // Também abre se clicar direto na área pontilhada (DropZone)
        dropZoneJornadas.addEventListener('click', (e) => {
            if(e.target !== selectFileBtnJornadas) fileInputJornadas.click();
        });
    }

    // Quando o usuário escolhe a planilha no computador
    if(fileInputJornadas) {
        fileInputJornadas.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Mostra o aviso de carregando
            if(loadingSpinner) loadingSpinner.classList.remove('hidden');
            if(loadingSpinner) loadingSpinner.classList.add('flex');

            processarArquivoJornadas(file);
        });
    }

    function processarArquivoJornadas(file) {
        const reader = new FileReader();
        reader.onload = (evento) => {
            const data = new Uint8Array(evento.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const nomePrimeiraAba = workbook.SheetNames[0];
            const aba = workbook.Sheets[nomePrimeiraAba];
            
            // Lê o Excel garantindo que as horas ("12:37") venham como texto
            let jsonData = XLSX.utils.sheet_to_json(aba, { defval: "", raw: false });
            
            // Filtra e processa os dados
            renderizarPainelJornadas(jsonData, file.name);
            
            // Esconde o aviso de carregando e limpa o input
            if(loadingSpinner) {
                loadingSpinner.classList.add('hidden');
                loadingSpinner.classList.remove('flex');
            }
            fileInputJornadas.value = '';
            
            // Alerta visual de sucesso
            alert("Jornadas importadas e renderizadas com sucesso! Verifique a aba 'Monitor de Jornadas'.");
        };
        reader.readAsArrayBuffer(file);
    }

    // Função que alimenta a sua tela `#viewJornadas`
    function renderizarPainelJornadas(dados, nomeDoArquivo) {
        if (!dados || dados.length === 0) return;

        let totalMotoristas = 0;
        let qtdEstouros = 0;
        let totalMinutosRefeicao = 0;
        let qtdRefeicao = 0;
        let totalMinutosRepouso = 0;
        let qtdRepouso = 0;
        let motoristasComTempo = [];

        // Pega a tabela principal analítica
        const tbodyAnalitica = document.getElementById('jorTabelaAnaliticaBody');
        if (tbodyAnalitica) tbodyAnalitica.innerHTML = '';

        dados.forEach(linha => {
            const motorista = linha['Motorista'] || linha['Pessoa'];
            const placa = linha['Placa'] || "-";
            const inicio = linha['Início'] || "-";
            const fim = linha['Fim'] || "-";
            
            const tTrabalho = linha['Total de Trabalho'] || "00:00";
            const direcao = linha['Direção'] || "00:00";
            const refeicao = linha['Refeição'] || "00:00";
            const repouso = linha['Repouso'] || "00:00";

            // Ignora a linha se for o cabeçalho perdido ou se o motorista não trabalhou nada
            if(!motorista || tTrabalho === "Total de Trabalho" || !linha['Total de Trabalho']) return;

            totalMotoristas++;

            // Cálculos
            const minutosTrabalho = tempoParaMinutos(tTrabalho);
            const isEstouro = minutosTrabalho > 720; // Maior que 12 horas
            
            if (isEstouro) qtdEstouros++;

            const minRef = tempoParaMinutos(refeicao);
            if (minRef > 0) { totalMinutosRefeicao += minRef; qtdRefeicao++; }

            const minRep = tempoParaMinutos(repouso);
            if (minRep > 0) { totalMinutosRepouso += minRep; qtdRepouso++; }

            // Salva para processar o TOP 5 depois
            motoristasComTempo.push({ motorista, minutos: minutosTrabalho, formatado: tTrabalho });

            // Renderiza as linhas na Tabela Analítica
            if (tbodyAnalitica) {
                // Cores seguindo o padrão Tailwind do seu layout
                const corTrabalho = isEstouro ? 'text-rose-500 font-bold' : 'text-emerald-400 font-semibold';
                const badgeStatus = isEstouro 
                    ? `<span class="border border-rose-500 text-rose-500 bg-rose-900/20 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider shadow-inner">ESTOURO</span>` 
                    : `<span class="border border-emerald-500 text-emerald-500 bg-emerald-900/20 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider shadow-inner">OK</span>`;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="px-4 py-3 text-sky-400 font-semibold whitespace-nowrap">${motorista}</td>
                    <td class="px-4 py-3 text-slate-400">${placa}</td>
                    <td class="px-4 py-3 text-slate-400 whitespace-nowrap">${inicio}</td>
                    <td class="px-4 py-3 text-slate-400 whitespace-nowrap">${fim}</td>
                    <td class="px-4 py-3 text-center ${corTrabalho}">${tTrabalho}</td>
                    <td class="px-4 py-3 text-center text-amber-500">${direcao}</td>
                    <td class="px-4 py-3 text-center">${badgeStatus}</td>
                `;
                tbodyAnalitica.appendChild(tr);
            }
        });

        // ==========================================
        // ATUALIZANDO OS CARDS SUPERIORES
        // ==========================================
        const elTotal = document.getElementById('jorTotalMotoristas');
        if(elTotal) elTotal.textContent = totalMotoristas;

        const elEstouro = document.getElementById('jorTaxaEstouro');
        const taxaEstouro = totalMotoristas > 0 ? ((qtdEstouros / totalMotoristas) * 100).toFixed(1) : 0;
        if(elEstouro) elEstouro.innerHTML = `${taxaEstouro}%`;

        const elRefeicao = document.getElementById('jorMediaRefeicao');
        const mediaRefeicao = qtdRefeicao > 0 ? (totalMinutosRefeicao / qtdRefeicao) : 0;
        if(elRefeicao) elRefeicao.textContent = minutosParaFormatohhMM(mediaRefeicao);

        const elRepouso = document.getElementById('jorMediaRepouso');
        const mediaRepouso = qtdRepouso > 0 ? (totalMinutosRepouso / qtdRepouso) : 0;
        if(elRepouso) elRepouso.textContent = minutosParaFormatohhMM(mediaRepouso);

        // Atualiza a legenda de "Base: ..."
        const dataBaseLabel = document.getElementById('jorDataReferencia');
        if(dataBaseLabel && nomeDoArquivo) dataBaseLabel.textContent = `Base: ${nomeDoArquivo}`;

        // Renderiza a lista do TOP 5
        renderizarTop5Jornadas(motoristasComTempo);
    }

    function renderizarTop5Jornadas(listaMotoristas) {
        const tbodyTop5 = document.getElementById('jorTopEstourosBody');
        if (!tbodyTop5) return;
        
        tbodyTop5.innerHTML = '';

        // Filtra os estouros (> 12h) e pega os 5 piores
        const top5 = listaMotoristas
            .filter(m => m.minutos > 720)
            .sort((a, b) => b.minutos - a.minutos)
            .slice(0, 5);

        if (top5.length === 0) {
            tbodyTop5.innerHTML = `<tr><td class="p-4 text-sm text-slate-400 text-center">Nenhum estouro registrado</td></tr>`;
            return;
        }

        top5.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-4 py-3 flex items-center gap-3">
                    <span class="text-rose-500 font-bold bg-rose-900/30 w-6 h-6 flex items-center justify-center rounded-full text-[10px] border border-rose-800/50">${index + 1}</span>
                    <span class="text-sm font-semibold text-slate-200 truncate w-32 md:w-48" title="${item.motorista}">${item.motorista}</span>
                </td>
                <td class="px-4 py-3 text-right text-rose-400 font-bold text-sm">${item.formatado}</td>
            `;
            tbodyTop5.appendChild(tr);
        });
    }
});