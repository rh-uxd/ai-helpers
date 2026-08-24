# SAT-2201: Hosts table spinner never stops

**Type:** Bug | **Status:** Open | **Priority:** Medium
**Link:** https://issues.example.com/browse/SAT-2201
**Component:** Hosts

## Description

On the All Hosts page, opening the table shows a loading spinner. After the
host list returns, the spinner stays visible on top of the rows. Refreshing
does not clear it. There is no written acceptance criteria on this ticket.

## Comments

**Jane (2026-08-12):**
Reproduced on the latest develop build. Network tab shows the hosts request
completes 200.

**Alex (2026-08-13):**
Looks like setLoading(false) is missing in the success path. Needs a plan
before we touch it.
