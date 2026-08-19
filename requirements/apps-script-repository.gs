/**
 * Landing Page Repository — Apps Script backend
 *
 * Deploy as: Extensions > Apps Script > Deploy > New deployment
 *   Type          Web app
 *   Execute as    Me
 *   Who has access  Anyone
 * Copy the /exec URL and paste it into ENDPOINT in outline-builder.html
 *
 * Also adds a "Landing Pages" menu with a health check that writes
 * every data problem to a `health` tab.
 */

var TABS = ['products','claims','objections','assets','testimonials','arcs','arc_steps','voice'];

/** Columns whose cell value is a comma separated list. */
var LIST_COLS = {
  awareness: 1, kills_objection: 1, eligible_sections: 1, crops: 1, copy_target: 1
};

/** Columns that should come back as numbers. */
var NUM_COLS = {
  strength: 1, severity: 1, position: 1, min_count: 1, max_count: 1,
  max_sections: 1, min_sections: 1, price: 1, use_count: 1
};

/** Columns that should come back as booleans. */
var BOOL_COLS = { droppable: 1 };


/* ---------------------------------------------------------------- serving */

function doGet(e) {
  var out = {};
  TABS.forEach(function (name) { out[name] = readTab(name); });
  out._fetched_at = new Date().toISOString();

  return ContentService
    .createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function readTab(name) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet) return [];

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var headers = values[0].map(function (h) { return String(h).trim(); });

  return values.slice(1)
    .filter(function (row) { return String(row[0]).trim() !== ''; })
    .map(function (row) {
      var obj = {};
      headers.forEach(function (key, i) {
        if (!key) return;
        obj[key] = coerce(key, row[i]);
      });
      return obj;
    });
}

function coerce(key, raw) {
  var val = (raw === null || raw === undefined) ? '' : raw;

  if (LIST_COLS[key]) {
    return String(val).split(',')
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s !== ''; });
  }
  if (NUM_COLS[key]) {
    var n = Number(val);
    return isNaN(n) ? null : n;
  }
  if (BOOL_COLS[key]) {
    var s = String(val).trim().toLowerCase();
    return s === 'true' || s === 'yes' || s === 'y' || s === '1';
  }
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val).trim();
}


/* ------------------------------------------------------------ health check */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Landing Pages')
    .addItem('Run health check', 'runHealthCheck')
    .addToUi();
}

