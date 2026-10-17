import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import express from 'express';
import { body, query, validationResult } from 'express-validator';

test('gift list and phone lookup use stored phones and preserve cultivator scope', async () => {
    const source = (await readFile(new URL('../routes/gifts.js', import.meta.url), 'utf8'))
        .replace(/^import .*;\r?$/gm, '')
        .replace('export default router;', 'return router;');
    const gift = { id: 3, phone: '07032241086', gift_name: 'Test Gift', value: '200.00' };
    const calls = [];
    let fail = false;
    const db = { query: async (sql, params) => {
        calls.push({ sql, params });
        assert.ok(!sql.includes('g.donor_id'));
        assert.ok(!sql.includes('INNER JOIN donors'));
        if (fail) throw new Error('Database unavailable');
        if (sql.includes('COUNT(*)')) return [[{ total: 1 }]];
        if (sql.includes('WHERE g.phone = ?') && params[0] !== gift.phone) return [[]];
        return [[gift]];
    } };
    const router = new Function('express', 'db', 'body', 'query', 'validationResult', source)(
        express, db, body, query, validationResult
    );
    const app = express();
    app.use((req, res, next) => {
        req.user = req.headers['x-cultivator'] ? { role_id: 3, cultivator_id: 9 } : { role_id: 1 };
        next();
    });
    app.use(router);
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        for (const scoped of [false, true]) {
            const headers = scoped ? { 'x-cultivator': 'yes' } : {};
            calls.length = 0;
            let response = await fetch(base + '/', { headers });
            assert.equal(response.status, 200);
            const data = await response.json();
            assert.deepEqual(data.data, [gift]);
            assert.equal(data.pagination.total, 1);
            for (const call of calls) {
                assert.equal(call.sql.includes('WHERE EXISTS'), scoped);
                assert.deepEqual(call.params, scoped ? [9] : []);
            }
            calls.length = 0;
            response = await fetch(base + '/by-phone?phone=' + gift.phone, { headers });
            assert.equal(response.status, 200);
            assert.deepEqual((await response.json()).data, [gift]);
            assert.equal(calls[0].sql.includes('AND EXISTS'), scoped);
            assert.deepEqual(calls[0].params, scoped ? [gift.phone, 9] : [gift.phone]);
        }
        let response = await fetch(base + '/by-phone?phone=0000000000');
        assert.equal(response.status, 404);
        response = await fetch(base + '/by-phone');
        assert.equal(response.status, 400);
        response = await fetch(base + '/?page=0');
        assert.equal(response.status, 400);
        fail = true;
        response = await fetch(base + '/');
        assert.equal(response.status, 500);
        assert.equal((await response.json()).message, 'Database unavailable');
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});
