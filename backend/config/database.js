// backend/config/database.js
require('dotenv').config();

// Garantir compatibilidade nativa de WebSocket para o Supabase Realtime em qualquer versão do Node
if (typeof globalThis.WebSocket === 'undefined') {
    try {
        globalThis.WebSocket = require('ws');
    } catch (e) {
        // ws fallback
    }
}

const { createClient } = require('@supabase/supabase-js');

// Buscando as variáveis de ambiente protegidas
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('\n❌ [ERRO DE CONFIGURAÇÃO DE AMBIENTE]:');
    console.error('As variáveis SUPABASE_URL e/ou SUPABASE_KEY não foram encontradas no process.env.');
    console.error('Se estiver rodando no RENDER, adicione essas chaves na aba "Environment" do seu serviço.');
    console.error('Se estiver rodando localmente, configure o seu arquivo .env na raiz do projeto.\n');
    process.exit(1);
}

// Criando a instância de conexão com o banco de dados
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Conectado ao Supabase (PostgreSQL) com sucesso!');

// Exportamos a instância para ser usada pelos Controllers
module.exports = supabase;