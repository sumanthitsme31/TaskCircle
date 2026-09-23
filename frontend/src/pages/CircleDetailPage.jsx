import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest } from '../api/client';
import StatusBlock from '../components/StatusBlock';

export default function CircleDetailPage() {
  const { circleId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [circle, setCircle] = useState(null);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'MEDIUM', due_date: '' });

  const load = async () => {
    try {
      setLoading(true);
      const [circleData, memberData, requestData, taskData] = await Promise.all([
        apiRequest(`/api/circles/${circleId}`),
        apiRequest(`/api/circles/${circleId}/members`),
        apiRequest(`/api/circles/${circleId}/join-requests`).catch(() => []),
        apiRequest(`/api/circles/${circleId}/tasks`)
      ]);
      setCircle(circleData);
      setMembers(memberData);
      setRequests(requestData);
      setTasks(taskData);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [circleId]);

  const createTask = async (event) => {
    event.preventDefault();
    await apiRequest(`/api/circles/${circleId}/tasks`, { method: 'POST', body: JSON.stringify(taskForm) });
    setTaskForm({ title: '', description: '', priority: 'MEDIUM', due_date: '' });
    load();
  };

  const assignAll = async () => {
    await apiRequest(`/api/circles/${circleId}/tasks/assign-all`, { method: 'POST', body: JSON.stringify(taskForm) });
    load();
  };

  const updateRequest = async (requestId, status) => {
    await apiRequest(`/api/circles/${circleId}/join-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    load();
  };

  const updateStatus = async (taskId, status) => {
    await apiRequest(`/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    load();
  };

  return (
    <section className="stack">
      <StatusBlock loading={loading} error={error} hasData={Boolean(circle)} emptyMessage="Circle not found">
        <article className="card">
          <h2>{circle?.name}</h2>
          <p>{circle?.description || 'No description'}</p>
        </article>
        <article className="card">
          <h3>Members</h3>
          <ul className="list">
            {members.map((member) => <li key={member.id}>{member.name} · {member.role}</li>)}
          </ul>
        </article>
        <article className="card">
          <h3>Join Requests</h3>
          <StatusBlock loading={false} error={null} hasData={requests.length > 0} emptyMessage="No pending requests.">
            <ul className="list">
              {requests.map((request) => (
                <li key={request.id}>
                  <span>{request.name}</span>
                  <div className="row">
                    <button onClick={() => updateRequest(request.id, 'APPROVED')} type="button">Approve</button>
                    <button onClick={() => updateRequest(request.id, 'REJECTED')} type="button">Reject</button>
                  </div>
                </li>
              ))}
            </ul>
          </StatusBlock>
        </article>
        <article className="card">
          <h3>Create Task</h3>
          <form onSubmit={createTask} className="stack">
            <input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Task title" required />
            <textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Description" />
            <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
            <input type="datetime-local" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
            <div className="row">
              <button type="submit">Create Task</button>
              <button type="button" onClick={assignAll}>Assign to All</button>
            </div>
          </form>
        </article>
        <article className="card">
          <h3>Tasks</h3>
          <StatusBlock loading={false} error={null} hasData={tasks.length > 0} emptyMessage="No tasks yet.">
            <ul className="list">
              {tasks.map((task) => (
                <li key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.priority} · {task.status} · {task.assignee_name || 'Unassigned'}</p>
                  </div>
                  <select value={task.status} onChange={(e) => updateStatus(task.id, e.target.value)}>
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </li>
              ))}
            </ul>
          </StatusBlock>
        </article>
      </StatusBlock>
    </section>
  );
}
