import ChatbotToggle from '@patternfly/chatbot/dist/dynamic/ChatbotToggle';

export function Assistant() {
  return <ChatbotToggle
        tooltipLabel="Open assistant"
        isChatbotVisible={false}
        onToggleChatbot={() => void}
      />;
}
