export default function StatusBlock({ loading, error, emptyMessage, hasData, children }) {
  if (loading) return <p className="state">Loading...</p>;
  if (error) return <p className="state error">{error}</p>;
  if (!hasData) return <p className="state">{emptyMessage}</p>;
  return children;
}
