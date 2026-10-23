import '@patternfly/react-core/dist/styles/base.css';
import '@patternfly/chatbot/dist/css/main.css';

import { createRoot } from 'react-dom/client';
import { CodeViewer } from './CodeViewer';

createRoot(document.getElementById('root')!).render(
  <CodeViewer code="const ready = true;" isOpen onClose={() => undefined} />,
);
