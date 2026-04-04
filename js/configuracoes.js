// ==========================================
// js/configuracoes.js - GESTÃO DE DADOS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    carregarMetasGlobais();
    carregarHistoricoImportacoes();
    initUploadListeners();
});

// ==========================================
// LÓGICA DE METAS GLOBAIS
// ==========================================
async function carregarMetasGlobais() {
    try {
        const { data } = await supabaseClient.from('metas_globais').select('*').eq('id', 1).single();
        if (data) {
            if(document.getElementById('cfg_v_prog')) document.getElementById('cfg_v_prog').value = data.v_prog || '';
            if(document.getElementById('cfg_vol_prog')) document.getElementById('cfg_vol_prog').value = data.vol_prog || '';
            if(document.getElementById('cfg_cx_prog')) document.getElementById('cfg_cx_prog').value = data.cx_prog || '';
            if(document.getElementById('cfg_pbtc')) document.getElementById('cfg_pbtc').value = data.pbtc_prog || '';
        }
    } catch(e) {
        console.error("Erro ao carregar metas:", e);
    }
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
        btn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
    } catch(e) { 
        btn.innerHTML = 'Erro!'; 
    }
    setTimeout(() => btn.innerHTML = '<i class="fas fa-save"></i> Salvar Metas Base', 2000);
});

// ==========================================
// HISTÓRICO DE IMPORTAÇÕES (TABELA VISUAL)
// ==========================================
async function carregarHistoricoImportacoes() {
    const tb = document.getElementById('importHistoryBody');
    if (!tb) return;
    try {
        const { data, error } = await supabaseClient
            .from('historico_importacoes')
            .select('*')
            .order('id', { ascending: false })
            .limit(10);

        if (error) throw error;

        tb.innerHTML = '';
        if (data && data.length > 0) {
            data.forEach(d => {
                tb.insertAdjacentHTML('beforeend', `
                    <tr class="hover:bg-slate-800/30 transition-colors">
                        <td class="px-6 py-3 font-mono text-slate-400">${d.dataLancamento}</td>
                        <td class="px-6 py-3 font-semibold text-slate-200">${d.dataBase}</td>
                        <td class="px-6 py-3 text-center font-bold text-emerald-400">+ ${d.qtdViagens}</td>
                    </tr>
                `);
            });
        } else {
            tb.innerHTML = '<tr><td colspan="3" class="text-center py-6 text-slate-500">Nenhuma importação registrada.</td></tr>';
        }
    } catch (e) {
        console.error("Erro ao carregar histórico:", e);
    }
}

