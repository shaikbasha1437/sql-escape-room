# SQL Escape Room: full solutions

> **Spoilers.** This file solves every puzzle and names the culprit. The game checks results, not query text, so these are just one way to get each answer.

## Room 1: The Reading Room

_Concepts: SELECT, WHERE, AND / OR, IS NULL, LIKE_

### Who should be here?

List the names of everyone on the night shift.

```sql
SELECT name FROM staff WHERE shift = 'night';
```

**Expected result:** 5 rows: Wen Li; Theo Marsh; Nadia Okafor; Felix Ordway; Sam Kettering

### Keys to the Vault

List the names of all staff with vault clearance.

```sql
SELECT name FROM staff WHERE clearance = 'vault';
```

**Expected result:** 3 rows: Imogen Hale; Margot Vell; Theo Marsh

### The way out

Find the code of the Reading Room door on floor 1 that has a keypad and no maintenance note.

```sql
SELECT code FROM doors WHERE name LIKE 'Reading Room%' AND floor = 1 AND lock_type = 'keypad' AND notes IS NULL;
```

**Answer:** `2741`

## Room 2: The Card Catalogue

_Concepts: ORDER BY, LIMIT / OFFSET, DISTINCT, NULL ordering_

### The oldest treasure

Find the shelf mark of the oldest book in the ‘Rare’ collection that has a known year.

```sql
SELECT shelf FROM books WHERE collection = 'Rare' AND year IS NOT NULL ORDER BY year LIMIT 1;
```

**Answer:** `R-13`

### Last borrowed

Show the titles of the 5 most recently checked-out books, newest first.

```sql
SELECT title FROM books ORDER BY last_checkout DESC LIMIT 5;
```

**Expected result:** 5 rows (order matters): Ashgrove: A Priory and Its Stars; Night Skies of the Fen Country; Reading Medieval Star Tables; The Care of Vellum; Bells and Clockwork of Hollowmere

### A pattern of absences

List each author who has at least one book with status ‘missing’, once each.

```sql
SELECT DISTINCT author FROM books WHERE status = 'missing';
```

**Expected result:** 3 rows: Unknown (Ashgrove Priory); H. Calloway; M. Ostrander

### The catalogue lock

Sort the Astronomy books by year, newest first. The code is the year of the third one.

```sql
SELECT year FROM books WHERE collection = 'Astronomy' AND year IS NOT NULL ORDER BY year DESC LIMIT 1 OFFSET 2;
```

**Answer:** `2006`

## Room 3: The Ledger Hall

_Concepts: COUNT / SUM / AVG, GROUP BY, HAVING, LOWER()_

### Overdue

How many checkouts were never returned?

```sql
SELECT COUNT(*) FROM checkouts WHERE returned_at IS NULL;
```

**Answer:** `27`

### The hoarders

Which borrowers have more than 3 unreturned checkouts? Treat names that differ only in capitalisation as the same person.

```sql
SELECT LOWER(borrower) AS borrower FROM checkouts WHERE returned_at IS NULL GROUP BY LOWER(borrower) HAVING COUNT(*) > 3;
```

**Expected result:** 2 rows: priya raman; sam kettering

### Follow the money

Which donor gave the most money in total to the ‘Codex Fund’?

```sql
SELECT donor FROM donations WHERE earmark = 'Codex Fund' GROUP BY donor ORDER BY SUM(amount) DESC LIMIT 1;
```

**Answer:** `Aurelian Trust`

### Settling accounts

Add up the fines that haven’t been paid (paid = 0). That total is the code.

```sql
SELECT SUM(fine) FROM checkouts WHERE paid = 0;
```

**Answer:** `843`

## Room 4: The Security Office

_Concepts: INNER JOIN, LEFT JOIN, Table aliases, Joining on IDs, not names_

### Into the vault corridor

Who swiped into the ‘Vault Corridor’ after 22:00 tonight (2026-03-13)? List their names.

```sql
SELECT DISTINCT p.name FROM swipes s JOIN badges b ON b.badge_id = s.badge_id JOIN staff p ON p.id = b.holder_id WHERE s.door = 'Vault Corridor' AND s.ts >= '2026-03-13 22:00:00';
```

**Expected result:** 2 rows: Nadia Okafor; Theo Marsh

### A ghost badge

Find the badge that was swiped tonight but doesn’t appear in the badges table at all.

```sql
SELECT s.badge_id FROM swipes s LEFT JOIN badges b ON b.badge_id = s.badge_id WHERE b.badge_id IS NULL;
```

**Answer:** `B-0913`

### Dead badge walking

