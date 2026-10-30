import { useState } from 'react';
import { ChatbotToggle } from '@patternfly/chatbot';
import Chatbot, { ChatbotDisplayMode } from '@patternfly/chatbot/dist/dynamic/Chatbot';
import ChatbotContent from '@patternfly/chatbot/dist/dynamic/ChatbotContent';
import ChatbotFooter from '@patternfly/chatbot/dist/dynamic/ChatbotFooter';
import MessageBar from '@patternfly/chatbot/dist/dynamic/MessageBar';
import MessageBox from '@patternfly/chatbot/dist/dynamic/MessageBox';
import Message, { MessageProps } from '@patternfly/chatbot/dist/dynamic/Message';
import PreviewAttachment from '@patternfly/chatbot/dist/dynamic/PreviewAttachment';
import AttachmentEdit from '@patternfly/chatbot/dist/dynamic/AttachmentEdit';
import ChatbotHeader from '@patternfly/chatbot/dist/dynamic/ChatbotHeader';

interface ModalData {
  code: string;
  fileName: string;
}

export function Assistant() {
  const onAttachmentClose = (event, name, id) => {
    const updatedMessages: MessageProps[] = [];
    messages.map((message) => {
      if (message.attachments) {
        const filteredAttachments = message.attachments.filter((attachment) => attachment.id !== id);
        message.attachments = filteredAttachments;
        updatedMessages.push(message);
      } else {
        updatedMessages.push(message);
      }
    });
    setMessages(updatedMessages);
  };

  const onAttachmentClick = () => {
    setCurrentModalData({ fileName: 'auth-operator.yml', code: 'test' });
    setIsEditModalOpen(false);
    setIsPreviewModalOpen(true);
  };

  const initialMessages: MessageProps[] = [
    {
      role: 'user',
      content: "I'm referring to this attachment for added context in our conversation.",
      name: 'User',
      avatarProps: { isBordered: true },
      attachments: [{ name: 'auth-operator.yml', id: '1', onClick: onAttachmentClick, onClose: onAttachmentClose }]
    },
    {
      role: 'bot',
      content: 'Great, I can reference this attachment throughout our conversation.',
      name: 'Bot'
    }
  ];

  const [chatbotVisible, setChatbotVisible] = useState<boolean>(true);
  const [messages, setMessages] = useState<MessageProps[]>(initialMessages);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [currentModalData, setCurrentModalData] = useState<ModalData>();
  const displayMode = ChatbotDisplayMode.default;

  const handleSend = (message) => alert(message);

  return (
    <>
      <ChatbotToggle
        tooltipLabel="Chatbot"
        isChatbotVisible={chatbotVisible}
        onToggleChatbot={() => {
          setChatbotVisible(!chatbotVisible);
          setIsEditModalOpen(false);
          setIsPreviewModalOpen(false);
        }}
      />
      <Chatbot isVisible={chatbotVisible} displayMode={displayMode}>
        <ChatbotHeader>
          ChatBot
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
        </ChatbotFooter>
      </Chatbot>
      {currentModalData && (
        <PreviewAttachment
          code={currentModalData?.code}
          fileName={currentModalData?.fileName}
          isModalOpen={isPreviewModalOpen}
          onEdit={() => {
            setIsPreviewModalOpen(false);
            setIsEditModalOpen(true);
          }}
          onDismiss={() => setCurrentModalData(undefined)}
          handleModalToggle={() => setIsPreviewModalOpen(false)}
          displayMode={displayMode}
        />
      )}
      {currentModalData && (
        <AttachmentEdit
          code={currentModalData?.code}
          fileName={currentModalData?.fileName}
          isModalOpen={isEditModalOpen}
          onSave={() => {
            setIsEditModalOpen(false);
          }}
          onCancel={() => setCurrentModalData(undefined)}
          handleModalToggle={() => setIsEditModalOpen(false)}
          displayMode={displayMode}
        />
      )}
    </>
  );
}