// ==========================================
// IMPORTAÇÃO DE EVENTOS (TELEMETRIA)
// ==========================================
async function processAndSaveEventosFile(file) {
    const loader = document.getElementById('loadingSpinnerEventos');
    const errDiv = document.getElementById('errorMsgEventos');
    if(loader) loader.classList.remove('hidden');
    if(errDiv) errDiv.classList.add('hidden');

    try {
        const text = await file.text();
        const workbook = XLSX.read(text, { type: 'string', raw: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const mappedData = rawData.map(row => {
            return {
                data_evento: row['Data'] || row['data'] || '',
                placa: row['Identificador/Placa'] || row['Placa'] || '',
                motorista: row['Motorista'] || row['motorista'] || '',
                evento_nome: row['Nome'] || row['Evento'] || '',
                criticidade: row['Criticidade'] || row['criticidade'] || '',
                velocidade_final: parseFloat(String(row['Velocidade Final'] || 0).replace(',', '.')) || 0,
                localidade: row['Localidade'] || '',
                duracao: row['Duração'] || ''
            };
        }).filter(d => d.motorista !== "" && d.evento_nome !== "");

        if(mappedData.length === 0) throw new Error("O arquivo não contém dados válidos de eventos.");

        const { error } = await supabaseClient.from('historico_eventos').insert(mappedData);
        if (error) throw error;

        await supabaseClient.from('historico_importacoes').insert([{
            "dataBase": "Central de Eventos (Telemetria)",
            "qtdViagens": mappedData.length,
            "dataLancamento": new Date().toLocaleString('pt-PT')
        }]);

        alert(`Sucesso! ${mappedData.length} eventos importados.`);
        carregarHistoricoImportacoes();
    } catch (err) {
        if(errDiv) { errDiv.innerText = "Erro: " + err.message; errDiv.classList.remove('hidden'); }
        else { alert("Erro: " + err.message); }
    } finally {
        if(loader) loader.classList.add('hidden');
    }
}

// ==========================================
// IMPORTAÇÃO DE JORNADAS (PONTO CSV)
// ==========================================
async function processAndSaveJornadasFile(file) {
    const loader = document.getElementById('loadingSpinnerJornadas');
    const errDiv = document.getElementById('errorMsgJornadas');
    if(loader) loader.classList.remove('hidden');
    if(errDiv) errDiv.classList.add('hidden');

    try {
        const text = await file.text();
        const workbook = XLSX.read(text, { type: 'string', raw: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const safeParseTime = (val) => {
            if (!val || val === '-') return 0;
            if (typeof val === 'number') return val < 24 ? val * 24 : val;
            const str = String(val).trim();
            if (str.includes(':')) {
                const parts = str.split(':');
                return parseInt(parts[0] || 0) + (parseInt(parts[1] || 0) / 60);
            }
            return parseFloat(str.replace(',', '.')) || 0;
        };

        const regexDateCheck = /(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{1,2}-\d{1,2})/;

        const mappedData = rawData.map(row => {
            const getVal = (possibleNames) => {
                for (let k of Object.keys(row)) {
                    const normK = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                    if (possibleNames.includes(normK)) return row[k];
                }
                return null;
            };

            const motorista = getVal(['pessoa', 'motorista', 'nome']);
            if (!motorista) return null;
            
            const totalHoras = safeParseTime(getVal(['total de trabalho', 'total trabalho', 'tempo de trabalho']));
            const colDataExtra = getVal(['data', 'data da jornada', 'data inicial']);
            let strInicio = String(getVal(['início', 'inicio']) || '').trim();
            let strFim = String(getVal(['fim', 'final']) || '').trim();

            if (colDataExtra && !strInicio.match(regexDateCheck)) {
                strInicio = `${colDataExtra} ${strInicio}`;
                strFim = `${colDataExtra} ${strFim}`;
            }

            return {
                motorista: String(motorista).trim(),
                placa: getVal(['placa', 'veiculo']) || '',
                inicio: strInicio,
                fim: strFim,
                total_trabalho_horas: totalHoras,
                refeicao_horas: safeParseTime(getVal(['refeição', 'refeicao'])),
                repouso_horas: safeParseTime(getVal(['repouso'])),
                direcao_horas: safeParseTime(getVal(['direção', 'direcao'])),
                estourou_jornada: totalHoras > 12,
                horas_noturnas: safeParseTime(getVal(['noturnas', 'noturna'])),
                horas_extras: safeParseTime(getVal(['extra normal'])) + safeParseTime(getVal(['extra excedente']))
            };
        }).filter(item => item !== null && item.total_trabalho_horas >= 1);

        // Anti-Duplicação
        const { data: existing } = await supabaseClient.from('historico_jornadas').select('motorista, inicio');
        const keys = new Set(existing ? existing.map(j => `${j.motorista}|${j.inicio}`) : []);
        
        const novos = mappedData.filter(item => !keys.has(`${item.motorista}|${item.inicio}`));

        if (novos.length === 0) throw new Error("Todas as jornadas deste arquivo já foram importadas.");

        const { error } = await supabaseClient.from('historico_jornadas').insert(novos);
        if (error) throw error;

        await supabaseClient.from('historico_importacoes').insert([{
            "dataBase": "Jornadas de Trabalho",
            "qtdViagens": novos.length,
            "dataLancamento": new Date().toLocaleString('pt-PT')
        }]);

        alert(`Sucesso! ${novos.length} novas jornadas adicionadas.`);
        carregarHistoricoImportacoes();
    } catch (err) {
        if(errDiv) { errDiv.innerText = err.message; errDiv.classList.remove('hidden'); }
    } finally {
        if(loader) loader.classList.add('hidden');
    }
}

// ==========================================
// IMPORTAÇÃO DE VIAGENS (PRODUÇÃO EXCEL)
// ==========================================
async function processAndSaveFile(file) {
    const loader = document.getElementById('loadingSpinner');
    const errDiv = document.getElementById('errorMsg');
    if(loader) loader.classList.remove('hidden');
    if(errDiv) errDiv.classList.add('hidden');

    try {
        const dataBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(dataBuffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        // Função de mapeamento simplificada para o exemplo
        const mappedData = rawData.map(row => {
            return {
                movimento: String(row['Movimento'] || row['ID'] || Date.now()),
                transportadora: row['Transportadora'] || 'Outras',
                placa: row['Placa'] || '-',
                pesoLiquido: parseFloat(row['Peso Líquido']) || 0,
                volumeReal: parseFloat(row['Volume Real']) || 0,
                dataDaBaseExcel: row['Data Saída'] || row['Data'] || 'Desconhecida'
            };
        }).filter(d => d.pesoLiquido > 0);

        // Anti-Duplicação
        const { data: existing } = await supabaseClient.from('historico_viagens').select('movimento');
        const keys = new Set(existing ? existing.map(v => v.movimento) : []);
        const novos = mappedData.filter(v => !keys.has(v.movimento));

        if (novos.length === 0) throw new Error("Estas viagens já constam no banco de dados.");

        const { error } = await supabaseClient.from('historico_viagens').insert(novos);
        if (error) throw error;

        await supabaseClient.from('historico_importacoes').insert([{
            "dataBase": "Produção (Viagens)",
            "qtdViagens": novos.length,
            "dataLancamento": new Date().toLocaleString('pt-PT')
        }]);

        alert(`Sucesso! ${novos.length} novas viagens registradas.`);
        carregarHistoricoImportacoes();
    } catch (err) {
        if(errDiv) { errDiv.innerText = err.message; errDiv.classList.remove('hidden'); }
    } finally {
        if(loader) loader.classList.add('hidden');
    }
}

// ==========================================
// INICIALIZAÇÃO DE LISTENERS
// ==========================================
function initUploadListeners() {
    const configs = [
        { btn: 'selectFileBtn', input: 'fileInput', handler: processAndSaveFile },
        { btn: 'selectFileBtnJornadas', input: 'fileInputJornadas', handler: processAndSaveJornadasFile },
        { btn: 'selectFileBtnEventos', input: 'fileInputEventos', handler: processAndSaveEventosFile }
    ];

    configs.forEach(cfg => {
        const btn = document.getElementById(cfg.btn);
        const input = document.getElementById(cfg.input);
        if (btn && input) {
            btn.addEventListener('click', () => input.click());
            input.addEventListener('change', e => {
                if (e.target.files.length) cfg.handler(e.target.files[0]);
            });
        }
    });
}

// ==========================================
// ZONA DE RISCO
// ==========================================
document.getElementById('btnLimparBanco').addEventListener('click', async () => {
    const tipo = document.getElementById('tipoExclusao').value;
    if(!confirm(`ALERTA: Isso apagará permanentemente os dados de ${tipo.toUpperCase()}. Confirma?`)) return;

    try {
        if (tipo === 'tudo' || tipo === 'viagens') await supabaseClient.from('historico_viagens').delete().neq('movimento', 'null');
        if (tipo === 'tudo' || tipo === 'jornadas') await supabaseClient.from('historico_jornadas').delete().gt('total_trabalho_horas', 0);
        if (tipo === 'tudo' || tipo === 'eventos') await supabaseClient.from('historico_eventos').delete().filter('id', 'gt', 0);
        
        alert("Dados excluídos.");
        carregarHistoricoImportacoes();
    } catch (e) {
        alert("Erro ao limpar banco.");
    }
});