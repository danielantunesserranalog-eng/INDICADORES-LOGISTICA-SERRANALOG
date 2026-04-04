// ==========================================
// js/configuracoes.js - IMPORTAÇÃO E METAS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    carregarMetasGlobais();
});

// LOGICA DE METAS
async function carregarMetasGlobais() {
    try {
        const { data } = await supabaseClient.from('metas_globais').select('*').eq('id', 1).single();
        if (data) {
            document.getElementById('cfg_v_prog').value = data.v_prog || '';
            document.getElementById('cfg_vol_prog').value = data.vol_prog || '';
            document.getElementById('cfg_cx_prog').value = data.cx_prog || '';
            document.getElementById('cfg_pbtc').value = data.pbtc_prog || '';
            localStorage.setItem('cfg_metas', JSON.stringify(data));
        }
    } catch(e) {}
}

document.getElementById('btnSalvarMetasGlobais').addEventListener('click', async () => {
    const btn = document.getElementById('btnSalvarMetasGlobais');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    const payload = {
        id: 1,
        v_prog: parseFloat(document.getElementById('cfg_v_prog').value) || 0,
        vol_prog: parseFloat(document.getElementById('cfg_vol_prog').value) || 0,
        cx_prog: parseFloat(document.getElementById('cfg_cx_prog').value) || 0,
        pbtc_prog: parseFloat(document.getElementById('cfg_pbtc').value) || 0
    };
    try {
        await supabaseClient.from('metas_globais').upsert(payload);
        localStorage.setItem('cfg_metas', JSON.stringify(payload));
        btn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
    } catch(e) { btn.innerHTML = 'Erro!'; }
    setTimeout(() => btn.innerHTML = '<i class="fas fa-save"></i> Salvar Metas Base', 2000);
});

// ZONA DE RISCO
document.getElementById('btnLimparBanco').addEventListener('click', async () => {
    if(confirm("ATENÇÃO: Deseja apagar todo o histórico do banco de dados na nuvem?")) {
        await supabaseClient.from('historico_viagens').delete().neq('movimento', 'null');
        await supabaseClient.from('historico_importacoes').delete().gt('id', 0);
        await supabaseClient.from('historico_jornadas').delete().gt('id', 0);
        alert("Histórico apagado com sucesso.");
    }
});

// IMPORTACAO DE JORNADAS
async function processAndSaveJornadasFile(file) {
    const errorMsgDiv = document.getElementById('errorMsgJornadas');
    const loadingSpinner = document.getElementById('loadingSpinnerJornadas');
    errorMsgDiv.classList.add('hidden'); loadingSpinner.classList.remove('hidden'); loadingSpinner.classList.add('flex');

    try {
        const text = await file.text();
        const workbook = XLSX.read(text, { type: 'string', FS: ';' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!rawData || rawData.length === 0) throw new Error("Planilha vazia ou delimitador incorreto.");

        const mappedData = rawData.map(row => {
            if (!row['Pessoa'] || row['Pessoa'].trim() === '-' || row['Pessoa'].trim() === '') return null;
            const strInicio = String(row['Início'] || '').trim();
            const strFim = String(row['Fim'] || '').trim();
            
            // CÁLCULO REAL 
            const horasCalculadas = calcularDiferencaHorasJornada(strInicio, strFim);
            const totalHoras = horasCalculadas > 0 ? horasCalculadas : parseTimeToHours(row['Total de Trabalho']);
            
            return {
                motorista: row['Pessoa'].trim(),
                cpf: row['CPF'] || '',
                placa: row['Placa'] || '',
                inicio: strInicio,
                fim: strFim,
                total_trabalho_horas: totalHoras,
                refeicao_horas: parseTimeToHours(row['Refeição']),
                repouso_horas: parseTimeToHours(row['Repouso']),
                direcao_horas: parseTimeToHours(row['Direção']),
                estourou_jornada: totalHoras > 12
            };
        }).filter(item => item !== null && item.motorista !== '');

        if(mappedData.length === 0) throw new Error("Nenhum dado válido encontrado.");

        const { error: insErr } = await supabaseClient.from('historico_jornadas').insert(mappedData);
        if (insErr) throw insErr;
        alert(`Sucesso! Foram importadas ${mappedData.length} jornadas.`);
        
    } catch (err) {
        errorMsgDiv.innerText = "Erro: " + err.message; errorMsgDiv.classList.remove('hidden');
    } finally {
        loadingSpinner.classList.add('hidden'); loadingSpinner.classList.remove('flex');
    }
}

// LISTENERS DROPZONE JORNADAS
const dropZoneJornadas = document.getElementById('dropZoneJornadas');
const fileInputJornadas = document.getElementById('fileInputJornadas');
if(dropZoneJornadas){
    dropZoneJornadas.addEventListener('dragover', e => { e.preventDefault(); dropZoneJornadas.classList.add('bg-amber-900/20'); });
    dropZoneJornadas.addEventListener('dragleave', () => dropZoneJornadas.classList.remove('bg-amber-900/20'));
    dropZoneJornadas.addEventListener('drop', e => {
        e.preventDefault(); dropZoneJornadas.classList.remove('bg-amber-900/20');
        if (e.dataTransfer.files.length > 0) processAndSaveJornadasFile(e.dataTransfer.files[0]);
    });
    document.getElementById('selectFileBtnJornadas').addEventListener('click', () => fileInputJornadas.click());
    fileInputJornadas.addEventListener('change', e => { if(e.target.files.length) processAndSaveJornadasFile(e.target.files[0]); });
}

// IMPORTACAO DE VIAGENS (Mantivemos a lógica que você já tinha, mas encapsulada aqui)
// Para o "processAndSaveFile", como ele usa a função gigante "parseSheetToData", você deve apenas mover a função "parseSheetToData(sheet)" e "processAndSaveFile(file)" do seu app.js antigo para cá. A mecânica do DropZone é idêntica ao código acima.