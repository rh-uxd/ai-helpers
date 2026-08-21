import React, { useState, useEffect } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@patternfly/react-table';
import { Pagination } from '@patternfly/react-core';

interface User {
  id: number;
  name: string;
  email: string;
  role: { name: string; permissions: string[] };
}

interface UserTableProps {
  users?: User[];
  onSelect?: (user: User) => void;
}

export const UserTable: React.FC<UserTableProps> = ({ users, onSelect }) => {
  const [page, setPage] = useState(1);
  const perPage = 10;

  const paginatedUsers = users.slice((page - 1) * perPage, page * perPage);
  const firstUser = users[0];

  return (
    <>
      <h2>Users ({users.length})</h2>
      <Table aria-label="User table">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Permissions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {paginatedUsers.map((user) => (
            <Tr key={user.id} onClick={() => onSelect(user)}>
              <Td>{user.name}</Td>
              <Td>{user.email}</Td>
              <Td>{user.role.name}</Td>
              <Td>{user.role.permissions.join(', ')}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      <Pagination
        itemCount={users.length}
        perPage={perPage}
        page={page}
        onSetPage={(_e, p) => setPage(p)}
      />
      <p>Admin: {firstUser.role.name}</p>
    </>
  );
};
