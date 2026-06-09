import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

async function initDb() {
  try {
    const sqlPath = path.join(__dirname, '../../init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Reading init.sql from:', sqlPath);
    await pool.query(sql);
    console.log('Database tables created successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await pool.end();
  }
}

initDb();
