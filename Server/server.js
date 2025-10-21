// server.js
const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();

/* ---------- DB SETUP ---------- */
const dbPath = path.join(__dirname, 'tutorial.db');
console.log('🗂️  Database path:', path.resolve(dbPath));

// Open existing database
const db = new Database(dbPath, {
  verbose: (sql) => console.log('🔍 SQL:', sql),
  timeout: 10000,
  fileMustExist: true, // Database should already exist with your 45 users
});

/* ---------- CRITICAL WAL MODE SETUP ---------- */
// Configure for immediate writes to fix sync issues
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('busy_timeout = 10000');
db.pragma('wal_autocheckpoint = 1'); // Checkpoint after every transaction

console.log('📊 Journal mode:', db.pragma('journal_mode'));
console.log('📊 Synchronous mode:', db.pragma('synchronous'));

/* ---------- MIDDLEWARE ---------- */
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`, req.body ? JSON.stringify(req.body) : '');
  next();
});

/* ---------- VERIFY EXISTING DATABASE ---------- */
function verifyDatabase() {
  try {
    console.log('🔍 Verifying existing database...');
    
    // Check table structure
    const columns = db.prepare('PRAGMA table_info(users)').all();
    console.log('📋 Table columns:', columns.map(c => `${c.name} (${c.type})`));
    
    // Get current user count
    const { count } = db.prepare('SELECT COUNT(*) AS count FROM users').get();
    console.log('👥 Existing user count:', count);
    
    // Show sample of existing data (without passwords)
    const sampleUsers = db.prepare(`
      SELECT id, name, email
      FROM users 
      ORDER BY id DESC 
      LIMIT 3
    `).all();
    console.log('📋 Recent users:', sampleUsers);
    
    console.log('✅ Database verification complete');
    
  } catch (err) {
    console.error('❌ Database verification error:', err);
    process.exit(1);
  }
}

verifyDatabase();

/* ---------- PREPARED STATEMENTS ---------- */
const insertUserStmt = db.prepare(`
  INSERT INTO users (name, email, password)
  VALUES (?, ?, ?)
`);

const getUserByNameStmt = db.prepare(`SELECT * FROM users WHERE name = ?`);
const getUserByEmailStmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
const getAllUsersStmt = db.prepare(`
  SELECT id, name, email, phone
  FROM users
  ORDER BY id DESC
  LIMIT 100
`);
const getUserCountStmt = db.prepare(`SELECT COUNT(*) AS count FROM users`);

/* ---------- ROUTES ---------- */

// Health check
app.get('/api/health', (req, res) => {
  try {
    const { count } = getUserCountStmt.get();
    res.json({ 
      status: 'OK', 
      userCount: count,
      dbPath: path.resolve(dbPath),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Health check error:', err);
    res.status(500).json({ error: 'Database health check failed', details: err.message });
  }
});

// Get all users
app.get('/api/users', (req, res) => {
  try {
    console.log('📖 Fetching users...');
    const users = getAllUsersStmt.all();
    const { count } = getUserCountStmt.get();
    
    console.log(`📊 Retrieved ${users.length} users (total: ${count})`);
    
    res.json({
      users: users,
      total: count,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

// Save user - FOCUSED ON FIXING THE SYNC ISSUE
app.post('/api/save-user', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('💾 Starting user save process...');
    console.log('📥 Request data:', { name: req.body.name, email: req.body.email, hasPassword: !!req.body.password });
    
    const { name, email, password } = req.body;

    // Validation
    if (!name || !password) {
      console.log('❌ Validation failed: missing required fields');
      return res.status(400).json({ 
        error: 'Name and password are required'
      });
    }

    // Check for existing users
    console.log('🔍 Checking for existing users...');
    const existingUserByName = getUserByNameStmt.get(name);
    if (existingUserByName) {
      console.log('❌ User name already exists:', name);
      return res.status(409).json({ 
        error: 'User with this name already exists'
      });
    }

    if (email) {
      const existingUserByEmail = getUserByEmailStmt.get(email);
      if (existingUserByEmail) {
        console.log('❌ Email already exists:', email);
        return res.status(409).json({ 
          error: 'User with this email already exists'
        });
      }
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed successfully');

    // Insert user with AGGRESSIVE sync to ensure it shows up in GUI immediately
    console.log('💾 Inserting user into database...');
    
    const insertTransaction = db.transaction(() => {
      // Insert the user
      const info = insertUserStmt.run(name, email || null, hashedPassword);
      console.log('📊 Insert result:', { id: info.lastInsertRowid, changes: info.changes });
      
      // FORCE IMMEDIATE SYNC - this is the key fix!
      console.log('🔄 Forcing database sync...');
      db.pragma('wal_checkpoint(RESTART)');   // Restart WAL
      db.pragma('wal_checkpoint(TRUNCATE)');  // Force write everything
      console.log('✅ Database sync completed');
      
      return info;
    });

    const insertInfo = insertTransaction();
    console.log('✅ Transaction completed, user inserted with ID:', insertInfo.lastInsertRowid);

    // Verify the user exists by reading it back
    console.log('🔍 Verifying user was saved...');
    const savedUser = db.prepare(`
      SELECT id, name, email
      FROM users
      WHERE id = ?
    `).get(insertInfo.lastInsertRowid);

    if (!savedUser) {
      throw new Error('CRITICAL: User not found after insertion!');
    }

    console.log('✅ User verified in database:', savedUser);

    // Get final count
    const { count } = getUserCountStmt.get();
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  SAVE COMPLETE in ${duration}ms`);
    console.log('👤 New user saved:', savedUser);
    console.log('📊 Total users now:', count);
    console.log('🎯 User should now be visible in SQLite GUI!');

    return res.status(201).json({
      success: true,
      message: 'User saved and synced successfully',
      user: savedUser,
      totalUsers: count,
      insertId: insertInfo.lastInsertRowid
    });

  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('❌ SAVE FAILED:', err.message);
    console.error('❌ Stack trace:', err.stack);
    console.error(`❌ Failed after ${duration}ms`);
    
    return res.status(500).json({ 
      error: 'Save failed',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/* ---------- GRACEFUL SHUTDOWN ---------- */
function gracefulShutdown(signal) {
  console.log(`📡 Received ${signal}, shutting down gracefully...`);
  
  try {
    // Final aggressive sync before closing
    console.log('🔄 Final database sync...');
    db.pragma('wal_checkpoint(TRUNCATE)');
    
    console.log('🔒 Closing database connection...');
    db.close();
    console.log('✅ Database closed successfully');
    
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
  } finally {
    console.log('👋 Server shutdown complete');
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/* ---------- START SERVER ---------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('🚀 Server started successfully!');
  console.log(`🌐 Server running on http://localhost:${PORT}`);
  console.log(`👥 Check users: http://localhost:${PORT}/api/users`);
  console.log(`💊 Health check: http://localhost:${PORT}/api/health`);
  console.log('📝 Ready to save users to existing database!');
});