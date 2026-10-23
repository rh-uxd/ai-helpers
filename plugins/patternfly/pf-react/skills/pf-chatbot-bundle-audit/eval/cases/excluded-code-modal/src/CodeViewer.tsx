import { CodeModal } from '@patternfly/chatbot';

interface CodeViewerProps {
  code: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CodeViewer({ code, isOpen, onClose }: CodeViewerProps) {
  return <CodeModal code={code} isOpen={isOpen} onClose={onClose} />;
}
