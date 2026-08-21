import React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  Title,
  Button,
  Alert,
  Label,
  Tooltip,
} from '@patternfly/react-core';

interface User {
  name: string;
  role: string;
  active: boolean;
}

interface UserListProps {
  users: User[];
  onRefresh: () => void;
  error?: string;
}

export const UserList: React.FC<UserListProps> = ({ users, onRefresh, error }) => {
  console.log('Rendering UserList component');

  if (error) {
    return (
      <Alert variant="danger" title="Failed to load users">
        Something went wrong while loading the user list. Please try again.
      </Alert>
    );
  }

  if (users.length === 0) {
    return (
      <EmptyState>
        <Title headingLevel="h4" size="lg">
          No users found
        </Title>
        <EmptyStateBody>
          There are no users matching your current filters. Try adjusting your search criteria.
        </EmptyStateBody>
        <Button variant="primary" onClick={onRefresh}>
          Refresh list
        </Button>
      </EmptyState>
    );
  }

  return (
    <div data-testid="user-list-container">
      <h2>Team Members</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.name}>
              <td>
                <Tooltip content="Click to view profile">
                  <span>{user.name}</span>
                </Tooltip>
              </td>
              <td>{user.role}</td>
              <td>
                <Label color={user.active ? 'green' : 'red'}>
                  {user.active ? 'Active' : 'Inactive'}
                </Label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
