const mysql = require('mysql');

const client = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '42Charts',
  multipleStatements: true,
});

module.exports = client;
