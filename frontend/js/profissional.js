// frontend/js/profissional.js

const FALLBACK_BASE_URL = 'http://localhost:3000/api';
const API_URL = window.location.protocol === 'file:' ? FALLBACK_BASE_URL : `${window.location.origin}/api`;
const token = localStorage.getItem('token');

// 1. Verificação de Autenticação e Guarda de Rota (RBAC Frontend)
if (!token) {
    window.location.href = 'index.html';
}

let payloadToken = null;
try {
    payloadToken = JSON.parse(atob(token.split('.')[1]));
    
    // Se não for profissional, redireciona para o painel correspondente
    if (payloadToken.perfil === 'admin' || payloadToken.perfil === 'coordenador') {
        window.location.href = 'admin.html';
    } else if (payloadToken.perfil !== 'profissional') {
        window.location.href = 'painel.html';
    }
} catch (e) {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

if (payloadToken) {
    document.getElementById('nomeProf').textContent = payloadToken.email.split('@')[0];
}

document.getElementById('btnSair').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});

// 2. Carregar Turmas e Agendamentos do Professor
async function carregarMinhasTurmas() {
    const accordion = document.getElementById('accordionTurmas');
    try {
        const response = await fetch(`${API_URL}/profissional/minhas-turmas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }

        const cursos = await response.json();
        accordion.innerHTML = '';

        if (!Array.isArray(cursos)) {
            throw new Error('Resposta inválida do servidor.');
        }

        if (cursos.length === 0) {
            accordion.innerHTML = '<div class="alert alert-info border-0 shadow-sm">Nenhum curso ativo vinculado ao seu perfil de momento.</div>';
            return;
        }

        cursos.forEach((curso, index) => {
            let horariosHTML = '';

            // Ordenar as disponibilidades por data
            if (Array.isArray(curso.disponibilidades)) {
                curso.disponibilidades.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

                curso.disponibilidades.forEach(disp => {
                    const dataFormatada = new Date(disp.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                    const agendamentos = Array.isArray(disp.agendamentos) ? disp.agendamentos : [];
                    const agendamentosAtivos = agendamentos.filter(a => a.status !== 'cancelado');

                    let tabelaModelos = '';
                    if (agendamentosAtivos.length === 0) {
                        tabelaModelos = `<p class="text-muted small mb-0 mt-2">Nenhum modelo agendado para este horário ainda.</p>`;
                    } else {
                        const linhas = agendamentosAtivos.map(ag => {
                            let acoesHTML = '';
                            if (ag.status === 'agendado') {
                                acoesHTML = `
                                    <div class="d-flex gap-1">
                                        <button class="btn btn-sm btn-outline-success fw-bold flex-fill" onclick="concluirServico('${ag.id}')" title="Confirmar Presença">✅ Presença</button>
                                        <button class="btn btn-sm btn-outline-danger fw-bold flex-fill" onclick="cancelarAluno('${ag.id}', '${ag.usuarios ? ag.usuarios.nome : 'Modelo'}')" title="Cancelar / Falta">❌ Falta</button>
                                    </div>
                                `;
                            } else {
                                const badgeClass = ag.status === 'concluido' ? 'bg-success' : 'bg-secondary';
                                acoesHTML = `<span class="badge w-100 py-2 ${badgeClass}">${ag.status.toUpperCase()}</span>`;
                            }

                            const telLimpo = ag.usuarios && ag.usuarios.telefone ? ag.usuarios.telefone.replace(/\D/g, '') : '';
                            const msgProf = encodeURIComponent(`Olá, ${ag.usuarios ? ag.usuarios.nome : 'Modelo'}! Aqui é o(a) Prof. ${payloadToken.email.split('@')[0]} do curso de ${curso.nome} do SENAC.`);
                            const linkZap = telLimpo
                                ? `<a href="https://wa.me/55${telLimpo}?text=${msgProf}" target="_blank" class="btn btn-sm btn-outline-success border-0">📱 Falar no WhatsApp</a>`
                                : `<span class="text-muted small">Sem telefone</span>`;

                            return `
                            <tr>
                                <td class="align-middle fw-semibold">${ag.usuarios ? ag.usuarios.nome : 'N/D'}</td>
                                <td class="align-middle">${ag.usuarios ? ag.usuarios.email : 'N/D'}</td>
                                <td class="align-middle">${linkZap}</td>                                    
                                <td class="align-middle" style="min-width: 180px;">${acoesHTML}</td>
                            </tr>
                            `;
                        }).join('');

                        tabelaModelos = `
                            <div class="table-responsive mt-3">
                                <table class="table table-sm table-hover border align-middle mb-0">
                                    <thead class="table-light"><tr><th>Modelo</th><th>Email</th><th>Contato</th><th>Ações / Status</th></tr></thead>
                                    <tbody>${linhas}</tbody>
                                </table>
                            </div>`;
                    }

                    horariosHTML += `
                        <div class="mb-4 p-3 bg-white border rounded shadow-sm">
                            <div class="fw-bold text-dark border-bottom pb-2 d-flex justify-content-between align-items-center">
                                <span>📅 Aula: ${dataFormatada}</span>
                                <span class="badge bg-secondary">Ocupação: ${disp.vagas_ocupadas} / ${disp.vagas_totais}</span>
                            </div>
                            ${tabelaModelos}
                        </div>
                    `;
                });
            }

            const itemOpen = index === 0 ? 'show' : '';
            const btnCollapsed = index === 0 ? '' : 'collapsed';

            accordion.innerHTML += `
                <div class="accordion-item border-0 border-bottom mb-2 rounded shadow-sm overflow-hidden">
                    <h2 class="accordion-header">
                        <button class="accordion-button ${btnCollapsed}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${curso.id}">
                            📘 <strong class="ms-2">${curso.nome}</strong>
                        </button>
                    </h2>
                    <div id="collapse${curso.id}" class="accordion-collapse collapse ${itemOpen}" data-bs-parent="#accordionTurmas">
                        <div class="accordion-body bg-light">
                            ${horariosHTML || '<p class="text-muted mb-0">Sem horários abertos para este curso.</p>'}
                        </div>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        accordion.innerHTML = '<div class="alert alert-danger">Erro ao carregar a pauta de presenças.</div>';
    }
}

// 3. Confirmar Presença (Concluir Serviço)
async function concluirServico(agendamentoId) {
    if (!confirm("O modelo compareceu e o serviço foi realizado com sucesso?")) return;

    try {
        const response = await fetch(`${API_URL}/profissional/agendamentos/${agendamentoId}/concluir`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            carregarMinhasTurmas();
        } else {
            const data = await response.json();
            alert(data.erro || 'Erro ao confirmar presença.');
        }
    } catch (error) {
        alert('Erro de conexão ao comunicar com o servidor.');
    }
}

// 4. Cancelar Aluno / Falta
async function cancelarAluno(agendamentoId, nome) {
    if (!confirm(`Deseja marcar falta / cancelar o agendamento de ${nome}? A vaga será reaberta.`)) return;

    try {
        const response = await fetch(`${API_URL}/profissional/agendamentos/${agendamentoId}/cancelar`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            carregarMinhasTurmas();
        } else {
            const data = await response.json();
            alert(data.erro || 'Erro ao cancelar inscrição.');
        }
    } catch (error) {
        alert('Erro de conexão ao comunicar com o servidor.');
    }
}

// Inicialização
carregarMinhasTurmas();
