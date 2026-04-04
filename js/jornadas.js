// ==========================================
// FUNÇÕES AUXILIARES DE CÁLCULO E BUSCA
// ==========================================

function tempoParaMinutos(strTempo) {
    if (!strTempo || typeof strTempo !== 'string') return 0;
    const partes = strTempo.split(':');
    if (partes.length < 2) return 0;
    const horas = parseInt(partes[0], 10) || 0;
    const minutos = parseInt(partes[1], 10) || 0;
    return (horas * 60) + minutos;
}

function minutosParaFormatohhMM(minutosTotais) {
    if (!minutosTotais || minutosTotais === 0) return "0h 00m";
    const horas = Math.floor(minutosTotais / 60);
    const minutos = Math.round(minutosTotais % 60);
    return `${horas}h ${minutos.toString().padStart(2, '0')}m`;
}

// Procura a coluna no Excel ignorando espaços soltos e diferenças de maiúsculas/minúsculas
function pegarValorColuna(linha, nomesPossiveis) {
    const chavesExcel = Object.keys(linha);
    for (let nome of nomesPossiveis) {
        const chaveEncontrada = chavesExcel.find(k => k.trim().toLowerCase() === nome.toLowerCase());
        if (chaveEncontrada) return linha[chaveEncontrada];
    }
    return null;
}

