// ==========================================
// js/jornadas/jornadas_auditoria.js
// ==========================================

function criarModaisAuditoria() {
    if (document.getElementById('modalAuditoria')) return; 

    const modalHtml = `
    <div id="modalAuditoria" class="fixed inset-0 z-[100] hidden bg-slate-900/80 backdrop-blur-sm flex justify-center items-center">
        <div class="bg-slate-800 border border-slate-700 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] p-6 w-11/12 max-w-md transform transition-all">
            <div class="flex justify-between items-center mb-4 pb-3 border-b border-slate-700">
                <h3 class="text-lg font-bold text-sky-400 flex items-center gap-2"><i class="fas fa-edit"></i> Tratar Infração</h3>
                <button onclick="fecharModalAuditoria()" class="text-slate-400 hover:text-rose-500 transition-colors"><i class="fas fa-times text-xl"></i></button>
            </div>
            
            <div class="mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                <p class="text-sm text-slate-300">Motorista: <span id="auditMotoristaNome" class="font-bold text-sky-400"></span></p>
                <p class="text-xs text-slate-400 mt-1"><i class="far fa-clock mr-1"></i> Jornada: <span id="auditDataHora" class="text-slate-200 font-mono"></span></p>
            </div>

            <div class="mb-4">
                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Motivo / Observação</label>
                <textarea id="auditObservacao" rows="4" class="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all placeholder-slate-600" placeholder="Descreva o motivo da infração (ex: Pneu furado, trânsito, problema mecânico, etc)..."></textarea>
            </div>
            <div class="flex justify-end gap-3 mt-6">
                <button onclick="fecharModalAuditoria()" class="px-4 py-2 rounded-lg text-sm font-bold text-slate-300 border border-slate-600 hover:bg-slate-700 transition-colors">Cancelar</button>
                <button onclick="salvarAuditoria()" class="px-4 py-2 rounded-lg text-sm font-bold bg-sky-600 text-white hover:bg-sky-500 transition-colors flex items-center gap-2 shadow-lg" id="btnSalvarAuditoria"><i class="fas fa-save"></i> Salvar Tratativa</button>
            </div>
        </div>
    </div>

    <div id="modalVisAuditoria" class="fixed inset-0 z-[100] hidden bg-slate-900/80 backdrop-blur-sm flex justify-center items-center">
        <div class="bg-slate-800 border border-slate-700 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] p-6 w-11/12 max-w-md transform transition-all">
            <div class="flex justify-between items-center mb-4 pb-3 border-b border-slate-700">
                <h3 class="text-lg font-bold text-emerald-400 flex items-center gap-2"><i class="fas fa-check-circle"></i> Detalhes da Auditoria</h3>
                <button onclick="fecharModalVisAuditoria()" class="text-slate-400 hover:text-rose-500 transition-colors"><i class="fas fa-times text-xl"></i></button>
            </div>

            <div class="mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                <p class="text-sm text-slate-300">Motorista: <span id="visAuditMotoristaNome" class="font-bold text-emerald-400"></span></p>
                <p class="text-xs text-slate-400 mt-1"><i class="far fa-clock mr-1"></i> Jornada: <span id="visAuditDataHora" class="text-slate-200 font-mono"></span></p>
            </div>

            <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-2 shadow-inner">
                <p id="visAuditTexto" class="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed"></p>
            </div>
            <div class="flex justify-end mt-6">
                <button onclick="fecharModalVisAuditoria()" class="px-6 py-2 rounded-lg text-sm font-bold bg-slate-700 text-white hover:bg-slate-600 transition-colors shadow-lg">Fechar Aba</button>
            </div>
        </div>
    </div>

    <div id="modalRelatorioAuditoria" class="fixed inset-0 z-[100] hidden bg-slate-900/80 backdrop-blur-sm flex justify-center items-center">
        <div class="bg-slate-800 border border-slate-700 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] p-6 w-11/12 max-w-md transform transition-all">
            <div class="flex justify-between items-center mb-4 pb-3 border-b border-slate-700">
                <h3 class="text-lg font-bold text-indigo-400 flex items-center gap-2"><i class="fas fa-file-contract"></i> Relatório de Auditorias</h3>
                <button onclick="fecharModalRelatorioAuditoria()" class="text-slate-400 hover:text-rose-500 transition-colors"><i class="fas fa-times text-xl"></i></button>
            </div>
            
            <div class="mb-4">
                <p class="text-sm text-slate-300 mb-4">Selecione o período para gerar o relatório em PDF das infrações já tratadas e auditadas.</p>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Data Início</label>
                        <input type="date" id="relAuditDataInicio" class="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Data Fim</label>
                        <input type="date" id="relAuditDataFim" class="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500" />
                    </div>
                </div>
            </div>
            
            <div class="flex justify-end gap-3 mt-6">
                <button onclick="fecharModalRelatorioAuditoria()" class="px-4 py-2 rounded-lg text-sm font-bold text-slate-300 border border-slate-600 hover:bg-slate-700 transition-colors">Cancelar</button>
                <button onclick="gerarRelatorioAuditoria()" id="btnGerarPdfAuditoria" class="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-2 shadow-lg"><i class="fas fa-download"></i> Gerar PDF</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

let currentAuditId = null;

window.abrirModalAuditoria = function(id, motorista, dataHora) {
    currentAuditId = id;
    document.getElementById('auditMotoristaNome').textContent = motorista;
    document.getElementById('auditDataHora').textContent = dataHora; 
    document.getElementById('auditObservacao').value = '';
    document.getElementById('modalAuditoria').classList.remove('hidden');
}

window.fecharModalAuditoria = function() {
    currentAuditId = null;
    document.getElementById('modalAuditoria').classList.add('hidden');
}

window.salvarAuditoria = async function() {
    if (!currentAuditId) return;
    
    const obs = document.getElementById('auditObservacao').value.trim();
    if (!obs) {
        alert("Por favor, preencha a observação para salvar a tratativa.");
        return;
    }

    const btn = document.getElementById('btnSalvarAuditoria');
    const txtOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    btn.disabled = true;

    try {
        const { error } = await supabaseClient
            .from('historico_jornadas')
            .update({ auditado: true, observacao_auditoria: obs })
            .eq('id', currentAuditId);
        
        if (error) throw error;
        
        fecharModalAuditoria();
        carregarPainelJornadas(); 
    } catch (err) {
        console.error(err);
        alert("Erro ao registrar auditoria. Verifique a conexão com o banco.");
    } finally {
        btn.innerHTML = txtOriginal;
        btn.disabled = false;
    }
}

window.abrirModalVisAuditoria = function(obs, motorista, dataHora) {
    document.getElementById('visAuditMotoristaNome').textContent = motorista;
    document.getElementById('visAuditDataHora').textContent = dataHora; 
    document.getElementById('visAuditTexto').textContent = obs || "Nenhuma observação detalhada registrada.";
    document.getElementById('modalVisAuditoria').classList.remove('hidden');
}

window.fecharModalVisAuditoria = function() {
    document.getElementById('modalVisAuditoria').classList.add('hidden');
}

window.fecharModalRelatorioAuditoria = function() {
    document.getElementById('modalRelatorioAuditoria').classList.add('hidden');
}

// Função para gerar o relatório PDF filtrado pelo período de auditorias
window.gerarRelatorioAuditoria = function() {
    const dtIniStr = document.getElementById('relAuditDataInicio').value;
    const dtFimStr = document.getElementById('relAuditDataFim').value;
    
    if(!dtIniStr || !dtFimStr) {
        alert("Por favor, selecione as datas de início e fim.");
        return;
    }

    const [y1, m1, d1] = dtIniStr.split('-');
    const dtIni = new Date(y1, m1 - 1, d1, 0, 0, 0);

    const [y2, m2, d2] = dtFimStr.split('-');
    const dtFim = new Date(y2, m2 - 1, d2, 23, 59, 59);

    const auditadas = fullJornadasData.filter(d => {
        if (!d.auditado) return false;
        
        const m = d.inicio ? d.inicio.match(regexDate) : null;
        const dataInicio = m ? extrairDataParaFiltro(m[0]) : null;
        if(!dataInicio) return false;
        
        return dataInicio >= dtIni && dataInicio <= dtFim;
    });

    if(auditadas.length === 0) {
        alert("Nenhuma infração auditada encontrada nesse período.");
        return;
    }
    
    // Efeito de carregamento no botão
    const btnGerar = document.getElementById('btnGerarPdfAuditoria');
    const textOriginalBtn = btnGerar.innerHTML;
    btnGerar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
    btnGerar.disabled = true;

    auditadas.sort((a,b) => obterDataHoraParaOrdenacao(b.inicio) - obterDataHoraParaOrdenacao(a.inicio));

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');

    // ATUALIZADO: Coluna de Tempo Excedido adicionada
    const colunas = [
        "Motorista", "Data Jornada", "Hora Início", "Hora Fim", "T. Trabalho", "Tempo Excedido", "Observação (Auditoria)"
    ];
    
    const linhas = [];

    auditadas.forEach(d => {
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
        
        let obsTxt = d.observacao_auditoria || 'Sem observação';
        
        // Cálculo do tempo excedido (total de horas - 12)
        const totalHoras = d.total_trabalho_horas || 0;
        const excedido = Math.max(0, totalHoras - 12);

        linhas.push([
            d.motorista || '-',
            dI,
            hI,
            hF,
            formatarHorasMinutos(totalHoras),
            formatarHorasMinutos(excedido), // Exibe a nova coluna
            obsTxt
        ]);
    });

    doc.setFontSize(16);
    doc.text("Relatório de Infrações Auditadas", 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período Selecionado: ${d1}/${m1}/${y1} a ${d2}/${m2}/${y2}`, 14, 22);

    doc.autoTable({
        head: [colunas],
        body: linhas,
        startY: 28, 
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] }, 
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
            6: { cellWidth: 90 } // Ajuste na largura da coluna Observação
        }
    });

    // ATUALIZADO: Carregar e adicionar a Logo da Empresa
    const img = new Image();
    img.src = 'assets/logoverde.png';
    
    img.onload = () => {
        const pageWidth = doc.internal.pageSize.getWidth();
        // Imprime a imagem no X: lado direito da folha, Y: 10, Largura: 32, Altura: 12
        doc.addImage(img, 'PNG', pageWidth - 45, 10, 32, 12); 
        doc.save(`SerranaLog_Auditorias_${dtIniStr}_a_${dtFimStr}.pdf`);
        btnGerar.innerHTML = textOriginalBtn;
        btnGerar.disabled = false;
        fecharModalRelatorioAuditoria();
    };
    
    img.onerror = () => {
        // Se der falha ao carregar a logo, salva o PDF sem ela
        doc.save(`SerranaLog_Auditorias_${dtIniStr}_a_${dtFimStr}.pdf`);
        btnGerar.innerHTML = textOriginalBtn;
        btnGerar.disabled = false;
        fecharModalRelatorioAuditoria();
    };
}