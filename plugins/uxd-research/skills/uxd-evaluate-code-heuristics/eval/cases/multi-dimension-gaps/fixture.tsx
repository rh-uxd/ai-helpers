import React from "react";

interface Project {
  id: string;
  name: string;
  owner: string;
}

export function ProjectList({
  projects,
  loading,
  error,
  onArchive,
}: {
  projects: Project[];
  loading: boolean;
  error: unknown;
  onArchive: (ids: string[]) => void;
}) {
  if (loading) return <div className="spinner" />;
  if (error) return <pre>{JSON.stringify(error)}</pre>;

  const [selected, setSelected] = React.useState<string[]>([]);

  const handleBulkArchive = () => {
    onArchive(selected);
    setSelected([]);
  };

  return (
    <div>
      <h2>Projects</h2>
      <button disabled={selected.length === 0} onClick={handleBulkArchive}>
        OK
      </button>
      <table>
        <thead>
          <tr>
            <th />
            <th>Name</th>
            <th>Owner</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  onChange={(e) =>
                    setSelected((s) =>
                      e.target.checked
                        ? [...s, p.id]
                        : s.filter((id) => id !== p.id)
                    )
                  }
                />
              </td>
              <td>{p.name}</td>
              <td>{p.owner}</td>
              <td>
                <button onClick={() => onArchive([p.id])}>Archive</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
