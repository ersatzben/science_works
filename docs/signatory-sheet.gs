/**
 * Science Works — open-letter signatory collector.
 *
 * THIS FILE IS NOT PART OF THE BUILD. It is kept in the repo so the code is
 * version-controlled and reviewable, but it runs inside Google Apps Script:
 * paste it into the script editor of the collecting spreadsheet and deploy it
 * as a web app. See docs/signatory-form.md for the click-by-click steps.
 *
 * It receives a POST from the signatory form on science.works and appends one
 * row per submission. Nothing is published anywhere automatically — the sheet
 * is a review queue, and a human decides who goes on the page.
 */

// Tab the rows are written to. If no tab of this name exists, the FIRST tab in
// the spreadsheet is used — so a sheet you set up by hand works untouched.
const SHEET_NAME = 'Signatories';

// Columns written to a sheet that has no header row yet.
const HEADERS = [
  'Timestamp',
  'Letter',
  'Signatory type',
  'Signatory name',
  'Contact name',
  'Contact email',
  'Newsletter',
  'Status',
];

/**
 * Each value is matched to a column by READING THE HEADER ROW, never by
 * position. That means you can name your columns what you like, reorder them,
 * or add your own, and submissions still land in the right place — the one
 * failure mode this avoids is silent, and silent corruption of a signatory list
 * is the worst thing that could happen here.
 *
 * Header text is compared with case, spaces and punctuation stripped, so
 * "Newsletter?", "newsletter" and "Newsletter opt-in" all match. A field whose
 * column is absent is simply not recorded; add the column later and it starts
 * being filled with no code change.
 */
const COLUMNS = [
  { key: 'timestamp',      aliases: ['timestamp', 'date', 'datereceived', 'received'] },
  { key: 'letter',         aliases: ['letter', 'openletter', 'which letter'] },
  { key: 'signatory_type', aliases: ['signatorytype', 'type'] },
  { key: 'signatory_name', aliases: ['signatoryname', 'name'] },
  { key: 'contact_name',   aliases: ['contactname'] },
  { key: 'contact_email',  aliases: ['contactemail', 'email', 'emailaddress', 'contactemailaddress'] },
  { key: 'newsletter',     aliases: ['newsletter', 'newsletteroptin', 'signuptonewsletter'] },
  { key: 'status',         aliases: ['status', 'review', 'approved'] },
];

// "Contact email address" → "contactemailaddress"; "Newsletter?" → "newsletter".
function normaliseHeader(h) {
  return String(h == null ? '' : h).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Required fields. A submission missing any of them is rejected with a message
// the form shows the visitor, rather than being silently dropped.
const REQUIRED = ['signatory_name', 'contact_name', 'contact_email'];

function doPost(e) {
  try {
    const data = readSubmission(e);

    // Honeypot: a real person never sees this field, so anything in it is a
    // bot. Answer success so the bot doesn't retry or probe for the real check.
    if (String(data.botcheck || '').trim()) return json({ success: true });

    const missing = REQUIRED.filter((k) => !String(data[k] || '').trim());
    if (missing.length) {
      return json({ success: false, message: 'Please complete all the required fields.' });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(data.contact_email).trim())) {
      return json({ success: false, message: 'That email address does not look right.' });
    }

    appendRow(data);
    return json({ success: true });
  } catch (err) {
    // Never leak an internal error to the page; log it for whoever is on call.
    console.error(err);
    return json({
      success: false,
      message: 'Could not record your support. Please email contact@science.works.',
    });
  }
}

// Visiting the /exec URL in a browser should say something human rather than
// throwing a script error.
function doGet() {
  return json({ ok: true, message: 'Science Works signatory endpoint.' });
}

/**
 * Accepts both shapes the form can send:
 *   • JSON body as text/plain — what the page's JavaScript sends. text/plain
 *     keeps it a CORS "simple request", so no preflight is issued. That matters
 *     because Apps Script exposes doPost/doGet but no doOptions, and therefore
 *     cannot answer a preflight at all.
 *   • urlencoded form fields — what a native form POST sends when the visitor
 *     has JavaScript disabled. Apps Script parses these into e.parameter.
 */
function readSubmission(e) {
  if (e && e.postData && e.postData.contents) {
    const raw = e.postData.contents;
    try {
      return JSON.parse(raw);
    } catch (err) {
      // Not JSON — fall through to the parsed form fields below.
    }
  }
  return (e && e.parameter) || {};
}

function appendRow(data) {
  const sheet = getSheet();

  // A sheet nobody has set up by hand gets our default header row.
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = {
    timestamp: new Date(),
    letter: String(data.letter || '').trim(),
    signatory_type: String(data.signatory_type || '').trim(),
    signatory_name: String(data.signatory_name || '').trim(),
    contact_name: String(data.contact_name || '').trim(),
    contact_email: String(data.contact_email || '').trim(),
    newsletter: String(data.newsletter || '').trim() ? 'Yes' : 'No',
    status: 'Pending',        // your review column — change to Approved/Rejected
  };

  // Place each value under the column whose header it matches. Anything the
  // sheet has no column for is dropped rather than pushed into a neighbour.
  const row = new Array(headers.length).fill('');
  headers.forEach(function (header, i) {
    const norm = normaliseHeader(header);
    const match = COLUMNS.filter(function (c) { return c.aliases.indexOf(norm) !== -1; })[0];
    if (match) row[i] = values[match.key];
  });

  sheet.appendRow(row);
}

// Prefer the tab named SHEET_NAME; otherwise use the first tab, which is the
// one someone setting this up by hand will have put their columns on. Only
// create a tab when the spreadsheet is genuinely empty.
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0] || ss.insertSheet(SHEET_NAME);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
