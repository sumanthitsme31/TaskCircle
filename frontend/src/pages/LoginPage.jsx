import { apiUrl } from '../api/client';

export default function LoginPage() {
  return (
    <section className="card centered">
      <h1>TaskCircle</h1>
      <p>Collaborative circles and tasks with secure Google sign-in.</p>
      <a className="btn" href={`${apiUrl}/api/auth/google`}>Continue with Google</a>
    </section>
  );
}
