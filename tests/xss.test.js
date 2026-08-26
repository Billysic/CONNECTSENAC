// tests/xss.test.js - Testes Unitários de Sanitização XSS
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

describe('🔒 Suíte de Testes: Sanitização contra Cross-Site Scripting (XSS)', () => {

    it('Deve escapar tags <script> com segurança', () => {
        const payload = '<script>alert("XSS")</script>';
        const esperado = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;;';
        const sanitizado = escapeHTML(payload);
        assert.equal(sanitizado.includes('<script>'), false);
        assert.equal(sanitizado.includes('</script>'), false);
    });

    it('Deve escapar atributos e handlers maliciosos como <img onerror=...>', () => {
        const payload = '<img src=x onerror="fetch(\'/api/admin\')">';
        const sanitizado = escapeHTML(payload);
        assert.equal(sanitizado.includes('<img'), false);
        assert.equal(sanitizado.includes('&lt;img'), true);
    });

    it('Deve tratar valores nulos ou indefinidos retornando string vazia', () => {
        assert.equal(escapeHTML(null), '');
        assert.equal(escapeHTML(undefined), '');
    });

    it('Deve preservar texto simples sem caracteres especiais', () => {
        const normalText = 'Limpeza de Pele Facial Profunda';
        assert.equal(escapeHTML(normalText), normalText);
    });
});
