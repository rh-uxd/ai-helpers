import React, { useState } from 'react';
import {
  Page,
  PageSection,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';

const CustomToolbar: React.FC = () => {
  const [filter, setFilter] = useState('all');

  return (
    <Page>
      {/* No SkipToContent — Criterion 1 violation */}
      <PageSection>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <div
                className="custom-action"
                onClick={() => console.log('action')}
                style={{
                  cursor: 'pointer',
                  padding: '6px 12px',
                  border: '1px solid #ccc',
                }}
              >
                Custom Action
              </div>
            </ToolbarItem>

            <ToolbarItem>
              <a
                onClick={() => console.log('navigate')}
                style={{ cursor: 'pointer' }}
              >
                Go to reports
              </a>
            </ToolbarItem>

            <ToolbarItem>
              <div
                role="button"
                onClick={() => setFilter('active')}
                style={{
                  cursor: 'pointer',
                  padding: '6px 12px',
                  background: '#0066cc',
                  color: '#fff',
                }}
              >
                Filter Active
              </div>
            </ToolbarItem>

            <ToolbarItem>
              <button tabIndex={5} onClick={() => console.log('export')}>
                Export
              </button>
            </ToolbarItem>

            <ToolbarItem>
              <div
                role="checkbox"
                aria-checked={filter === 'active'}
                onClick={() =>
                  setFilter(filter === 'active' ? 'all' : 'active')
                }
                style={{ cursor: 'pointer' }}
              >
                Show active only
              </div>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </PageSection>
    </Page>
  );
};

export default CustomToolbar;
