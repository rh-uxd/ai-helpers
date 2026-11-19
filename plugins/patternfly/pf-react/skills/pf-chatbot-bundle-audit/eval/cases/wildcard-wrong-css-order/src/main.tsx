import '@patternfly/chatbot/dist/css/main.css';
import '@patternfly/react-core/dist/styles/base.css';

import { createRoot } from 'react-dom/client';
import { Assistant } from './Assistant';

createRoot(document.getElementById('root')!).render(<Assistant />);
