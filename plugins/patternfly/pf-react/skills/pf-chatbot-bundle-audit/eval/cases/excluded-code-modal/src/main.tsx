import { CodeModal } from '@patternfly/chatbot';
import '@patternfly/react-core/dist/styles/base.css';
import '@patternfly/chatbot/dist/css/main.css';

import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(
  <CodeModal title="Test code modal" handleModalToggle={() => void} primaryActionBtn="Save" secondaryActionBtn="Cancel" onPrimaryAction={() => void} onSecondaryAction={() => void} code="const valid = true;" fileName="test.js" isModalOpen={true} />;
);
