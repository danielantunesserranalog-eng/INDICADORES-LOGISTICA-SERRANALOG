// ==========================================
// js/eventos.js - LÓGICA DA CENTRAL DE EVENTOS
// ==========================================

let fullEventosData = [];
let chartEventos = null;

document.addEventListener('DOMContentLoaded', () => {
    loadEventos();
    document.getElementById('searchEventos').addEventListener('input', renderEventosTable);
});

async function loadEventos() {
    try {
        const { data, error } = await supabaseClient
            .from('historico_eventos')
            .select('*')
            .order('data_evento', { ascending: false });

        if (error) throw error;
        if (data) {
            fullEventosData = data;
            calcularKpis();
            renderEventosTable();
            renderTopMotoristas();
        }
    } catch (e) { console.error("Erro ao carregar eventos:", e); }
}

function calcularKpis() {
    const criticos = fullEventosData.filter(d => d.criticidade?.toUpperCase().includes('ALTO') || d.criticidade?.toUpperCase().includes('GRAVE')).length;
    const maoFora = fullEventosData.filter(d => d.evento_nome?.toUpperCase().includes('MÃO FORA')).length;
    const celular = fullEventosData.filter(d => d.evento_nome?.toUpperCase().includes('CELULAR') || d.evento_nome?.toUpperCase().includes('TELEFONE')).length;
    
    const velocidades = fullEventosData.map(d => d.velocidade_final || 0).filter(v => v > 0);
    const mediaVel = velocidades.length > 0 ? (velocidades.reduce((a, b) => a + b, 0) / velocidades.length) : 0;

    document.getElementById('totalCriticos').innerText = criticos;
    document.getElementById('totalMaoVolante').innerText = maoFora;
    document.getElementById('totalCelular').innerText = celular;
    document.getElementById('velMediaFim').innerText = mediaVel.toFixed(1) + " km/h";

    renderPizza(criticos, fullEventosData.length - criticos);
}

function renderPizza(criticos, outros) {
    if (chartEventos) chartEventos.destroy();
    const ctx = document.getElementById('eventosPizzaChart').getContext('2d');
    chartEventos = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Críticos', 'Outros'],
            datasets: [{ data: [criticos, outros], backgroundColor: ['#f43f5e', '#3b82f6'], borderWidth: 0 }]
        },
        options: { responsive: true, cutout: '70%', plugins: { legend: { position: 'bottom' } } }
    });
}

function renderTopMotoristas() {
    const counts = {};
    fullEventosData.forEach(d => {
        if (d.motorista) counts[d.motorista] = (counts[d.motorista] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const container = document.getElementById('topMotoristasEventos');
    container.innerHTML = '';

    sorted.forEach(([nome, qtd], i) => {
        container.insertAdjacentHTML('beforeend', `
            <tr class="hover:bg-slate-800/50">
                <td class="px-6 py-3 font-bold text-slate-400">#${i+1}</td>
                <td class="px-6 py-3 text-white font-semibold">${nome}</td>
                <td class="px-6 py-3 text-right font-mono text-rose-400">${qtd} alertas</td>
            </tr>
        `);
    });
}

function renderEventosTable() {
    const termo = document.getElementById('searchEventos').value.toLowerCase();
    const tbody = document.getElementById('eventosTableBody');
    tbody.innerHTML = '';

    const filtrados = fullEventosData.filter(d => 
        (d.motorista || "").toLowerCase().includes(termo) || 
        (d.evento_nome || "").toLowerCase().includes(termo)
    );

    filtrados.slice(0, 100).forEach(d => {
        const isGrave = d.criticidade?.toUpperCase().includes('ALTO') || d.criticidade?.toUpperCase().includes('GRAVE');
        tbody.insertAdjacentHTML('beforeend', `
            <tr class="hover:bg-slate-800/30">
                <td class="px-6 py-3 text-slate-400">${d.data_evento || '-'}</td>
                <td class="px-6 py-3 font-bold text-sky-400">${d.motorista || '-'}</td>
                <td class="px-6 py-3 font-mono text-white">${d.placa || '-'}</td>
                <td class="px-6 py-3 text-slate-200">${d.evento_nome || '-'}</td>
                <td class="px-6 py-3 text-center">
                    <span class="px-2 py-1 rounded-full text-[9px] font-bold ${isGrave ? 'bg-rose-900/40 text-rose-400 border border-rose-800' : 'bg-slate-700 text-slate-300'}">
                        ${d.criticidade || 'Normal'}
                    </span>
                </td>
                <td class="px-6 py-3 text-right font-mono">${d.velocidade_final || 0}</td>
                <td class="px-6 py-3 text-slate-500 truncate max-w-[150px]" title="${d.localidade}">${d.localidade || '-'}</td>
            </tr>
        `);
    });
}