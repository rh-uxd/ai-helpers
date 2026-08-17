import React, { useState } from 'react';
import {
  Page,
  PageSection,
  Card,
  CardTitle,
  CardBody,
  SkipToContent,
} from '@patternfly/react-core';

const FilterPanel: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('');

  const filters = [
    'Status: Active',
    'Status: Inactive',
    'Type: Cluster',
    'Type: Node',
    'Region: US-East',
    'Region: EU-West',
  ];

  return (
    <Page
      skipToContent={
        <SkipToContent href="#main-content">Skip to main content</SkipToContent>
      }
      mainContainerId="main-content"
    >
      <PageSection id="main-content">
        <Card>
          <CardTitle>Filter Panel</CardTitle>
          <CardBody>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {selectedFilter || 'Select filter'}
              </button>
              {isMenuOpen && (
                <ul
                  role="menu"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    background: '#fff',
                    border: '1px solid #ccc',
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    minWidth: '200px',
                  }}
                >
                  {filters.map((f) => (
                    <li
                      key={f}
                      role="menuitem"
                      onClick={() => {
                        setSelectedFilter(f);
                        setIsMenuOpen(false);
                      }}
                      style={{ padding: '8px 16px', cursor: 'pointer' }}
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardTitle>Event Log</CardTitle>
          <CardBody>
            <div style={{ maxHeight: '200px', overflow: 'auto' }}>
              <p>Event #1: System health check completed</p>
              <p>Event #2: Deployment finished successfully</p>
              <p>Event #3: Certificate renewed</p>
              <p>Event #4: Node scaling triggered</p>
              <p>Event #5: Backup completed</p>
              <p>Event #6: Security scan passed</p>
              <p>Event #7: Configuration updated</p>
              <p>Event #8: Load balancer reconfigured</p>
              <p>Event #9: DNS record propagated</p>
              <p>Event #10: Cluster upgrade initiated</p>
              <p>Event #11: Storage volume expanded</p>
              <p>Event #12: Network policy applied</p>
              <p>Event #13: Service mesh updated</p>
              <p>Event #14: Monitoring alert resolved</p>
              <p>Event #15: Container image scanned</p>
              <p>Event #16: Access policy changed</p>
              <p>Event #17: Database migration completed</p>
              <p>Event #18: Cache invalidated</p>
              <p>Event #19: Rate limit adjusted</p>
              <p>Event #20: Failover test succeeded</p>
            </div>
          </CardBody>
        </Card>
      </PageSection>
    </Page>
  );
};

export default FilterPanel;
