const express = require('express');
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 3001;
const INITIAL_IDEAS = [
  { id: '1', name: 'Fit Assistant & Size Recommendation AI', feas: 4, impact: 5 },
  { id: '2', name: 'Express 1-Click Buy & Instant Escrow Checkout', feas: 5, impact: 5 },
  { id: '3', name: 'Consolidated Shipping & Flat Rate Ongkir', feas: 4, impact: 5 },
  { id: '4', name: 'Real-Time Inventory & Size Sync System', feas: 4, impact: 4 },
  { id: '5', name: 'Sistem Pre-order Berbasis Kuota', feas: 3, impact: 4 },
  { id: '6', name: '24/7 Contextual Chatbot CS', feas: 4, impact: 4 },
  { id: '7', name: 'Virtual Try-On 3D Augmented Reality', feas: 2, impact: 5 },
  { id: '8', name: 'Video Review Reels', feas: 3, impact: 4 },
  { id: '9', name: 'Gamified Cashback & Reviewer Poin', feas: 4, impact: 3 },
  { id: '10', name: 'Smart Price Negotiation Bot', feas: 3, impact: 2 }
];

const dataDirectory = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDirectory, { recursive: true });

const database = new Database(path.join(dataDirectory, 'ide-priority.sqlite'));
database.pragma('journal_mode = WAL');
database.exec(`
  CREATE TABLE IF NOT EXISTS ideas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    feas INTEGER NOT NULL CHECK (feas BETWEEN 1 AND 5),
    impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5)
  );
  CREATE TABLE IF NOT EXISTS app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

const selectIdeas = database.prepare(
  'SELECT id, name, feas, impact FROM ideas ORDER BY rowid'
);
const insertIdea = database.prepare(
  'INSERT INTO ideas (id, name, feas, impact) VALUES (@id, @name, @feas, @impact)'
);
const initialized = database.prepare(
  "SELECT value FROM app_metadata WHERE key = 'initialized'"
);
const markInitialized = database.prepare(
  "INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('initialized', 'true')"
);

function validateIdea(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    const error = new Error('Format data ide tidak valid.');
    error.status = 400;
    throw error;
  }

  const idea = {
    id: value.id == null ? '' : String(value.id).trim(),
    name: typeof value.name === 'string' ? value.name.trim() : '',
    feas: value.feas,
    impact: value.impact
  };
  if (!idea.id || !idea.name || !Number.isInteger(idea.feas) ||
      idea.feas < 1 || idea.feas > 5 || !Number.isInteger(idea.impact) ||
      idea.impact < 1 || idea.impact > 5) {
    const error = new Error('ID, nama, kelayakan, atau dampak ide tidak valid.');
    error.status = 400;
    throw error;
  }
  return idea;
}

const initializeDatabase = database.transaction(function (legacyIdeas) {
  if (initialized.get()) return;
  const ideas = legacyIdeas === null ? INITIAL_IDEAS : legacyIdeas;
  ideas.forEach(function (idea) { insertIdea.run(idea); });
  markInitialized.run();
});

const resetDatabase = database.transaction(function () {
  database.prepare('DELETE FROM ideas').run();
  INITIAL_IDEAS.forEach(function (idea) { insertIdea.run(idea); });
  markInitialized.run();
});

app.get('/api/health', function (req, res) {
  res.json({ status: 'ok' });
});

app.post('/api/ideas/bootstrap', function (req, res, next) {
  try {
    let legacyIdeas = null;
    if (req.body.legacyIdeas !== null && req.body.legacyIdeas !== undefined) {
      if (!Array.isArray(req.body.legacyIdeas)) {
        const error = new Error('Data migrasi harus berupa daftar ide.');
        error.status = 400;
        throw error;
      }
      legacyIdeas = req.body.legacyIdeas.map(validateIdea);
    }
    initializeDatabase(legacyIdeas);
    res.json(selectIdeas.all());
  } catch (err) {
    next(err);
  }
});

app.get('/api/ideas', function (req, res) {
  res.json(selectIdeas.all());
});

app.post('/api/ideas', function (req, res, next) {
  try {
    const idea = validateIdea(req.body);
    insertIdea.run(idea);
    res.status(201).json(idea);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      err.status = 409;
      err.message = 'ID ide sudah digunakan.';
    }
    next(err);
  }
});

app.put('/api/ideas/:id', function (req, res, next) {
  try {
    const idea = validateIdea(Object.assign({}, req.body, { id: req.params.id }));
    const result = database.prepare(
      'UPDATE ideas SET name = @name, feas = @feas, impact = @impact WHERE id = @id'
    ).run(idea);
    if (!result.changes) {
      const error = new Error('Ide tidak ditemukan.');
      error.status = 404;
      throw error;
    }
    res.json(idea);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/ideas/:id', function (req, res, next) {
  try {
    const result = database.prepare('DELETE FROM ideas WHERE id = ?').run(req.params.id);
    if (!result.changes) {
      const error = new Error('Ide tidak ditemukan.');
      error.status = 404;
      throw error;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.post('/api/ideas/reset', function (req, res, next) {
  try {
    resetDatabase();
    res.json(selectIdeas.all());
  } catch (err) {
    next(err);
  }
});

app.use('/api', function (req, res) {
  res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
});

app.use(function (err, req, res, next) {
  const status = err.status || (err instanceof SyntaxError ? 400 : 500);
  if (status >= 500) console.error('Kesalahan API database:', err);
  res.status(status).json({
    error: status >= 500 ? 'Terjadi kesalahan pada server database.' : err.message
  });
});

const server = app.listen(PORT, '127.0.0.1', function () {
  console.log('API database berjalan di http://127.0.0.1:' + PORT);
});

function shutdown() {
  server.close(function () {
    database.close();
    process.exit(0);
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
