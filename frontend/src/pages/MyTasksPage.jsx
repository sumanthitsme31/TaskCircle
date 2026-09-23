import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import StatusBlock from '../components/StatusBlock';

export default function MyTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/api/my-tasks')
      .then(setTasks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <article className="card">
      <h3>My Tasks</h3>
      <StatusBlock loading={loading} error={error} hasData={tasks.length > 0} emptyMessage="No assigned tasks.">
        <ul className="list">
          {tasks.map((task) => (
            <li key={task.id}>{task.title} · {task.status} · {task.circle_name}</li>
          ))}
        </ul>
      </StatusBlock>
    </article>
  );
}
