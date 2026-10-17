import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import express from 'express';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

const source = (await readFile(new URL('../routes/dashboard.js', import.meta.url), 'utf8'))
    .replace(/^import .*;\r?$/gm, '')
    .replace('export default router;', 'return router;');

test('dashboard exports include complete donor details in Excel and PDF', async () => {
    const address = 'Building 12 , Temple Road , Central PO , Hyderabad , District , Telangana , 500001 , India';
    const donor = {
        id: 42, name: 'Test Donor', phone: '07032241089', email: 'test@example.invalid',
        date_of_birth: '1990-10-20', anniversary_date: '2010-10-21',
        address_line1: 'Building 12', address_line2: 'Temple Road', post_office: 'Central PO',
        city: 'Hyderabad', district: 'District', state: 'Telangana', pin_code: '500001', country: 'India',
    };
    const family = [
        { id: 1, donor_id: 42, name: 'Family One', relation: 'wife', date_of_birth: '1991-10-22' },
        { id: 2, donor_id: 42, name: 'Family Two', relation: 'child', date_of_birth: '2015-11-02' },
    ];
    let missingDonor = false;
    let empty = false;
    const db = { query: async (sql) => {
        if (sql.includes('SELECT * FROM donors WHERE id IN')) return [missingDonor ? [] : [donor]];
        if (sql.includes('SELECT * FROM donor_family_members WHERE donor_id IN')) return [family];
        return [empty ? [] : [{
            donor_id: 42, person_type: 'family', donor_name: donor.name,
            person_name: 'Family One', relationship: 'wife', birthday: '1991-10-22',
        }]];
    } };
    let pdfText = [];
    class RecordingPDF extends PDFDocument {
        text(value, ...args) {
            pdfText.push(String(value));
            return super.text(value, ...args);
        }
    }
    const router = new Function('express', 'db', 'XLSX', 'PDFDocument', source)(express, db, XLSX, RecordingPDF);
    const app = express();
    app.use(router);
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        for (const type of ['birthdays', 'anniversaries']) {
            const excel = await fetch(`${base}/upcoming-${type}/export/xls`);
            assert.equal(excel.status, 200);
            const wb = XLSX.read(Buffer.from(await excel.arrayBuffer()), { type: 'buffer' });
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            assert.equal(rows.length, 1);
            assert.equal(rows[0]['Phone'], donor.phone);
            assert.equal(rows[0]['Email'], donor.email);
            assert.equal(rows[0]['Donor Date of Birth'], '20-10-1990');
            assert.equal(rows[0]['Anniversary Date'], '21-10-2010');
            assert.equal(rows[0]['Address'], address);
            assert.match(rows[0]['Family Members'], /Family One \| Relation: wife \| DOB: 22-10-1991/);
            assert.match(rows[0]['Family Members'], /Family Two \| Relation: child \| DOB: 02-11-2015/);
            if (type === 'birthdays') {
                assert.equal(rows[0]['Family Member'], 'Family One');
                assert.equal(rows[0]['Birthday'], '22-10-1991');
            }
            pdfText = [];
            const pdf = await fetch(`${base}/upcoming-${type}/export/pdf`);
            assert.equal(pdf.status, 200);
            const bytes = Buffer.from(await pdf.arrayBuffer());
            assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
            const text = pdfText.join('\n');
            for (const value of Object.values(rows[0]).slice(1)) assert.ok(text.includes(String(value)), String(value));
        }
        // Long multi-page details must be emitted without ellipsis or truncation.
        donor.address_line1 = 'Long address segment '.repeat(600);
        pdfText = [];
        const longPdf = await fetch(`${base}/upcoming-birthdays/export/pdf`);
        assert.equal(longPdf.status, 200);
        const longBytes = Buffer.from(await longPdf.arrayBuffer());
        assert.ok((longBytes.toString('latin1').match(/\/Type \/Page\b/g) || []).length > 1);
        assert.ok(pdfText.join('\n').includes(donor.address_line1));
        for (const key of ['address_line1', 'address_line2', 'post_office', 'city', 'district', 'state', 'pin_code', 'country']) delete donor[key];
        donor.address_house = 'Legacy House';
        donor.address_city = 'Legacy City';
        family.length = 0;
        let response = await fetch(`${base}/upcoming-anniversaries/export/xls`);
        let wb = XLSX.read(Buffer.from(await response.arrayBuffer()), { type: 'buffer' });
        let row = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])[0];
        assert.equal(row.Address, 'Legacy House , Legacy City , India');
        assert.equal(row['Family Members'], 'No family members added.');
        delete donor.address_house;
        delete donor.address_city;
        donor.address = 'Free-text address';
        response = await fetch(`${base}/upcoming-birthdays/export/xls`);
        wb = XLSX.read(Buffer.from(await response.arrayBuffer()), { type: 'buffer' });
        row = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])[0];
        assert.equal(row.Address, 'Free-text address');
        empty = true;
        response = await fetch(`${base}/upcoming-birthdays/export/pdf`);
        assert.equal(response.status, 200);
        await response.arrayBuffer();
        empty = false;
        missingDonor = true;
        response = await fetch(`${base}/upcoming-birthdays/export/xls`);
        assert.equal(response.status, 500);
        assert.equal((await response.json()).error, 'Export failed');
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});