Find the badge with status ‘revoked’ that was swiped tonight. Give its holder’s staff id.

```sql
SELECT DISTINCT b.holder_id FROM swipes s JOIN badges b ON b.badge_id = s.badge_id WHERE b.status = 'revoked';
```

**Answer:** `22`

### The supervisor’s riddle

Find the door with the most ‘denied’ swipes, and give its code from the doors table.

```sql
SELECT d.code FROM swipes s JOIN doors d ON d.name = s.door WHERE s.result = 'denied' GROUP BY d.name ORDER BY COUNT(*) DESC LIMIT 1;
```

**Answer:** `8352`

## Room 5: The Server Closet

_Concepts: Subqueries, IN / NOT IN, NOT EXISTS, NULL traps in NOT IN, Averages of counts_

### Where the order came from

Which terminal issued the LOCKDOWN command?

```sql
SELECT terminal FROM logins WHERE id = (SELECT login_id FROM commands WHERE command LIKE 'LOCKDOWN%');
```

**Answer:** `T-07`

### Whose fingerprints

Whose account issued the LOCKDOWN? Give the staff member’s name.

```sql
SELECT name FROM staff WHERE id = (SELECT staff_id FROM accounts WHERE username = (SELECT username FROM logins WHERE id = (SELECT login_id FROM commands WHERE command LIKE 'LOCKDOWN%')));
```

**Answer:** `Felix Ordway`

### Knocking on the door

List the usernames whose number of failed logins is greater than the average number of failed logins per user (counting only users who had at least one failure).

```sql
SELECT username FROM logins WHERE success = 0 GROUP BY username HAVING COUNT(*) > (SELECT AVG(n) FROM (SELECT COUNT(*) AS n FROM logins WHERE success = 0 GROUP BY username));
```

**Expected result:** 1 row: fordway

### The cold terminal

Find the terminal with no successful logins at all, and give its pin.

```sql
SELECT pin FROM terminals t WHERE NOT EXISTS (SELECT 1 FROM logins l WHERE l.terminal = t.id AND l.success = 1);
```

**Answer:** `6190`

## Room 6: The Map Room

_Concepts: WITH (CTEs), Chaining CTEs, Greatest-per-group, Time windows_

### Where everyone stood

For each person, find the room they entered most recently before 23:47:00. Show their name and that room.

```sql
WITH last AS (SELECT tag, MAX(ts) AS ts FROM pings WHERE ts < '2026-03-13 23:47:00' GROUP BY tag) SELECT pe.name, p.room FROM last JOIN pings p ON p.tag = last.tag AND p.ts = last.ts JOIN tags t ON t.tag = p.tag JOIN people pe ON pe.id = t.person_id;
```

**Expected result:** 14 rows: Guest G-17 / Reading Room; Imogen Hale / Staff Entrance; Olive Barnes / Main Entrance; Lucia Ferreira / Staff Entrance; Dalia Haddad / Main Entrance; Kofi Mensah / Loading Dock; …

### Who was in the lounge

List the names of everyone who entered the Donor Lounge between 23:00 and 23:45 tonight.

```sql
WITH lounge AS (SELECT tag FROM pings WHERE room = 'Donor Lounge' AND ts BETWEEN '2026-03-13 23:00:00' AND '2026-03-13 23:45:00') SELECT DISTINCT pe.name FROM lounge l JOIN tags t ON t.tag = l.tag JOIN people pe ON pe.id = t.person_id;
```

**Expected result:** 3 rows: Margot Vell; Priya Raman; Sam Kettering

### The crowded room

Using the positions at 23:47 (one room per person), find the room with the most people in it, and give its door_code.

```sql
WITH last AS (SELECT tag, MAX(ts) AS ts FROM pings WHERE ts < '2026-03-13 23:47:00' GROUP BY tag), pos AS (SELECT p.room FROM last JOIN pings p ON p.tag = last.tag AND p.ts = last.ts JOIN tags t ON t.tag = p.tag WHERE t.person_id IS NOT NULL), busiest AS (SELECT room, COUNT(*) AS n FROM pos GROUP BY room ORDER BY n DESC LIMIT 1) SELECT r.door_code FROM busiest b JOIN rooms r ON r.name = b.room;
```

**Answer:** `6644`

## Room 7: The Clock Tower

_Concepts: Window functions, LAG / LEAD, PARTITION BY, Running totals, julianday() date math_

### The first light to go out

Find the minute when VAULT-MAG’s reading fell by more than 3 kW compared with the previous reading. Answer as HH:MM.

