import CodeModal from '@patternfly/chatbot/dist/dynamic/CodeModal';

export function CodeViewer({ onClose }: { onClose: () => void }) {
  return <CodeModal code="const valid = true;" isOpen onClose={onClose} />;
}
