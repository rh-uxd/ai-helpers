import { useState } from 'react';
import Chatbot, { ChatbotDisplayMode } from '@patternfly/chatbot/dist/dynamic/Chatbot';
import ChatbotContent from '@patternfly/chatbot/dist/dynamic/ChatbotContent';
import ChatbotFooter from '@patternfly/chatbot/dist/dynamic/ChatbotFooter';
import ChatbotHeader from '@patternfly/chatbot/dist/dynamic/ChatbotHeader';
import ChatbotFootnote from '@patternfly/chatbot/dist/dynamic/ChatbotFootnote';
import MessageBar from '@patternfly/chatbot/dist/dynamic/MessageBar';
import MessageBox from '@patternfly/chatbot/dist/dynamic/MessageBox';
import Message, { MessageProps } from '@patternfly/chatbot/dist/dynamic/Message';

export function Assistant() {
  const initialMessages: MessageProps[] = [
    {
      role: 'bot',
      content: '## Welcome\nI can help you with **common tasks**:\n- Reset your password\n- Check order status\n- Update billing info',
      name: 'Assistant'
    }
  ];

  const [messages, setMessages] = useState<MessageProps[]>(initialMessages);
  const displayMode = ChatbotDisplayMode.default;

  const handleSend = (message: string) => {
    setMessages((prev) => [...prev, { role: 'user', content: message, name: 'User' }]);
  };

  return (
    <Chatbot isVisible displayMode={displayMode}>
      <ChatbotHeader>
        Support Assistant
      </ChatbotHeader>
      <ChatbotContent>
        <MessageBox>
          {messages.map((message) => (
            <Message key={message.name} {...message} />
          ))}
        </MessageBox>
      </ChatbotContent>
      <ChatbotFooter>
        <MessageBar
          onSendMessage={handleSend}
          hasAttachButton={false}
        />
        <ChatbotFootnote label="Always review AI-generated content prior to use." />
      </ChatbotFooter>
    </Chatbot>
  );
}
