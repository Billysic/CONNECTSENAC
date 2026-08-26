// server.js
require('dotenv').config(); // Carrega as variáveis do arquivo .env
const express = require('express');
const cors = require('cors');
const db = require('./backend/config/database');
const usuarioRoutes = require('./backend/routes/usuarioRoutes');
const agendamentoRoutes = require('./backend/routes/agendamentoRoutes'); // Adicione esta linha
const path = require('path'); // Adicione esta linha para lidar com caminhos de pastas
const cursoRoutes = require('./backend/routes/cursoRoutes');
const disponibilidadeRoutes = require('./backend/routes/disponibilidadeRoutes');


const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

if (!process.env.JWT_SECRET) {
    console.error('\n❌ [ERRO DE CONFIGURAÇÃO DE AMBIENTE]:');
    console.error('A variável JWT_SECRET é obrigatória e não está definida no arquivo .env.');
    console.error('Configure JWT_SECRET para garantir a segurança dos tokens.\n');
    process.exit(1);
}

const app = express();

require('./backend/cron/notificador');

const PORT = process.env.PORT || 3000;

// Rate Limiter para rotas de autenticação (mitigação de força bruta)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 50, // limite de 50 requisições por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: 'Muitas tentativas a partir deste IP. Tente novamente em alguns minutos.' }
});

// Middlewares Globais de Segurança
app.use(helmet({ contentSecurityPolicy: false })); // Protege cabeçalhos HTTP permitindo CDN scripts
app.use(cors()); // Libera o acesso do Front-end
app.use(express.json()); // Ensina o Express a entender requisições no formato JSON

// Arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Rota de teste simples
app.get('/api/status', (req, res) => {
    res.json({ mensagem: "Servidor Connect Senac rodando com sucesso!", status: "OK" });
});

// Usando as rotas na API
app.use('/api/usuarios', authLimiter, usuarioRoutes);
app.use('/api/agendamentos', agendamentoRoutes); 
app.use('/api/cursos', cursoRoutes);
app.use('/api/disponibilidades', disponibilidadeRoutes);
app.use('/api/dashboard', require('./backend/routes/dashboardRoutes'));
app.use('/api/admin', require('./backend/routes/adminRoutes'));
app.use('/api/profissional', require('./backend/routes/profissionalRoutes'));
app.use('/api/feedbacks', require('./backend/routes/feedbackRoutes'));

// Tratamento de rota 404 para APIs não encontradas
app.use('/api', (req, res) => {
    res.status(404).json({ erro: 'Endpoint da API não encontrado.' });
});

// Middleware Global de Tratamento de Erros
app.use((err, req, res, next) => {
    console.error('❌ [ERRO NÃO TRATADO]:', err.stack || err.message);
    res.status(500).json({ erro: 'Ocorreu um erro interno no servidor.' });
});

// Iniciando o servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}!`);
    console.log(`Acesse: http://localhost:${PORT}`);
}); 