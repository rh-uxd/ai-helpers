import Message from '@patternfly/chatbot/dist/dynamic/Message';
import MessageBox from '@patternfly/chatbot/dist/dynamic/MessageBox';

export function Assistant() {
  return (
    <MessageBox>
      <Message content="Welcome! See **recent alerts** below." role="bot" />
    </MessageBox>
  );
}
