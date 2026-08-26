// tests/agendamento.test.js - Testes Unitários de Regras de Negócio de Agendamento e Feedback
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Função pura simulando a Regra das 2 Horas
function validarRegra2Horas(dataCursoStr, dataAtualStr) {
    const dataCurso = new Date(dataCursoStr);
    const agora = new Date(dataAtualStr);
    const diferencaEmHoras = (dataCurso - agora) / (1000 * 60 * 60);
    return diferencaEmHoras >= 2;
}

// Função pura simulando validação de nota de feedback
function validarNotaFeedback(nota) {
    if (typeof nota !== 'number') return false;
    return nota >= 1 && nota <= 5 && Number.isInteger(nota);
}

// Função pura simulando liberação segura de vagas
function decrementarVagas(vagasOcupadas) {
    return Math.max(0, (vagasOcupadas || 1) - 1);
}

describe('🎯 Suíte de Testes: Regras de Negócio de Agendamentos & Vagas', () => {

    describe('Regra das 2 Horas para Cancelamento pelo Voluntário', () => {
        it('Deve permitir cancelamento quando faltam mais de 2 horas (ex: 2h05min)', () => {
            const agora = '2026-08-26T10:00:00Z';
            const dataCurso = '2026-08-26T12:05:00Z'; // 2h 05min no futuro
            assert.equal(validarRegra2Horas(dataCurso, agora), true);
        });

        it('Deve permitir cancelamento quando faltam exatamente 2 horas', () => {
            const agora = '2026-08-26T10:00:00Z';
            const dataCurso = '2026-08-26T12:00:00Z'; // Exatas 2 horas
            assert.equal(validarRegra2Horas(dataCurso, agora), true);
        });

        it('Deve bloquear cancelamento quando faltam menos de 2 horas (ex: 1h55min)', () => {
            const agora = '2026-08-26T10:00:00Z';
            const dataCurso = '2026-08-26T11:55:00Z'; // 1h 55min
            assert.equal(validarRegra2Horas(dataCurso, agora), false);
        });

        it('Deve bloquear cancelamento quando o horário já passou', () => {
            const agora = '2026-08-26T10:00:00Z';
            const dataCurso = '2026-08-26T09:00:00Z'; // 1h atrás
            assert.equal(validarRegra2Horas(dataCurso, agora), false);
        });
    });

    describe('Validação de Notas de Feedback', () => {
        it('Deve aceitar notas válidas de 1 a 5', () => {
            [1, 2, 3, 4, 5].forEach(nota => {
                assert.equal(validarNotaFeedback(nota), true, `Nota ${nota} deveria ser válida`);
            });
        });

        it('Deve rejeitar notas abaixo de 1 (ex: 0, -1)', () => {
            assert.equal(validarNotaFeedback(0), false);
            assert.equal(validarNotaFeedback(-1), false);
        });

        it('Deve rejeitar notas acima de 5 (ex: 6, 10)', () => {
            assert.equal(validarNotaFeedback(6), false);
            assert.equal(validarNotaFeedback(10), false);
        });

        it('Deve rejeitar tipos inválidos ou notas decimais', () => {
            assert.equal(validarNotaFeedback('5'), false);
            assert.equal(validarNotaFeedback(4.5), false);
            assert.equal(validarNotaFeedback(null), false);
        });
    });

    describe('Liberação e Cálculo de Vagas Ocupadas', () => {
        it('Deve decrementar vagas ocupadas corretamente ao cancelar', () => {
            assert.equal(decrementarVagas(5), 4);
            assert.equal(decrementarVagas(1), 0);
        });

        it('Nunca deve retornar número negativo de vagas ocupadas', () => {
            assert.equal(decrementarVagas(0), 0);
            assert.equal(decrementarVagas(-2), 0);
        });
    });
});