```sql
WITH w AS (SELECT ts, kw, LAG(kw) OVER (ORDER BY ts) AS prev FROM power_log WHERE circuit = 'VAULT-MAG') SELECT strftime('%H:%M', ts) FROM w WHERE prev - kw > 3;
```

**Answer:** `23:46`

### The long wait

A stay lasts from entering a room to that person’s next ping anywhere. Who had the single longest stay in the Donor Lounge tonight?

```sql
WITH s AS (SELECT tag, room, ts, LEAD(ts) OVER (PARTITION BY tag ORDER BY ts) AS next_ts FROM pings) SELECT pe.name FROM s JOIN tags t ON t.tag = s.tag JOIN people pe ON pe.id = t.person_id WHERE s.room = 'Donor Lounge' AND s.next_ts IS NOT NULL ORDER BY julianday(s.next_ts) - julianday(s.ts) DESC LIMIT 1;
```

**Answer:** `Margot Vell`

### The battery clock

Keep a running total of BACKUP readings in time order. At what minute (HH:MM) did it first go above 40?

```sql
WITH r AS (SELECT ts, SUM(kw) OVER (ORDER BY ts) AS running FROM power_log WHERE circuit = 'BACKUP') SELECT strftime('%H:%M', MIN(ts)) FROM r WHERE running > 40;
```

**Answer:** `23:51`

## Room 8: The Vault

_Concepts: Self-joins, Date math, TRIM / UPPER / LIKE, SUBSTR, group_concat_

### Two places at once

Find the badge that was swiped at two different doors faster than anyone could walk between them. List the badge_id.

```sql
SELECT DISTINCT a.badge_id FROM swipes a JOIN swipes b ON a.badge_id = b.badge_id AND a.ts < b.ts AND a.door <> b.door JOIN walk_times w ON w.from_door = a.door AND w.to_door = b.door WHERE (julianday(b.ts) - julianday(a.ts)) * 86400 < w.seconds;
```

**Expected result:** 1 row: B-0417

### The badge printer

Which room holds the encoder that wrote a copy of B-0417 tonight (2026-03-13)?

```sql
SELECT s.location FROM encoder_log e JOIN stations s ON s.station = e.station WHERE UPPER(TRIM(e.badge_written)) = 'B-0417' AND date(e.ts) = '2026-03-13';
```

**Answer:** `Donor Lounge`

### The courier’s crates

For the crates addressed to the Aurelian Trust (watch the messy spelling), take character 4 of each ref, ordered by crate, and join them into one word.

```sql
SELECT group_concat(SUBSTR(ref, 4, 1), '' ORDER BY crate) FROM manifest WHERE LOWER(TRIM(consignee)) = 'aurelian trust';
```

**Answer:** `LANTERN`

## The accusation

The thief is **Margot Vell** (Director of Donor Relations).

- **Dr. Imogen Hale**: Imogen Hale’s badge left by the Staff Entrance at 21:10, and her lanyard never came back. She has vault clearance, but she didn’t need to clone anyone’s badge to use it.
- **Theo Marsh**: Theo’s badge opened the Vault at 23:49, but 35 seconds earlier the same badge was at the Lobby Desk, four minutes’ walk away. Theo was at the desk. Someone else was carrying a copy.
- **Felix Ordway**: The LOCKDOWN ran under Felix’s account, but from T-07 in the Donor Lounge, after 17 failed password guesses. Felix’s lanyard never left the Server Closet.
- **Priya Raman**: Priya borrowed every book about Ashgrove she could find. That’s a scholar’s obsession, not a crime. She spent four minutes in the Donor Lounge asking for help, and at the blackout she was in the Reading Room with you.
- **Sam Kettering**: Which Sam? The custodian was mopping the Map Room at 23:47. The other Sam retired years ago. His revoked badge was used at the Loading Dock, but not by him.

> You type the phrase, and the Institute unlocks itself one door at a time.
>
> You find Margot Vell in the Donor Lounge, sitting very still beside crate CR-37, addressed to the Aurelian Trust. Under the gala programmes, wrapped in archival tissue, is the Ashgrove Codex.
>
> The Trust had pledged a fortune for a private sale the board had refused. Margot handled every one of its gifts. Tonight she guessed Felix’s password from the lounge terminal, cut the vault’s magnetic lock, ordered the lockdown, and walked into the Vault with a copy of Theo’s badge. When the Loading Dock refused a dead man’s badge, she hid the Codex in a crate the morning courier would have carried away.
>
> She hadn’t planned on a reader asleep in the Reading Room, or on that reader knowing SQL.
>
> Dawn comes up grey over the Fens. Case closed.
>
