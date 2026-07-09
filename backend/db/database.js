const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DB_PATH = path.join(__dirname, '..', 'lead_prospector.db');

let dbWrapper = null;
let sqlJsDb = null;

/**
 * Wrapper class for sql.js (SQLite) presenting an async interface.
 */
class SQLiteDatabaseWrapper {
  constructor(db) {
    this._db = db;
    this._transactionDepth = 0;
  }

  _save() {
    try {
      const data = this._db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    } catch (err) {
      console.error('Error saving database:', err.message);
    }
  }

  async exec(sql) {
    this._db.run(sql);
    if (this._transactionDepth === 0) {
      this._save();
    }
  }

  prepare(sql) {
    const db = this._db;
    const wrapper = this;

    return {
      async get(...params) {
        let stmt;
        try {
          stmt = db.prepare(sql);
          if (params.length > 0) {
            stmt.bind(params);
          }
          if (stmt.step()) {
            const columns = stmt.getColumnNames();
            const values = stmt.get();
            const row = {};
            columns.forEach((col, i) => {
              row[col] = values[i];
            });
            return row;
          }
          return undefined;
        } finally {
          if (stmt) stmt.free();
        }
      },

      async all(...params) {
        let stmt;
        try {
          stmt = db.prepare(sql);
          if (params.length > 0) {
            stmt.bind(params);
          }
          const rows = [];
          const columns = stmt.getColumnNames();
          while (stmt.step()) {
            const values = stmt.get();
            const row = {};
            columns.forEach((col, i) => {
              row[col] = values[i];
            });
            rows.push(row);
          }
          return rows;
        } finally {
          if (stmt) stmt.free();
        }
      },

      async run(...params) {
        db.run(sql, params);
        if (wrapper._transactionDepth === 0) {
          wrapper._save();
        }

        const changesResult = db.exec('SELECT changes() as c, last_insert_rowid() as r');
        let changes = 0;
        let lastInsertRowid = 0;
        if (changesResult.length > 0 && changesResult[0].values.length > 0) {
          changes = changesResult[0].values[0][0];
          lastInsertRowid = changesResult[0].values[0][1];
        }

        return { changes, lastInsertRowid };
      }
    };
  }

  transaction(fn) {
    const wrapper = this;
    return async function (...args) {
      wrapper._transactionDepth++;
      wrapper._db.run('BEGIN TRANSACTION');
      try {
        const result = await fn(...args);
        wrapper._db.run('COMMIT');
        wrapper._transactionDepth--;
        if (wrapper._transactionDepth === 0) {
          wrapper._save();
        }
        return result;
      } catch (err) {
        console.error('SQLite transaction error:', err);
        try {
          wrapper._db.run('ROLLBACK');
        } catch (rollbackErr) {
          // ignore
        }
        wrapper._transactionDepth--;
        throw err;
      }
    };
  }

