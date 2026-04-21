// ==========================================
// js/jornadas/jornadas_exportacao.js
// ==========================================

// ==========================================
// EXPORTAÇÃO PARA EXCEL
// ==========================================
document.getElementById('btnExportarJornada').addEventListener('click', () => {
    const filtroStatus = document.getElementById('exportStatusFilter').value;
    
    let dadosExportar = jornadasGlobalData.filter(d => {
        const isEstouro = (d.total_trabalho_horas || 0) > 12;
        if (filtroStatus === 'OK' && isEstouro) return false;
        if (filtroStatus === 'INFRACAO' && !isEstouro) return false;
        return true;
    });

    if (dadosExportar.length === 0) return alert("Nenhum dado para exportar com este filtro de status.");

    dadosExportar.sort((a, b) => obterDataHoraParaOrdenacao(b.inicio) - obterDataHoraParaOrdenacao(a.inicio));

    const ws = XLSX.utils.json_to_sheet(dadosExportar.map(d => {
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
            "Tempo Excedido": formatarHorasMinutos(Math.max(0, (d.total_trabalho_horas || 0) - 12)), // Adicionado no Excel
            "Status": d.total_trabalho_horas > 12 ? 'INFRAÇÃO' : 'OK',
            "Auditado": d.auditado ? 'Sim' : (d.total_trabalho_horas > 12 ? 'Pendente' : '-'),
            "Obs Auditoria": d.observacao_auditoria || '-'
        };
    }));
    const wb = XLSX.utils.book_new(); XLSX.book_append_sheet(wb, ws, "Jornadas");
    XLSX.writeFile(wb, `SerranaLog_Jornadas_${new Date().toISOString().slice(0,10)}.xlsx`);
});

// ==========================================
// EXPORTAÇÃO PARA PDF
// ==========================================
document.getElementById('btnExportarPDFJornada')?.addEventListener('click', () => {
    const filtroStatus = document.getElementById('exportStatusFilter').value;
    
    let dadosExportar = jornadasGlobalData.filter(d => {
        const isEstouro = (d.total_trabalho_horas || 0) > 12;
        if (filtroStatus === 'OK' && isEstouro) return false;
        if (filtroStatus === 'INFRACAO' && !isEstouro) return false;
        return true;
    });

    if (dadosExportar.length === 0) return alert("Nenhum dado para exportar com este filtro de status.");

    dadosExportar.sort((a, b) => obterDataHoraParaOrdenacao(b.inicio) - obterDataHoraParaOrdenacao(a.inicio));

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');

    // ATUALIZADO: Inclui coluna de T. Excedido
    const colunas = [
        "Motorista", "Placa", "Data/Hora Início", "Data/Hora Fim", 
        "H. Noturnas", "H. Extras", "T. Trabalho", "T. Excedido", "Status"
    ];
    
    const linhas = [];

    dadosExportar.forEach(d => {
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

        const isEstouro = (d.total_trabalho_horas || 0) > 12;
        const statusTexto = isEstouro ? 'INFRAÇÃO' : 'OK';
        
        const totalHoras = d.total_trabalho_horas || 0;
        const excedido = Math.max(0, totalHoras - 12);

        linhas.push([
            d.motorista || '-',
            d.placa || '-',
            `${dI} às ${hI}`,
            `${dF} às ${hF}`,
            formatarHorasMinutos(d.horas_noturnas || 0),
            formatarHorasMinutos(d.horas_extras || 0),
            formatarHorasMinutos(totalHoras),
            formatarHorasMinutos(excedido), // Exibe tempo excedido
            statusTexto
        ]);
    });

    let dataReferencia = document.getElementById('jorDataReferencia').textContent;
    let textoFiltro = "Todos os Status";
    if (filtroStatus === 'OK') textoFiltro = "Apenas registros OK (<= 12h)";
    if (filtroStatus === 'INFRACAO') textoFiltro = "Apenas Infrações (> 12h)";

    doc.setFontSize(16);
    doc.text("Relatório Analítico de Jornadas", 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${dataReferencia} | Exibindo: ${textoFiltro}`, 14, 22);

    doc.autoTable({
        head: [colunas],
        body: linhas,
        startY: 28, 
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] }, 
        styles: { fontSize: 8, cellPadding: 2 },
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 8) {
                if (data.cell.raw === 'INFRAÇÃO') {
                    data.cell.styles.textColor = [220, 38, 38]; 
                    data.cell.styles.fontStyle = 'bold';
                } else {
                    data.cell.styles.textColor = [16, 185, 129]; 
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    // ATUALIZADO: Adiciona a Logo também no relatório principal para manter o padrão
    const btnGerarGeral = document.getElementById('btnExportarPDFJornada');
    const textOriginalBtn = btnGerarGeral.innerHTML;
    btnGerarGeral.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Baixando...';
    btnGerarGeral.disabled = true;

    const img = new Image();
    img.src = 'assets/logoverde.png';
    
    img.onload = () => {
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.addImage(img, 'PNG', pageWidth - 45, 10, 32, 12);
        doc.save(`SerranaLog_Jornadas_${filtroStatus}_${new Date().toISOString().slice(0,10)}.pdf`);
        btnGerarGeral.innerHTML = textOriginalBtn;
        btnGerarGeral.disabled = false;
    };
    
    img.onerror = () => {
        doc.save(`SerranaLog_Jornadas_${filtroStatus}_${new Date().toISOString().slice(0,10)}.pdf`);
        btnGerarGeral.innerHTML = textOriginalBtn;
        btnGerarGeral.disabled = false;
    };
});