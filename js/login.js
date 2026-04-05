// ==========================================
// js/login.js - AUTENTICAÇÃO BANCO EXTERNO
// ==========================================

// Credenciais do Banco Central (Apenas para autenticação)
const EXT_SUPABASE_URL = 'https://ihgiyxzxdldqmrkziijl.supabase.co';
const EXT_SUPABASE_KEY = 'sb_publishable_JpMZhW5ZrFKBr7m9KXBkoQ_cpxy1k3x';

// Inicializa o cliente Supabase especificamente para o banco externo
const authClient = window.supabase.createClient(EXT_SUPABASE_URL, EXT_SUPABASE_KEY);

// Função para criptografar a senha em SHA-256 (Igual ao banco de dados)
async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameInput = document.getElementById('username').value.trim().toUpperCase();
    const passwordInput = document.getElementById('password').value;
    const btnLogin = document.getElementById('btnLogin');
    const errorMsg = document.getElementById('errorMsg');
    const errorText = document.getElementById('errorText');

    // Reset UI
    errorMsg.classList.add('hidden');
    const originalBtnHtml = btnLogin.innerHTML;
    btnLogin.innerHTML = '<i class="fas fa-circle-notch fa-spin text-xl"></i> <span>Autenticando...</span>';
    btnLogin.disabled = true;
    btnLogin.classList.add('opacity-70', 'cursor-not-allowed');

    try {
        // 1. Busca o usuário no banco de dados externo
        const { data: usuario, error } = await authClient
            .from('usuarios')
            .select('id, username, senha_hash, role, primeiro_acesso')
            .eq('username', usernameInput)
            .single(); // Espera apenas 1 resultado

        if (error || !usuario) {
            throw new Error("Usuário não encontrado.");
        }

        // 2. Transforma a senha digitada em Hash SHA-256
        const hashedInput = await hashPassword(passwordInput);

        // 3. Compara os Hashes
        if (hashedInput === usuario.senha_hash) {
            // Sucesso! Salva a sessão no LocalStorage
            const sessionData = {
                id: usuario.id,
                username: usuario.username,
                role: usuario.role,
                primeiro_acesso: usuario.primeiro_acesso,
                loginTime: new Date().getTime()
            };
            
            localStorage.setItem('serranalog_user', JSON.stringify(sessionData));
            
            // Efeito visual de sucesso antes de redirecionar
            btnLogin.classList.remove('from-sky-600', 'to-blue-600', 'hover:from-sky-500', 'hover:to-blue-500');
            btnLogin.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
            btnLogin.innerHTML = '<i class="fas fa-check-circle text-xl"></i> <span>Acesso Permitido</span>';
            
            // Redireciona para o dashboard principal
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);

        } else {
            throw new Error("Senha incorreta.");
        }

    } catch (err) {
        // Falha na autenticação
        console.error("Erro no login:", err);
        errorText.innerText = err.message === "Senha incorreta." || err.message === "Usuário não encontrado." 
            ? "Usuário ou senha incorretos." 
            : "Erro ao conectar com o banco de dados.";
        errorMsg.classList.remove('hidden');
        
        // Restaura botão
        btnLogin.innerHTML = originalBtnHtml;
        btnLogin.disabled = false;
        btnLogin.classList.remove('opacity-70', 'cursor-not-allowed');
    }
});