  pragma(pragmaStr) {
    try {
      this._db.run(`PRAGMA ${pragmaStr}`);
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Wrapper class for PostgreSQL presenting the same async interface.
 */
class PostgresDatabaseWrapper {
  constructor(connectionString) {
    this.pool = new Pool({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
    this.activeClient = null;
  }

  async exec(sql) {
    const client = this.activeClient || this.pool;
    await client.query(sql);
  }

  prepare(sql) {
    const self = this;
    
    // Convert SQLite "?" placeholders to PostgreSQL "$1, $2" placeholders
    let index = 1;
    const pgSql = sql.replace(/\?/g, () => `$${index++}`);

    return {
      async get(...params) {
        const client = self.activeClient || self.pool;
        const res = await client.query(pgSql, params);
        return res.rows[0];
      },

      async all(...params) {
        const client = self.activeClient || self.pool;
        const res = await client.query(pgSql, params);
        return res.rows;
      },

      async run(...params) {
        const client = self.activeClient || self.pool;
        let querySql = pgSql;

        // Auto-append RETURNING id for inserts if not present to get the row ID
        if (querySql.trim().toUpperCase().startsWith('INSERT') && !querySql.toUpperCase().includes('RETURNING')) {
          querySql += ' RETURNING id';
        }

        const res = await client.query(querySql, params);
        const lastInsertRowid = res.rows[0] ? res.rows[0].id : null;
        return {
          changes: res.rowCount,
          lastInsertRowid: lastInsertRowid
        };
      }
    };
  }

  transaction(fn) {
    const self = this;
    return async function (...args) {
      const client = await self.pool.connect();
      self.activeClient = client;
      try {
        await client.query('BEGIN');
        const result = await fn(...args);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        console.error('Postgres transaction error:', err);
        try {
          await client.query('ROLLBACK');
        } catch (rollbackErr) {
          // ignore
        }
        throw err;
      } finally {
        self.activeClient = null;
        client.release();
      }
    };
  }

  pragma(pragmaStr) {
    // Pragmas do not apply to Postgres, silently ignore
  }
}

/**
 * Returns the database wrapper instance.
 */
function getDb() {
  if (!dbWrapper) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbWrapper;
}

/**
 * Initializes the database. Connects to PostgreSQL if DATABASE_URL is set,
 * otherwise defaults to SQLite (sql.js).
 */
async function initDb() {
  if (dbWrapper) return dbWrapper;

  const isPostgres = !!process.env.DATABASE_URL;

  if (isPostgres) {
    console.log('🔌 Conectando a PostgreSQL (Neon/Supabase)...');
    dbWrapper = new PostgresDatabaseWrapper(process.env.DATABASE_URL);
  } else {
    console.log('💾 Conectando a SQLite local...');
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      sqlJsDb = new SQL.Database(fileBuffer);
    } else {
      sqlJsDb = new SQL.Database();
    }
    dbWrapper = new SQLiteDatabaseWrapper(sqlJsDb);
    dbWrapper.pragma('foreign_keys = ON');
  }

  // Create tables with engine-agnostic SQL replacements
  const createTable = async (sqliteSql) => {
    let sql = sqliteSql;
    if (isPostgres) {
      sql = sql
        .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
        .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        .replace(/DATETIME/gi, 'TIMESTAMP')
        .replace(/REAL/gi, 'DOUBLE PRECISION');
    }
    await dbWrapper.exec(sql);
  };

  await createTable(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'asesor' CHECK(role IN ('admin', 'asesor')),
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await createTable(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      business_name TEXT NOT NULL,
      city TEXT NOT NULL,
      niche TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      rating REAL,
      reviews_count INTEGER,
      google_maps_url TEXT,
      status TEXT DEFAULT 'nuevo' CHECK(status IN ('nuevo', 'contactado', 'convertido', 'descartado')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await createTable(`
    CREATE TABLE IF NOT EXISTS lead_enrichments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER UNIQUE NOT NULL,
      instagram TEXT,
      facebook TEXT,
      tiktok TEXT,
      linkedin TEXT,
      other_social TEXT,
      phone_confirm TEXT,
      business_needs TEXT,
      weaknesses TEXT,
      notes TEXT,
      enriched_by INTEGER,
      enriched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (enriched_by) REFERENCES users(id)
    );
  `);

  // Run migrations safely
  try {
    if (isPostgres) {
      await dbWrapper.exec('ALTER TABLE lead_enrichments ADD COLUMN phone_confirm VARCHAR(255)');
    } else {
      await dbWrapper.exec('ALTER TABLE lead_enrichments ADD COLUMN phone_confirm TEXT');
    }
  } catch (e) {
    // Column already exists, ignore
  }

  await createTable(`
    CREATE TABLE IF NOT EXISTS search_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      city TEXT NOT NULL,
      niche TEXT NOT NULL,
      results_count INTEGER DEFAULT 0,
      searched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Create indexes
  await dbWrapper.exec(`
    CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
    CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
    CREATE INDEX IF NOT EXISTS idx_leads_niche ON leads(niche);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
    CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_lead_enrichments_lead_id ON lead_enrichments(lead_id);
  `);

  return dbWrapper;
}

module.exports = { getDb, initDb };
