// ==========================================
// js/menu.js - MENU LATERAL DINÂMICO
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Procura a tag do menu na página
    const sidebar = document.getElementById('sidebar-container');
    if (!sidebar) return; // Se não achar, não faz nada

    // Descobre em qual página o usuário está agora
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html'; // Padrão index.html

    // ==========================================
    // AQUI VOCÊ EDITA SEUS MENUS NO FUTURO!
    // ==========================================
    const menuItems = [
        { href: 'index.html', icon: 'fas fa-chart-line', text: 'Visão Geral' },
        { href: 'operacional.html', icon: 'fas fa-bullseye', text: 'Metas Operacionais' },
        { href: 'jornadas.html', icon: 'fas fa-user-clock', text: 'Monitor de Jornadas' },
        { href: 'historico.html', icon: 'fas fa-truck', text: 'Histórico de Produção' },
        { href: 'historico-jornadas.html', icon: 'fas fa-history', text: 'Histórico de Jornadas' },
        { separator: true }, // Cria aquela linha divisória
        { href: 'configuracoes.html', icon: 'fas fa-cogs', text: 'Configurações' }
    ];

    // Constrói a lista de botões
    let navHtml = '<nav class="p-4 space-y-2 mt-4">';
    
    menuItems.forEach(item => {
        if (item.separator) {
            navHtml += '<div class="my-4 border-t border-slate-700/50 mx-4"></div>';
        } else {
            // Lógica de inteligência: se a página atual for igual ao link do botão, ele fica ativo (azul)
            const isActive = (page === item.href) 
                ? 'active text-sky-400 bg-slate-800/50' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50';
            
            navHtml += `
                <a href="${item.href}" class="menu-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${isActive}">
                    <i class="${item.icon} text-lg w-6"></i> ${item.text}
                </a>
            `;
        }
    });
    
    navHtml += '</nav>';

    // Injeta o HTML completo da barra lateral
    sidebar.innerHTML = `
        <div>
            <div class="p-6 border-b border-slate-700/50 flex flex-col items-center">
                <div class="bg-slate-900/50 p-3 rounded-2xl shadow-inner border border-slate-700/50 mb-4">
                    <img src="assets/logo.png" alt="Serrana Florestal" class="h-14 object-contain" onerror="this.style.display='none'; this.insertAdjacentHTML('afterend', '<i class=\\'fas fa-leaf text-4xl text-sky-400 px-2\\'></i>');">
                </div>
                <h2 class="text-xl font-black tracking-wider text-white text-center">Serrana Florestal</h2>
                <span class="text-[10px] uppercase font-bold text-sky-400 tracking-widest mt-1 bg-sky-900/30 px-3 py-1 rounded-full border border-sky-800">Torre de Controle</span>
            </div>
            ${navHtml}
        </div>
        <div class="p-4 border-t border-slate-700/50">
            <div class="text-center text-[10px] text-slate-500 font-mono">SerranaLog v4.0</div>
        </div>
    `;
});