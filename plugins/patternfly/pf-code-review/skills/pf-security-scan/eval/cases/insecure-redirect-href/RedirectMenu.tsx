import React from 'react';
import { Button, DropdownItem } from '@patternfly/react-core';

interface RedirectMenuProps {
  searchParams: URLSearchParams;
  userSuppliedUrl: string;
}

export const RedirectMenu: React.FC<RedirectMenuProps> = ({ searchParams, userSuppliedUrl }) => (
  <>
    <Button component="a" href={userSuppliedUrl}>
      External action
    </Button>
    <DropdownItem href={searchParams.get('redirect') ?? '#'}>
      Continue
    </DropdownItem>
  </>
);
