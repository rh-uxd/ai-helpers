import { useEffect, useState } from 'react';

type Host = { id: string; name: string };

export const HostsTable = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/hosts')
      .then((response) => response.json())
      .then((data: Host[]) => {
        setHosts(data);
        // loading is never cleared on success
      });
  }, []);

  return (
    <div>
      {loading && <span>Loading hosts…</span>}
      <table>
        <tbody>
          {hosts.map((host) => (
            <tr key={host.id}>
              <td>{host.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
