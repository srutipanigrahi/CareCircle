require('dotenv').config();
const fs = require('fs'), path = require('path');
const express = require('express'), cors = require('cors'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const q = (t, p) => pool.query(t, p);
const SECRET = process.env.JWT_SECRET || 'dev_secret';
const app = express();
app.use(cors(), express.json());

const wrap = f => (req, res) => f(req, res).catch(e => res.status(500).json({ error: e.message }));
const auth = (req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET); next(); }
  catch { res.status(401).json({ error: 'Unauthorized' }); }
};
const role = r => (req, res, next) => req.user.role === r ? next() : res.status(403).json({ error: `${r} access only` });

// --- Auth ---
app.post('/api/register', wrap(async (req, res) => {
  const { name, email, password, role: r, elderEmail } = req.body;
  if (!name || !email || !password || !['elder', 'family'].includes(r)) return res.status(400).json({ error: 'Missing fields' });
  let elderId = null;
  if (r === 'family') {
    const e = await q("SELECT id FROM users WHERE email=$1 AND role='elder'", [elderEmail]);
    if (!e.rows.length) return res.status(400).json({ error: 'Elder account not found. Elder must register first.' });
    elderId = e.rows[0].id;
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    await q('INSERT INTO users(name,email,password,role,elder_id) VALUES($1,$2,$3,$4,$5)', [name, email, hash, r, elderId]);
    res.json({ message: 'Registered' });
  } catch { res.status(400).json({ error: 'Email already registered' }); }
}));

app.post('/api/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const r = await q('SELECT * FROM users WHERE email=$1', [email]);
  const u = r.rows[0];
  if (!u || !(await bcrypt.compare(password, u.password))) return res.status(401).json({ error: 'Invalid credentials' });
  const user = { id: u.id, name: u.name, role: u.role, elderId: u.role === 'elder' ? u.id : u.elder_id };
  res.json({ token: jwt.sign(user, SECRET, { expiresIn: '7d' }), user });
}));

// --- Daily well-being check-ins ---
app.post('/api/checkins', auth, role('elder'), wrap(async (req, res) => {
  const r = await q('INSERT INTO checkins(elder_id,mood) VALUES($1,$2) RETURNING *', [req.user.elderId, req.body.mood || 'Good']);
  res.json(r.rows[0]);
}));
app.get('/api/checkins', auth, wrap(async (req, res) => {
  res.json((await q('SELECT * FROM checkins WHERE elder_id=$1 ORDER BY created_at DESC LIMIT 30', [req.user.elderId])).rows);
}));

// --- Medicines (family manages, elder views) ---
app.get('/api/medicines', auth, wrap(async (req, res) => {
  res.json((await q('SELECT * FROM medicines WHERE elder_id=$1 ORDER BY time', [req.user.elderId])).rows);
}));
app.post('/api/medicines', auth, role('family'), wrap(async (req, res) => {
  const { name, dosage, time } = req.body;
  res.json((await q('INSERT INTO medicines(elder_id,name,dosage,time) VALUES($1,$2,$3,$4) RETURNING *', [req.user.elderId, name, dosage, time])).rows[0]);
}));
app.delete('/api/medicines/:id', auth, role('family'), wrap(async (req, res) => {
  await q('DELETE FROM medicines WHERE id=$1 AND elder_id=$2', [req.params.id, req.user.elderId]); res.json({ ok: true });
}));

// --- Doctor appointments ---
app.get('/api/appointments', auth, wrap(async (req, res) => {
  res.json((await q('SELECT * FROM appointments WHERE elder_id=$1 ORDER BY appt_date', [req.user.elderId])).rows);
}));
app.post('/api/appointments', auth, role('family'), wrap(async (req, res) => {
  const { doctor, appt_date, notes } = req.body;
  res.json((await q('INSERT INTO appointments(elder_id,doctor,appt_date,notes) VALUES($1,$2,$3,$4) RETURNING *', [req.user.elderId, doctor, appt_date, notes])).rows[0]);
}));
app.delete('/api/appointments/:id', auth, role('family'), wrap(async (req, res) => {
  await q('DELETE FROM appointments WHERE id=$1 AND elder_id=$2', [req.params.id, req.user.elderId]); res.json({ ok: true });
}));

const PORT = process.env.PORT || 5000;
q(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'))
  .then(() => app.listen(PORT, () => console.log('CareCircle API on http://localhost:' + PORT)))
  .catch(e => { console.error('DB error:', e.message); process.exit(1); });
