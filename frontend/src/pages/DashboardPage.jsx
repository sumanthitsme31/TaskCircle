import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import StatusBlock from '../components/StatusBlock';

export default function DashboardPage({ circles, loading, error, reload }) {
  const [form, setForm] = useState({ name: '', description: '', privacy: 'PUBLIC' });
  const [joinCode, setJoinCode] = useState('');

  const createCircle = async (event) => {
    event.preventDefault();
    await apiRequest('/api/circles', { method: 'POST', body: JSON.stringify(form) });
    setForm({ name: '', description: '', privacy: 'PUBLIC' });
    reload();
  };

  const joinCircle = async (event) => {
    event.preventDefault();
    await apiRequest('/api/circles/join', { method: 'POST', body: JSON.stringify({ code: joinCode }) });
    setJoinCode('');
    reload();
  };

  return (
    <section className="grid">
      <article className="card">
        <h3>Create Circle</h3>
        <form onSubmit={createCircle} className="stack">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Circle name" required />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" />
          <select value={form.privacy} onChange={(e) => setForm({ ...form, privacy: e.target.value })}>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
          </select>
          <button type="submit">Create</button>
        </form>
      </article>
      <article className="card">
        <h3>Join Circle</h3>
        <form onSubmit={joinCircle} className="stack">
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} minLength={8} maxLength={8} placeholder="8 character code" required />
          <button type="submit">Join</button>
        </form>
      </article>
      <article className="card span2">
        <h3>Your Circles</h3>
        <StatusBlock loading={loading} error={error} hasData={circles.length > 0} emptyMessage="No circles yet.">
          <ul className="list">
            {circles.map((circle) => (
              <li key={circle.id}>
                <div>
                  <strong>{circle.name}</strong>
                  <p>{circle.privacy} · {circle.role} · code: {circle.code}</p>
                </div>
                <Link to={`/app/circles/${circle.id}`}>Open</Link>
              </li>
            ))}
          </ul>
        </StatusBlock>
      </article>
    </section>
  );
}
