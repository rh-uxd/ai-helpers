import { ChatbotToggle } from '@patternfly/chatbot';
import MessageBox from '@patternfly/chatbot/dist/dynamic/MessageBox';

export function Assistant() {
  return (
    <>
      <ChatbotToggle tooltipContent="Open assistant" />
      <MessageBox />
    </>
  );
}
