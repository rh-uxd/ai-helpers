# Synthetic keyboard observation

- Producer: `uxd-a11y-keyboard-audit`
- Prototype: Campus Library, mock build `62c3b21`
- Journey and state: Renew Loan, confirmation dialog open
- Observed: Escape closed the dialog. Focus moved to the page body instead of
  returning to the Renew Loan trigger. No other dismissal method was tested.
- Reference: [ARIA APG Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
