// Ajustado para apontar para database.js conforme seu gerenciador de arquivos
const supabase = require('../config/database'); 

// 1. Função minhasTurmas
exports.minhasTurmas = async (req, res) => {
    const profissional_id = req.usuario.id;

    try {
        const { data: cursos, error } = await supabase
            .from('cursos')
            .select(`
                id,
                nome,
                descricao,
                localizacao,
                foto_url,
                profissional_id,
                disponibilidades (
                    id,
                    data_hora,
                    vagas_totais,
                    vagas_ocupadas,
                    agendamentos (
                        id,
                        status,
                        usuarios ( id, nome, email, telefone )
                    )
                )
            `)
            .eq('profissional_id', profissional_id)
            .eq('status', 'ativo')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(cursos || []);
    } catch (error) {
        console.error('Erro ao buscar turmas:', error.message);
        res.status(500).json({ erro: 'Erro interno ao carregar turmas.' });
    }
};

// 2. Função concluirAgendamento
exports.concluirAgendamento = async (req, res) => {
    const { id } = req.params;
    const profesional_id = req.usuario.id;

    try {
        const { data: agendamento, error: erroBusca } = await supabase
            .from('agendamentos')
            .select('id, status, disponibilidades(cursos(profissional_id))')
            .eq('id', id)
            .single();

        if (erroBusca || !agendamento) {
            return res.status(404).json({ erro: 'Agendamento não encontrado.' });
        }

        if (agendamento.disponibilidades.cursos.profissional_id !== profesional_id) {
            return res.status(403).json({ erro: 'Não tem permissão para alterar a pauta de outro professor.' });
        }

        if (agendamento.status !== 'agendado') {
            return res.status(400).json({ erro: `Este agendamento não pode ser concluído pois já está: ${agendamento.status}` });
        }

        const { error: erroUpdate } = await supabase
            .from('agendamentos')
            .update({ status: 'concluido' })
            .eq('id', id);

        if (erroUpdate) throw erroUpdate;

        res.json({ mensagem: 'Atendimento concluído com sucesso! O modelo já pode avaliar o serviço.' });

    } catch (error) {
        console.error('Erro ao concluir agendamento:', error.message);
        res.status(500).json({ erro: 'Erro interno ao processar a pauta de presença.' });
    }
};