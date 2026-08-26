// backend/controllers/dashboardController.js
const supabase = require('../config/database');

exports.obterMetricas = async (req, res) => {
    try {
        // Execução de contagens agregadas em paralelo no banco de dados (zero overhead de memória)
        const [usuariosResult, cursosResult, agendadosResult, concluidosResult, canceladosResult] = await Promise.all([
            supabase.from('usuarios').select('*', { count: 'exact', head: true }),
            supabase.from('cursos').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
            supabase.from('agendamentos').select('*', { count: 'exact', head: true }).eq('status', 'agendado'),
            supabase.from('agendamentos').select('*', { count: 'exact', head: true }).eq('status', 'concluido'),
            supabase.from('agendamentos').select('*', { count: 'exact', head: true }).eq('status', 'cancelado')
        ]);

        if (usuariosResult.error) throw usuariosResult.error;
        if (cursosResult.error) throw cursosResult.error;
        if (agendadosResult.error) throw agendadosResult.error;
        if (concluidosResult.error) throw concluidosResult.error;
        if (canceladosResult.error) throw canceladosResult.error;

        const totalAgendados = agendadosResult.count || 0;
        const totalConcluidos = concluidosResult.count || 0;
        const totalCancelados = canceladosResult.count || 0;
        const totalGeral = totalAgendados + totalConcluidos + totalCancelados;

        const metricasAgendamentos = {
            total: totalGeral,
            agendados: totalAgendados,
            concluidos: totalConcluidos,
            cancelados: totalCancelados,
        };

        // Calculando a taxa de absenteísmo/cancelamento
        const taxaCancelamento = totalGeral > 0
            ? ((totalCancelados / totalGeral) * 100).toFixed(1)
            : 0;

        res.json({
            totalUsuarios: usuariosResult.count || 0,
            totalCursosAtivos: cursosResult.count || 0,
            agendamentos: metricasAgendamentos,
            taxaCancelamento: `${taxaCancelamento}%`
        });

    } catch (error) {
        console.error('Erro ao buscar métricas do dashboard:', error.message);
        res.status(500).json({ erro: 'Erro interno ao processar as métricas.' });
    }
};