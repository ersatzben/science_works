# The signatory form (open letters)

How people add their support to an open letter, where those submissions go, and
how you get an approved name onto the page. Nothing here is automated: the sheet
is a **review queue**, and a human decides who is published.

## What the reader sees

At the top of an open letter, inside the summary box, a sentence ends with a
link: *"…are welcome to complete the form here."* Clicking **here** opens a form
in place — signatory type (individual or organisation), signatory name, contact
name, contact email, and an optional newsletter tick.

It is one component, `src/components/SignatoryForm.astro`, dropped into the MDX
on its own line:

```mdx
import SignatoryForm from '../../components/SignatoryForm.astro';

<SignatoryForm
  lead="To add your support to the letter, individuals and organisations are welcome to"
  subject="New signatory: open letter on UKRI eligibility"
/>
```

Put it on its **own line** with blank lines around it, never mid-sentence — the
lead-in text is a prop for a reason, explained in the component's header.

## Where submissions go

The site is static, with no server of its own, so the form has to post somewhere
else. There are two possible destinations and the component picks whichever is
configured:

| | Used when | Lands in |
| --- | --- | --- |
| **Google Sheet** (preferred) | `SHEET_ENDPOINT` is filled in | A spreadsheet you review |
| **Web3Forms** (fallback) | `SHEET_ENDPOINT` is empty | An email inbox |

The fallback exists so the form still works before the sheet is set up. **Once
the sheet is live, no notification emails are sent at all** — which is the
point, since a popular letter would otherwise bury the inbox.

## Setting up the sheet (one-off)

Do this in the Science Works Google workspace, **not** a personal account. If it
is deployed under someone's personal login and they leave, the form dies and
nobody can reach the data.

1. Create a Google Sheet in the shared workspace — call it something like
   *Open letter signatories*. You don't need to add any columns; the script
   creates them on the first submission.
   If you set the columns up by hand instead, that is fine — see *Your columns*
   below. The script writes to the tab named `Signatories` if one exists, and
   otherwise to the **first tab** in the spreadsheet.
2. In that sheet: **Extensions → Apps Script**.
3. Delete whatever is in the editor and paste in the entire contents of
   `docs/signatory-sheet.gs` from this repo. Save.
4. **Deploy → New deployment**. Choose type **Web app**, then set:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**

   "Anyone" is required — visitors to science.works are not signed in to Google,
   so the endpoint has to accept anonymous requests. It only ever appends rows;
   it cannot read the sheet back out.
5. Google will ask you to authorise the script. It is your own script writing to
   your own sheet, so the warning screen is expected — click through *Advanced →
   Go to (project name)*.
6. Copy the **Web app URL**. It ends in `/exec`.
7. Paste it into `SHEET_ENDPOINT` near the top of
   `src/components/SignatoryForm.astro`, commit, and deploy the site.

Test it by submitting the form on the live staging site and checking a row
appears. If you later edit the script, you must **Deploy → Manage deployments →
edit → New version** for the change to take effect; saving alone is not enough.

## Your columns

The script matches values to columns by **reading the header row**, not by
position, so you can name and order columns however you like. Header text is
compared with case, spaces and punctuation ignored — `Newsletter?`, `newsletter`
and `Newsletter opt-in` all match the same field.

| Field | Header names it will match |
| --- | --- |
| When it arrived | `Timestamp`, `Date`, `Date received` |
| Which letter | `Letter`, `Open letter` |
| Individual/organisation | `Signatory type`, `Type` |
| Who is signing | `Signatory name`, `Name` |
| Who submitted it | `Contact name` |
| Their email | `Contact email`, `Email`, `Email address` |
| Newsletter tick | `Newsletter`, `Newsletter opt-in` |
| Your review column | `Status`, `Review`, `Approved` |

**A field with no matching column is simply not recorded** — it is never pushed
into a neighbouring column. Add the column later and it starts being filled with
no code change.

Two columns are worth having that a hand-built sheet usually lacks:

- **Status** — the review column. Without it you have nowhere to track who you
  have approved, which is the whole workflow.
- **Letter** — lets one sheet collect for every open letter you publish, rather
  than needing a new sheet each time.

## Reviewing and publishing

Each submission becomes one row, with the Status column set to `Pending`.
Change it to `Approved` or `Rejected` as you work through them — the script never
reads or rewrites existing rows, so the column is yours.

To publish an approved signatory, edit the letter's `.mdx` by hand and add their
name to the signatory list. There is deliberately no automatic path from the
sheet to the page.

## Things to know

- **The endpoint is public.** Anyone viewing the page source can see it and post
  to it. There is a hidden honeypot field that catches naive bots, and your
  manual review catches the rest, so junk is an annoyance rather than a risk. If
  it ever gets bad, Cloudflare Turnstile is free and works on any host.
- **You are storing personal data** — names and email addresses. The privacy
  page needs a line covering what is collected and how long it is kept.
- **The newsletter tick** subscribes via the same Brevo endpoint the footer
  signup uses, separately from the sheet, and never blocks the submission.
- **Without JavaScript** the form still works: it shows open by default and
  submits as an ordinary form post, which the script reads just the same.
