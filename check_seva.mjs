import db from './db.js';
const [rows] = await db.query('SELECT id, name FROM cultivators WHERE name = ?', ['Seva Office']);
console.log('Seva Office rows:', JSON.stringify(rows));
if (rows.length === 0) {
  const [result] = await db.query("INSERT INTO cultivators (name) VALUES ('Seva Office')");
  console.log('Inserted Seva Office with id:', result.insertId);
} else {
  console.log('Already exists with id:', rows[0].id);
}
process.exit(0);