function runHealthCheck() {
  var data = {};
  TABS.forEach(function (t) { data[t] = readTab(t); });

  var issues = [];
  function flag(level, tab, id, message) {
    issues.push([level, tab, id, message]);
  }

  var claims  = data.claims || [];
  var objs    = data.objections || [];
  var assets  = data.assets || [];
  var arcs    = data.arcs || [];
  var steps   = data.arc_steps || [];

  var objIds   = objs.map(function (o) { return o.objection_id; });
  var assetIds = assets.map(function (a) { return a.asset_id; });
  var claimIds = claims.map(function (c) { return c.claim_id; });

  /* --- duplicate ids --- */
  [['claims','claim_id',claimIds], ['objections','objection_id',objIds],
   ['assets','asset_id',assetIds]].forEach(function (set) {
    var seen = {};
    set[2].forEach(function (id) {
      if (seen[id]) flag('ERROR', set[0], id, 'Duplicate ' + set[1]);
      seen[id] = 1;
    });
  });

  /* --- claims --- */
  claims.forEach(function (c) {
    if (!c.benefit && c.scope === 'reason')
      flag('ERROR', 'claims', c.claim_id, 'Reason claim has no benefit');
    if (!c.awareness || !c.awareness.length)
      flag('ERROR', 'claims', c.claim_id, 'No awareness stages set');
    if (!c.strength)
      flag('ERROR', 'claims', c.claim_id, 'No strength set');
    if (c.proof && (!c.proof_source || !c.proof_reviewed))
      flag('ERROR', 'claims', c.claim_id, 'Proof with no source or review date');
    if (c.proof_reviewed && monthsSince(c.proof_reviewed) > 12)
      flag('WARN', 'claims', c.claim_id, 'Proof not reviewed in over 12 months');
    (c.kills_objection || []).forEach(function (o) {
      if (objIds.indexOf(o) < 0)
        flag('ERROR', 'claims', c.claim_id, 'kills_objection points at missing ' + o);
    });
    if (c.asset_id && assetIds.indexOf(c.asset_id) < 0)
      flag('ERROR', 'claims', c.claim_id, 'asset_id points at missing ' + c.asset_id);
  });

  /* --- one hero claim per product --- */
  var fives = {};
  claims.forEach(function (c) {
    if (c.strength === 5) fives[c.product_id] = (fives[c.product_id] || 0) + 1;
  });
  Object.keys(fives).forEach(function (p) {
    if (fives[p] > 2)
      flag('WARN', 'claims', p, fives[p] + ' claims rated 5. Rank them honestly.');
  });

  /* --- reason coverage --- */
  var reasons = {};
  claims.forEach(function (c) {
    if (c.scope === 'reason') reasons[c.product_id] = (reasons[c.product_id] || 0) + 1;
  });
  (data.products || []).forEach(function (p) {
    if ((reasons[p.product_id] || 0) < 4)
      flag('ERROR', 'claims', p.product_id, 'Fewer than 4 reason claims for this product');
  });

  /* --- objections --- */
  objs.forEach(function (o) {
    if (!o.rebuttal)
      flag('ERROR', 'objections', o.objection_id, 'No rebuttal written');
    var answered = claims.some(function (c) {
      return (c.kills_objection || []).indexOf(o.objection_id) > -1;
    });
    if (!answered && o.severity >= 4)
      flag('ERROR', 'objections', o.objection_id,
           'Severity ' + o.severity + ' and no claim answers it');
    else if (!answered)
      flag('WARN', 'objections', o.objection_id, 'No claim answers it');
  });

  /* --- arcs and steps --- */
  arcs.forEach(function (a) {
    var mine = steps.filter(function (s) { return s.arc_id === a.arc_id; })
                    .sort(function (x, y) { return x.position - y.position; });
    if (!mine.length) {
      flag('ERROR', 'arcs', a.arc_id, 'No arc_steps rows for this arc');
      return;
    }
    mine.forEach(function (s, i) {
      if (s.position !== i + 1)
        flag('ERROR', 'arc_steps', a.arc_id, 'Positions are not 1..n without gaps');
      if (!s.role_intent)
        flag('ERROR', 'arc_steps', a.arc_id + '/' + s.role, 'role_intent is blank');
      if (!s.eligible_sections || !s.eligible_sections.length)
        flag('ERROR', 'arc_steps', a.arc_id + '/' + s.role, 'No eligible_sections');
      if (s.repeat_on && s.repeat_on !== 'none' && s.eligible_sections.length < 2)
        flag('WARN', 'arc_steps', a.arc_id + '/' + s.role,
             'Repeatable role with only one layout. Every section will look the same.');
    });
    if (mine[0].droppable)
      flag('ERROR', 'arc_steps', a.arc_id, 'First position is droppable');
    if (mine[mine.length - 1].droppable)
      flag('ERROR', 'arc_steps', a.arc_id, 'Last position is droppable');
    if (!a.awareness || !a.awareness.length)
      flag('ERROR', 'arcs', a.arc_id, 'No awareness stages set');
  });

  /* --- stages with no arc --- */
  ['unaware','problem','solution','product','most'].forEach(function (st) {
    var has = arcs.some(function (a) { return (a.awareness || []).indexOf(st) > -1; });
    if (!has) flag('WARN', 'arcs', st, 'No arc serves this awareness stage');
  });

  writeHealth(issues);

  var errs = issues.filter(function (i) { return i[0] === 'ERROR'; }).length;
  SpreadsheetApp.getUi().alert(
    issues.length ? (errs + ' errors, ' + (issues.length - errs) + ' warnings. See the health tab.')
                  : 'Clean. No issues found.');
}

function writeHealth(issues) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName('health') || ss.insertSheet('health');
  sh.clear();
  sh.getRange(1, 1, 1, 5).setValues([['level', 'tab', 'id', 'issue', 'checked']])
    .setFontWeight('bold');
  if (!issues.length) {
    sh.getRange(2, 1).setValue('No issues found');
    return;
  }
  var stamp = new Date();
  var rows = issues.map(function (i) { return i.concat([stamp]); });
  sh.getRange(2, 1, rows.length, 5).setValues(rows);
  sh.setColumnWidth(4, 520);
  sh.getRange(2, 1, rows.length, 1)
    .setBackgroundObject(null);
}

function monthsSince(dateStr) {
  var d = new Date(dateStr);
  if (isNaN(d)) return 0;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}
