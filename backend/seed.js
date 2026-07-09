require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initDb, getDb } = require('./db/database');

async function seed() {
  try {
    // Initialize database tables
    await initDb();
    console.log('✅ Tablas de base de datos creadas correctamente');

    const db = getDb();

    // Check if skyweb admin user already exists
    const existingSkyweb = await db.prepare('SELECT id FROM users WHERE username = ?').get('skyweb');

    if (existingSkyweb) {
      console.log('ℹ️  El usuario administrador "skyweb" ya existe (ID:', existingSkyweb.id, ')');
    } else {
      // Create skyweb admin user
      const passwordHash = bcrypt.hashSync('admin123', 10);
      const stmt = db.prepare(`
        INSERT INTO users (username, full_name, email, password_hash, role)
        VALUES (?, ?, ?, ?, ?)
      `);

      const result = await stmt.run('skyweb', 'Skyweb Admin', 'admin@skyweb.com', passwordHash, 'admin');
      console.log('✅ Usuario administrador "skyweb" creado exitosamente (ID:', result.lastInsertRowid, ')');
      console.log('   📧 Username: skyweb');
      console.log('   🔑 Password: admin123');
      console.log('   👤 Rol: admin');
    }

    // List of default advisors to create
    const defaultAdvisors = [
      { username: 'beatriz', fullName: 'Beatriz' },
      { username: 'mateo', fullName: 'Mateo' },
      { username: 'angelica', fullName: 'Angélica' },
      { username: 'yaily', fullName: 'Yaily' },
      { username: 'melanie', fullName: 'Melanie' },
      { username: 'hasbleidy', fullName: 'Hasbleidy' },
      { username: 'daniel', fullName: 'Daniel' }
    ];

    console.log('\n👥 Verificando usuarios asesores...');
    const insertUserStmt = db.prepare(`
      INSERT INTO users (username, full_name, email, password_hash, role)
      VALUES (?, ?, ?, ?, 'asesor')
    `);

    const genericPasswordHash = bcrypt.hashSync('prospector123', 10);

    for (const advisor of defaultAdvisors) {
      const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(advisor.username);
      if (existing) {
        console.log(`ℹ️  El asesor "${advisor.username}" ya existe (ID: ${existing.id})`);
      } else {
        const email = `${advisor.username}@leadprospector.com`;
        const result = await insertUserStmt.run(advisor.username, advisor.fullName, email, genericPasswordHash);
        console.log(`✅ Asesor "${advisor.username}" creado exitosamente (ID: ${result.lastInsertRowid})`);
      }
    }

    console.log('\n🎉 Seed completado exitosamente');
  } catch (error) {
    console.error('❌ Error en seed:', error.message);
    process.exit(1);
  }
}

seed();
