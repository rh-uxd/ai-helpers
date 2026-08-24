import { render, screen } from '@testing-library/react';
import { NotificationSettings } from './NotificationSettings';

jest.mock('./notifications', () => ({
  getNotificationPrefs: jest.fn().mockResolvedValue({ emailEnabled: true }),
  saveNotificationPrefs: jest.fn().mockResolvedValue(undefined),
}));

test('renders the global email alerts toggle', async () => {
  render(<NotificationSettings />);
  expect(await screen.findByText('Email alerts')).toBeInTheDocument();
});
