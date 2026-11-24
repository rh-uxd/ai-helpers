# Accessibility — Renew Loan

Producer: `uxd-a11y-keyboard-audit`, build `62c3b21`.

After Escape dismissed the Renew Loan confirmation dialog, focus moved to
the page body rather than the Renew Loan trigger. Restore focus to the
trigger so users do not lose their place. [Keyboard observation](../../../../../checks/keyboard.md)
and [ARIA APG guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

No other dismissal methods were tested.
