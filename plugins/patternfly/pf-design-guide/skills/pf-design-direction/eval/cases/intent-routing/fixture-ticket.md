# Revoke production credentials

Administrators need to revoke a production signing credential from the
credentials table. Revocation immediately stops every workload using that
credential and cannot be undone. The user must type the credential name before
confirming.

The table already has a details drawer, and the team suggested putting the
revocation form there or expanding it inline beneath the selected row. The
decision must account for the irreversible consequence and prevent the user
from continuing the underlying task until they confirm or cancel.
