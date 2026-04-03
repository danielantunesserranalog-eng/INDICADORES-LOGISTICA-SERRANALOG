// Configuração do Supabase
const SUPABASE_URL = 'https://qnpwkvazkntbqjbwegcp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bjTFgpk-qAdpVuWzr4hbng_G8O9qlc8';

// Inicializando o cliente e deixando global
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);