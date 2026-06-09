import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://tinyuser:tinypassword@localhost:5432/tinyurl_db',
});

// Helper for querying
export const query = (text: string, params?: any[]) => pool.query(text, params);

// Auto-initialize tables
async function initializeDatabase() {
  try {
    const res = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'urls'
      );
    `);
    
    if (!res.rows[0].exists) {
      console.log('Database tables not found. Initializing schema...');
      const sqlPath = path.join(__dirname, '../../init.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await pool.query(sql);
      console.log('Database initialized successfully.');
    }
  } catch (err) {
    console.error('Failed to auto-initialize database tables:', err);
  }
}

initializeDatabase();

