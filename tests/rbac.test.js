// tests/rbac.test.js - Testes Unitários de Controle de Acesso Baseado em Perfis (RBAC)
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const rbac = require('../backend/middlewares/rbacMiddleware');

describe('🛡️ Suíte de Testes: Middleware RBAC e Permissões', () => {

    it('Deve permitir acesso quando o perfil do usuário está na lista de perfis autorizados', () => {
        let proximoChamado = false;
        const req = { usuario: { id: 'usr-1', perfil: 'admin' } };
        const res = {
            status: () => ({ json: () => {} })
        };
        const next = () => { proximoChamado = true; };

        const middleware = rbac(['admin', 'coordenador']);
        middleware(req, res, next);

        assert.equal(proximoChamado, true);
    });

    it('Deve bloquear com 403 Forbidden quando o perfil do usuário não tem permissão', () => {
        let statusCodigo = null;
        let respostaJson = null;
        let proximoChamado = false;

        const req = { usuario: { id: 'usr-2', perfil: 'candidato' } };
        const res = {
            status: (code) => {
                statusCodigo = code;
                return {
                    json: (data) => { respostaJson = data; }
                };
            }
        };
        const next = () => { proximoChamado = true; };

        const middleware = rbac(['admin', 'coordenador']);
        middleware(req, res, next);

        assert.equal(proximoChamado, false);
        assert.equal(statusCodigo, 403);
        assert.equal(respostaJson?.erro, 'Acesso restrito. O seu perfil não tem permissão para realizar esta ação.');
    });

    it('Deve bloquear com 401 Unauthorized se req.usuario não existir', () => {
        let statusCodigo = null;
        const req = {};
        const res = {
            status: (code) => {
                statusCodigo = code;
                return { json: () => {} };
            }
        };
        const next = () => {};

        const middleware = rbac(['admin']);
        middleware(req, res, next);

        assert.equal(statusCodigo, 401);
    });
});
