// backend/cron/notificador.js
const cron = require('node-cron');
const supabase = require('../config/database');

// Cache em memória de notificações enviadas recentemente (limpa após 10 minutos)
const notificacoesEnviadasCache = new Set();

// Expressão CRON: '* * * * *' significa "Executar a cada minuto"
cron.schedule('* * * * *', async () => {
    try {
        const agora = new Date();
        const daquiA24Horas = new Date(agora.getTime() + (24 * 60 * 60 * 1000) + (10 * 60 * 1000));
        const limiteInferior = agora.toISOString();
        const limiteSuperior = daquiA24Horas.toISOString();

        // 1. Procurar agendamentos confirmados
        const { data: agendamentos, error } = await supabase
            .from('agendamentos')
            .select(`
                id,
                status,
                usuarios ( nome, email, telefone ),
                disponibilidades!inner ( data_hora, cursos ( nome ) )
            `)
            .eq('status', 'agendado')
            .gt('disponibilidades.data_hora', limiteInferior)
            .lt('disponibilidades.data_hora', limiteSuperior);

        if (error) throw error;
        if (!agendamentos || agendamentos.length === 0) return;

        // 2. Disparar os avisos com janela de tolerância de 5 minutos
        agendamentos.forEach(ag => {
            if (!ag.disponibilidades || !ag.disponibilidades.data_hora || !ag.usuarios) return;

            const dataCurso = new Date(ag.disponibilidades.data_hora);
            const diferencaEmMinutos = Math.floor((dataCurso - agora) / (1000 * 60));

            // Janela de tolerância para 24h (1435 a 1445 min) e 3h (175 a 185 min)
            const is24h = diferencaEmMinutos >= 1435 && diferencaEmMinutos <= 1445;
            const is3h = diferencaEmMinutos >= 175 && diferencaEmMinutos <= 185;

            if (is24h || is3h) {
                const tipoNotificacao = is24h ? '24h' : '3h';
                const cacheKey = `${ag.id}_${tipoNotificacao}`;

                if (notificacoesEnviadasCache.has(cacheKey)) return;
                notificacoesEnviadasCache.add(cacheKey);

                // Libera a chave da memória após 20 minutos
                setTimeout(() => notificacoesEnviadasCache.delete(cacheKey), 20 * 60 * 1000);

                const cursoNome = ag.disponibilidades.cursos ? ag.disponibilidades.cursos.nome : 'Curso';
                const cliente = ag.usuarios.nome || 'Cliente';
                const horaFormatada = dataCurso.toLocaleString('pt-BR', { timeStyle: 'short', dateStyle: 'short' });

                console.log(`\n📧 [EMAIL ENVIADO] Para: ${ag.usuarios.email}`);
                console.log(`Olá, ${cliente}! Lembramos que o seu agendamento para ${cursoNome} é em breve (${horaFormatada}).`);
                console.log(`Em caso de imprevistos, cancele na plataforma com 2 horas de antecedência.\n`);
            }
        });

    } catch (error) {
        console.error('❌ [CRON ERRO] Falha ao varrer notificações:', error.message);
    }
});

console.log('⏳ Motor de Notificações (CRON) ativado e a aguardar...');