// ==========================================
// LÓGICA PRINCIPAL DO PAINEL AVULSO
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const btnImportar = document.getElementById('btnImportar');
    const fileInput = document.getElementById('fileInput');
    const textoBotaoImportar = document.getElementById('textoBotaoImportar');
    const btnLimparHistorico = document.getElementById('btnLimparHistorico');
    const textoBase = document.getElementById('textoBase');

    // NOME DO BANCO DE DADOS LOCAL
    const DB_KEY = 'banco_jornadas_serranalog';

    // 1. CARREGAMENTO INICIAL DO BANCO DE DADOS
    carregarDoBanco();

    // 2. AÇÃO: CLICAR NO BOTÃO DE IMPORTAR
    if (btnImportar && fileInput) {
        btnImportar.addEventListener('click', () => {
            fileInput.click();
        });
    }

    // 3. AÇÃO: QUANDO O ARQUIVO É SELECIONADO
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            textoBotaoImportar.innerHTML = `<span class="animate-pulse">Processando...</span>`;
            
            const reader = new FileReader();
            reader.onload = (evento) => {
                try {
                    const data = new Uint8Array(evento.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const nomePrimeiraAba = workbook.SheetNames[0];
                    const aba = workbook.Sheets[nomePrimeiraAba];
                    
                    // Converte a aba em JSON
                    let jsonData = XLSX.utils.sheet_to_json(aba, { defval: "", raw: false });
                    
                    // Filtra apenas as linhas válidas (que têm o nome do motorista)
                    let viagensValidas = jsonData.filter(linha => {
                        let mot = pegarValorColuna(linha, ['Pessoa', 'Motorista', 'Nome']);
                        return mot && mot.trim() !== "" && mot !== "Pessoa";
                    });

                    // Salva no LocalStorage (Banco do Navegador)
                    localStorage.setItem(DB_KEY, JSON.stringify(viagensValidas));
                    
                    // Renderiza a tela
                    renderizarDashboard(viagensValidas);
                    textoBase.textContent = `Base: ${file.name}`;
                    
                } catch (erro) {
                    console.error("Erro ao processar arquivo:", erro);
                    alert("Erro ao ler a planilha. Verifique se o formato está correto.");
                    textoBotaoImportar.textContent = "Importar Jornadas";
                }
                fileInput.value = ""; // Limpa a memória
            };
            reader.readAsArrayBuffer(file);
        });
    }

    // 4. AÇÃO: LIMPAR BANCO DE DADOS
    if (btnLimparHistorico) {
        btnLimparHistorico.addEventListener('click', () => {
            const confirmar = confirm("Tem certeza que deseja apagar todo o histórico de jornadas do sistema?");
            if (confirmar) {
                localStorage.removeItem(DB_KEY);
                location.reload(); // Recarrega a página para zerar a interface
            }
        });
    }

    // --------------------------------------------------------
    // FUNÇÃO QUE PUXA DO BANCO QUANDO A PÁGINA ABRE
    function carregarDoBanco() {
        const dadosSalvos = localStorage.getItem(DB_KEY);
        if (dadosSalvos) {
            const viagens = JSON.parse(dadosSalvos);
            renderizarDashboard(viagens);
            textoBase.textContent = "Base: Banco de Dados Local";
        }
    }

    // --------------------------------------------------------
    // FUNÇÃO MASTER QUE DESENHA OS GRÁFICOS E TABELAS
    function renderizarDashboard(dados) {
        if (!dados || dados.length === 0) return;

        // Exibe o botão de limpar histórico se houver dados
        if (btnLimparHistorico) btnLimparHistorico.classList.remove('hidden');

        // Atualiza o contador de jornadas registradas no botão lá em cima
        if (textoBotaoImportar) {
            textoBotaoImportar.textContent = `${dados.length} Viagens Reg.`;
        }

        let totalMotoristas = 0;
        let qtdEstouros = 0;
        let totalMinutosRefeicao = 0;
        let qtdRefeicao = 0;
        let totalMinutosRepouso = 0;
        let qtdRepouso = 0;
        
        let motoristasComTempo = [];

        const tbody = document.getElementById('tabelaViagens');
        if (tbody) tbody.innerHTML = ''; 

        dados.forEach(linha => {
            const motorista = pegarValorColuna(linha, ['Pessoa', 'Motorista', 'Nome']);
            const placa = pegarValorColuna(linha, ['Placa', 'Veículo']) || "-";
            const inicio = pegarValorColuna(linha, ['Início', 'Inicio', 'Data Início']) || "-";
            const fim = pegarValorColuna(linha, ['Fim', 'Data Fim']) || "-";
            
            const tTrabalho = pegarValorColuna(linha, ['Total de Trabalho', 'Tempo Trabalho', 'Total']) || "00:00";
            const direcao = pegarValorColuna(linha, ['Direção', 'Direcao']) || "00:00";
            const refeicao = pegarValorColuna(linha, ['Refeição', 'Refeicao']) || "00:00";
            const repouso = pegarValorColuna(linha, ['Repouso']) || "00:00";

            totalMotoristas++;

            const minutosTrabalho = tempoParaMinutos(tTrabalho);
            const isEstouro = minutosTrabalho > 720; // Passou de 12 horas
            
            if (isEstouro) qtdEstouros++;

            const minRef = tempoParaMinutos(refeicao);
            if (minRef > 0) {
                totalMinutosRefeicao += minRef;
                qtdRefeicao++;
            }

            const minRep = tempoParaMinutos(repouso);
            if (minRep > 0) {
                totalMinutosRepouso += minRep;
                qtdRepouso++;
            }

            motoristasComTempo.push({ motorista, minutos: minutosTrabalho, formatado: tTrabalho });

            // Cria e injeta a linha na tabela HTML
            if (tbody) {
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
                    <td class="px-4 py-3 text-center ${corTrabalho}">${tTrabalho}</td>
                    <td class="px-4 py-3 text-center text-amber-500">${direcao}</td>
                    <td class="px-4 py-3 text-center">${badgeStatus}</td>
                `;
                tbody.appendChild(tr);
            }
        });

        // Atualiza as métricas nos Cards
        const elMotoristas = document.getElementById('cardMotoristas');
        if (elMotoristas) elMotoristas.textContent = totalMotoristas;

        const elEstouro = document.getElementById('cardEstouro');
        const taxaEstouro = totalMotoristas > 0 ? ((qtdEstouros / totalMotoristas) * 100).toFixed(1) : 0;
        if (elEstouro) elEstouro.innerHTML = `${taxaEstouro}% <span class="text-red-500 text-sm">⚠️</span>`;

        const elRefeicao = document.getElementById('cardRefeicao');
        const mediaRefeicao = qtdRefeicao > 0 ? (totalMinutosRefeicao / qtdRefeicao) : 0;
        if (elRefeicao) elRefeicao.textContent = minutosParaFormatohhMM(mediaRefeicao);

        const elRepouso = document.getElementById('cardRepouso');
        const mediaRepouso = qtdRepouso > 0 ? (totalMinutosRepouso / qtdRepouso) : 0;
        if (elRepouso) elRepouso.textContent = minutosParaFormatohhMM(mediaRepouso);

        // Atualiza a tabela do TOP 5
        renderizarTop5(motoristasComTempo);
    }

    // --------------------------------------------------------
    // FUNÇÃO DO TOP 5
    function renderizarTop5(listaMotoristas) {
        const ul = document.getElementById('listaTop5');
        if (!ul) return;
        
        ul.innerHTML = '';

        const top5 = listaMotoristas
            .filter(m => m.minutos > 720)
            .sort((a, b) => b.minutos - a.minutos)
            .slice(0, 5);

        if (top5.length === 0) {
            ul.innerHTML = `<li class="p-4 text-sm text-gray-400 text-center">Nenhum estouro registrado na base.</li>`;
            return;
        }

        top5.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = "p-3 flex justify-between items-center hover:bg-slate-800/50 transition-colors";
            li.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-red-500 font-bold bg-red-900/30 w-6 h-6 flex items-center justify-center rounded-full text-xs shadow-inner border border-red-800/50">${index + 1}</span>
                    <span class="text-sm font-semibold text-gray-200 truncate w-32 md:w-48" title="${item.motorista}">${item.motorista}</span>
                </div>
                <span class="text-red-400 font-bold text-sm bg-red-900/20 px-2 py-1 rounded">${item.formatado}</span>
            `;
            ul.appendChild(li);
        });
    }
});