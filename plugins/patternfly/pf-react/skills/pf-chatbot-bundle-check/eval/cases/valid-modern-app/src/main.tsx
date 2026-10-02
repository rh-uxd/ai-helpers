import '@patternfly/chatbot/monaco-environment';
import '@patternfly/react-core/dist/styles/base.css';
import '@patternfly/chatbot/dist/css/main.css';

import { createRoot } from 'react-dom/client';
import { Assistant } from './Assistant';

createRoot(document.getElementById('root')!).render(<Assistant />);
