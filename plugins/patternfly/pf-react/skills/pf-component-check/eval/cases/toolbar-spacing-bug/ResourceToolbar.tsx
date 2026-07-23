import React from 'react';
import { Toolbar, Button, SearchInput } from '@patternfly/react-core';

interface ResourceToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
  onDelete: () => void;
}

export const ResourceToolbar: React.FC<ResourceToolbarProps> = ({
  search,
  onSearchChange,
  onCreate,
  onDelete,
}) => (
  <Toolbar>
    <SearchInput
      value={search}
      onChange={(_event, value) => onSearchChange(value)}
      aria-label="Search resources"
    />
    <Button variant="primary" onClick={onCreate}>
      Create
    </Button>
    <Button variant="danger" onClick={onDelete}>
      Delete
    </Button>
  </Toolbar>
);
