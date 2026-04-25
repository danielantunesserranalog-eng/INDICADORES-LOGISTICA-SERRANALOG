// ==========================================
// js/configuracoes/gruas.js - GESTÃO DE GRUAS
// ==========================================

let frentesData = {
    'SERRANA': { id: null, gruas: [] },
    'REFLORESTAR': { id: null, gruas: [] },
    'JSL': { id: null, gruas: [] }
};

async function carregarFrentesGruas() {
    frentesData = {
        'SERRANA': { id: null, gruas: [] },
        'REFLORESTAR': { id: null, gruas: [] },
        'JSL': { id: null, gruas: [] }
    };

    try {
        const { data, error } = await supabaseClient.from('config_gruas').select('*');
        let encontrouNoBanco = false;

        if (data && data.length > 0) {
            data.forEach(item => {
                const f = (item.frente || '').toUpperCase();
                let targetFrente = null;
                
                if (f.includes('SERRANA')) targetFrente = 'SERRANA';
                else if (f.includes('REFLORESTAR')) targetFrente = 'REFLORESTAR';
                else if (f.includes('JSL')) targetFrente = 'JSL';

                if (targetFrente) {
                    encontrouNoBanco = true;
                    frentesData[targetFrente].id = item.id;
                    const colGrua = item.codigos || ''; 
                    frentesData[targetFrente].gruas = colGrua.split(',').map(g => g.trim().toUpperCase()).filter(g => g);
                }
            });
        }

        if (!encontrouNoBanco) {
            frentesData['SERRANA'].gruas = ['GSR0001', 'GSR0002', 'GSR0003', 'GSR0007', 'GSR0008', 'GRB0015', 'GRB0022'];
            frentesData['REFLORESTAR'].gruas = ['GRB0017', 'GRB0020', 'GRB0029'];
            frentesData['JSL'].gruas = ['GSL0012', 'GSL0016'];
            try {
                await supabaseClient.from('config_gruas').insert([
                    { frente: 'SERRANA', codigos: frentesData['SERRANA'].gruas.join(', ') },
                    { frente: 'REFLORESTAR', codigos: frentesData['REFLORESTAR'].gruas.join(', ') },
                    { frente: 'JSL', codigos: frentesData['JSL'].gruas.join(', ') }
                ]);
                const { data: newData } = await supabaseClient.from('config_gruas').select('*');
                if (newData) {
                    newData.forEach(item => {
                        const f = (item.frente || '').toUpperCase();
                        if (f.includes('SERRANA')) frentesData['SERRANA'].id = item.id;
                        else if (f.includes('REFLORESTAR')) frentesData['REFLORESTAR'].id = item.id;
                        else if (f.includes('JSL')) frentesData['JSL'].id = item.id;
                    });
                }
            } catch(silentErr) {}
        }
        renderizarGruas();
    } catch (e) {
        frentesData['SERRANA'].gruas = ['GSR0001', 'GSR0002', 'GSR0003', 'GSR0007', 'GSR0008', 'GRB0015', 'GRB0022'];
        frentesData['REFLORESTAR'].gruas = ['GRB0017', 'GRB0020', 'GRB0029'];
        frentesData['JSL'].gruas = ['GSL0012', 'GSL0016'];
        renderizarGruas();
    }
}

function renderizarGruas() {
    const cores = {
        'SERRANA': 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50 hover:bg-emerald-800',
        'REFLORESTAR': 'bg-amber-900/40 text-amber-300 border-amber-700/50 hover:bg-amber-800',
        'JSL': 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50 hover:bg-indigo-800'
    };

    ['SERRANA', 'REFLORESTAR', 'JSL'].forEach(frente => {
        const container = document.getElementById(`lista_${frente.toLowerCase()}`);
        if (!container) return;
        container.innerHTML = '';
        if (frentesData[frente].gruas.length > 0) {
            frentesData[frente].gruas.forEach(grua => {
                const cor = cores[frente];
                container.insertAdjacentHTML('beforeend', `
                    <div class="inline-flex items-center gap-1.5 border px-2 py-1 rounded-md text-[11px] font-mono transition-all shadow-sm ${cor}">
                        <i class="fas fa-truck-loading text-[10px] opacity-70"></i> ${grua}
                        <button onclick="removerGrua('${frente}', '${grua}')" class="ml-1 opacity-50 hover:opacity-100 hover:text-white focus:outline-none transition-opacity" title="Remover">
                            <i class="fas fa-times-circle text-[12px]"></i>
                        </button>
                    </div>
                `);
            });
        } else {
            container.innerHTML = '<span class="text-[11px] text-slate-500 italic w-full text-center mt-4">Nenhuma grua vinculada.</span>';
        }
    });
}

window.adicionarGrua = async function(frente, inputId) {
    const inputEl = document.getElementById(inputId);
    const valor = inputEl.value.trim().toUpperCase();
    if (!valor) return;
    
    const novasGruas = valor.split(',').map(g => g.trim()).filter(g => g);
    let gruasAtuais = [...frentesData[frente].gruas];
    let adicionou = false;
    
    novasGruas.forEach(ng => {
        if (!gruasAtuais.includes(ng)) {
            gruasAtuais.push(ng);
            adicionou = true;
        }
    });
    
    if (adicionou) {
        inputEl.disabled = true;
        await salvarNoBanco(frente, gruasAtuais.join(', '));
        inputEl.value = '';
        inputEl.disabled = false;
        inputEl.focus();
    } else {
        inputEl.value = '';
    }
}

window.removerGrua = async function(frente, gruaParaRemover) {
    if (!confirm(`Deseja excluir a grua ${gruaParaRemover} da frente ${frente}?`)) return;
    let gruasAtuais = frentesData[frente].gruas.filter(g => g !== gruaParaRemover);
    await salvarNoBanco(frente, gruasAtuais.join(', '));
}

async function salvarNoBanco(frente, stringGruas) {
    const id = frentesData[frente].id;
    try {
        if (id) {
            await supabaseClient.from('config_gruas').update({ codigos: stringGruas }).eq('id', id);
        } else {
            const { data } = await supabaseClient.from('config_gruas').insert([{ frente: frente, codigos: stringGruas }]).select();
            if (data && data.length > 0) frentesData[frente].id = data[0].id;
        }
        await carregarFrentesGruas();
    } catch(e) {
        console.error("Erro no update:", e);
        alert('Erro ao sincronizar com o banco de dados!');
    }
}