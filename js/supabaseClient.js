// Configuração do Supabase (Viagens/Metas Globais)
const SUPABASE_URL = 'https://qnpwkvazkntbqjbwegcp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bjTFgpk-qAdpVuWzr4hbng_G8O9qlc8';

// Cliente principal (Viagens)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuração do Supabase (Manutenção) - NOVO BANCO
const SUPABASE_MANUT_URL = 'https://ihgiyxzxdldqmrkziijl.supabase.co';
const SUPABASE_MANUT_KEY = 'sb_publishable_JpMZhW5ZrFKBr7m9KXBkoQ_cpxy1k3x';

// Novo cliente para as manutenções
const supabaseManutencao = window.supabase.createClient(SUPABASE_MANUT_URL, SUPABASE_MANUT_KEY);