import React from 'react';
import { Button, Flex, FlexItem } from '@patternfly/react-core';
import './FlexActions.scss';

export const FlexActions = () => (
  <Flex className="actions">
    <FlexItem>
      <Button variant="primary">Save</Button>
    </FlexItem>
    <FlexItem>
      <Button variant="link">Cancel</Button>
    </FlexItem>
  </Flex>
);