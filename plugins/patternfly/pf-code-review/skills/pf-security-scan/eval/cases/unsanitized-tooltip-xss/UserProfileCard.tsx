import React from 'react';
import { Card, CardBody, CardTitle, Tooltip } from '@patternfly/react-core';

interface UserProfileCardProps {
  apiResponse: { displayName: string; bioHtml: string };
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({ apiResponse }) => (
  <Card>
    <CardTitle>{apiResponse.displayName}</CardTitle>
    <CardBody>
      <Tooltip content={apiResponse.bioHtml}>
        <span>Hover for bio</span>
      </Tooltip>
      <div dangerouslySetInnerHTML={{ __html: apiResponse.bioHtml }} />
    </CardBody>
  </Card>
);
