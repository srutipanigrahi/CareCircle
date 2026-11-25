import { useState, useEffect, useCallback } from 'react';

const api = async (path, method = 'GET', body) => {
  const r = await fetch('/api' + path, {
    method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (localStorage.token || '') },
    body: body && JSON.stringify(body)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
};

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.user || 'null'));
  const logout = () => { localStorage.clear(); setUser(null); };
  return (
    <div className="wrap">
      <header><h1>CareCircle</h1>{user && <span>{user.name} ({user.role}) <button className="gray" onClick={logout}>Logout</button></span>}</header>
      {user ? <Dashboard user={user} /> : <Auth onLogin={setUser} />}
    </div>
  );
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ role: 'elder' });
  const [err, setErr] = useState('');
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async e => {
    e.preventDefault(); setErr('');
    try {
      if (mode === 'register') await api('/register', 'POST', f);
      const d = await api('/login', 'POST', f);
      localStorage.token = d.token; localStorage.user = JSON.stringify(d.user); onLogin(d.user);
    } catch (x) { setErr(x.message); }
  };
  return (
    <form className="card" onSubmit={submit}>
      <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>
      {mode === 'register' && <>
        <input placeholder="Name" onChange={set('name')} required />
        <select onChange={set('role')}><option value="elder">Elder</option><option value="family">Family member</option></select>
        {f.role === 'family' && <input placeholder="Elder's registered email" onChange={set('elderEmail')} required />}
      </>}
      <input type="email" placeholder="Email" onChange={set('email')} required />
      <input type="password" placeholder="Password" onChange={set('password')} required />
      {err && <p className="err">{err}</p>}
      <button>{mode === 'login' ? 'Login' : 'Create account'}</button>
      <p className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'New here? Register' : 'Have an account? Login'}</p>
    </form>
  );
}

function Dashboard({ user }) {
  const fam = user.role === 'family';
  const [checkins, setC] = useState([]), [meds, setM] = useState([]), [apps, setA] = useState([]);
  const [mood, setMood] = useState('Good');
  const load = useCallback(async () => {
    setC(await api('/checkins')); setM(await api('/medicines')); setA(await api('/appointments'));
  }, []);
  useEffect(() => { load(); }, [load]);
  const today = checkins.some(c => new Date(c.created_at).toDateString() === new Date().toDateString());
  const add = path => async e => { e.preventDefault(); await api(path, 'POST', Object.fromEntries(new FormData(e.target))); e.target.reset(); load(); };
  const del = (path, id) => async () => { await api(`${path}/${id}`, 'DELETE'); load(); };

  return (<>
    <div className="card">
      <h2>Daily Well-being Check-in</h2>
      <p>Today: {today ? <span className="ok">✔ Checked in</span> : <span className="warn">✖ Not checked in yet</span>}</p>
      {!fam && <>
        <select value={mood} onChange={e => setMood(e.target.value)}><option>Good</option><option>Okay</option><option>Not well</option></select>
        <button className="green" disabled={today} onClick={async () => { await api('/checkins', 'POST', { mood }); load(); }}>I'm OK today</button>
      </>}
      <table><thead><tr><th>Date</th><th>Mood</th></tr></thead>
        <tbody>{checkins.map(c => <tr key={c.id}><td>{new Date(c.created_at).toLocaleString()}</td><td>{c.mood}</td></tr>)}</tbody></table>
    </div>

    <div className="card">
      <h2>Medicine Schedule</h2>
      {fam && <form onSubmit={add('/medicines')}><input name="name" placeholder="Medicine" required /><input name="dosage" placeholder="Dosage" /><input name="time" type="time" required /><button>Add</button></form>}
      <table><thead><tr><th>Medicine</th><th>Dosage</th><th>Time</th><th></th></tr></thead>
        <tbody>{meds.map(m => <tr key={m.id}><td>{m.name}</td><td>{m.dosage}</td><td>{m.time}</td>
          <td>{fam && <button className="red" onClick={del('/medicines', m.id)}>Delete</button>}</td></tr>)}</tbody></table>
    </div>

    <div className="card">
      <h2>Doctor Appointments</h2>
      {fam && <form onSubmit={add('/appointments')}><input name="doctor" placeholder="Doctor" required /><input name="appt_date" type="datetime-local" required /><input name="notes" placeholder="Notes" /><button>Add</button></form>}
      <table><thead><tr><th>Doctor</th><th>When</th><th>Notes</th><th></th></tr></thead>
        <tbody>{apps.map(a => <tr key={a.id}><td>{a.doctor}</td><td>{new Date(a.appt_date).toLocaleString()}</td><td>{a.notes}</td>
          <td>{fam && <button className="red" onClick={del('/appointments', a.id)}>Delete</button>}</td></tr>)}</tbody></table>
    </div>
  </>);
}
