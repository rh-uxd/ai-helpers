import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionMenu } from './ActionMenu';

const mockActions = [
  { label: 'Edit', onClick: jest.fn() },
  { label: 'Delete', onClick: jest.fn(), isDisabled: true },
];

describe('ActionMenu', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the toggle button', () => {
      render(<ActionMenu actions={mockActions} />);
      expect(screen.getByRole('button', { name: 'Actions' })).toBeInTheDocument();
    });

    it('renders with custom toggle label', () => {
      render(<ActionMenu actions={mockActions} toggleLabel="More" />);
      expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('opens menu on toggle click', async () => {
      render(<ActionMenu actions={mockActions} />);
      await user.click(screen.getByRole('button', { name: 'Actions' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('calls action onClick on selection', async () => {
      render(<ActionMenu actions={mockActions} />);
      await user.click(screen.getByRole('button', { name: 'Actions' }));
      await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
      expect(mockActions[0].onClick).toHaveBeenCalledTimes(1);
    });
  });
});
