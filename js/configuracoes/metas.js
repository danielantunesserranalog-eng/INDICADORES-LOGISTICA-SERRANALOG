// ==========================================
// js/configuracoes/metas.js - METAS GLOBAIS
// ==========================================

async function carregarMetasGlobais() {
    try {
        const { data } = await supabaseClient.from('metas_globais').select('*').eq('id', 1).single();
        if (data) {
            const elVProg = document.getElementById('cfg_v_prog');
            const elVolProg = document.getElementById('cfg_vol_prog');
            const elCxProg = document.getElementById('cfg_cx_prog');
            const elPbtcProg = document.getElementById('cfg_pbtc');
            
            const elMetaCiclo = document.getElementById('cfg_meta_ciclo');
            const elMetaFilaCpo = document.getElementById('cfg_meta_fila_campo');
            const elMetaCarga = document.getElementById('cfg_meta_carga');
            const elMetaFilaFab = document.getElementById('cfg_meta_fila_fabrica');

            if (elVProg) elVProg.value = data.v_prog || '';
            if (elVolProg) elVolProg.value = data.vol_prog || '';
            if (elCxProg) elCxProg.value = data.cx_prog || '';
            if (elPbtcProg) elPbtcProg.value = data.pbtc_prog || '';
            
            if (elMetaCiclo) elMetaCiclo.value = decimalParaTime(data.meta_ciclo);
            if (elMetaFilaCpo) elMetaFilaCpo.value = decimalParaTime(data.meta_fila_campo);
            if (elMetaCarga) elMetaCarga.value = decimalParaTime(data.meta_carga);
            if (elMetaFilaFab) elMetaFilaFab.value = decimalParaTime(data.meta_fila_fabrica);
        }
    } catch(e) { console.error("Erro ao carregar metas globais", e); }
}

function initMetas() {
    const btnSalvarMetasGlobais = document.getElementById('btnSalvarMetasGlobais');
    if (btnSalvarMetasGlobais) {
        btnSalvarMetasGlobais.addEventListener('click', async () => {
            btnSalvarMetasGlobais.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            const payload = {
                id: 1,
                v_prog: parseFloat(document.getElementById('cfg_v_prog').value) || 0,
                vol_prog: parseFloat(document.getElementById('cfg_vol_prog').value) || 0,
                cx_prog: parseFloat(document.getElementById('cfg_cx_prog').value) || 0,
                pbtc_prog: parseFloat(document.getElementById('cfg_pbtc').value) || 0,
                meta_ciclo: timeParaDecimal(document.getElementById('cfg_meta_ciclo').value),
                meta_fila_campo: timeParaDecimal(document.getElementById('cfg_meta_fila_campo').value),
                meta_carga: timeParaDecimal(document.getElementById('cfg_meta_carga').value),
                meta_fila_fabrica: timeParaDecimal(document.getElementById('cfg_meta_fila_fabrica').value)
            };
            try {
                await supabaseClient.from('metas_globais').upsert(payload);
                btnSalvarMetasGlobais.innerHTML = '<i class="fas fa-check"></i> Salvo!';
            } catch(e) { btnSalvarMetasGlobais.innerHTML = 'Erro!'; }
            setTimeout(() => btnSalvarMetasGlobais.innerHTML = '<i class="fas fa-save"></i> Salvar Metas Base', 2000);
        });
    }
}