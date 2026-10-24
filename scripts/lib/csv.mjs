// CSV for the gates that read a CSV example. One reader, so the example check and a contract's own check cannot
// disagree about what the lines of a file are.
//
// The network writes CSV the way the ledger's CSV twin is written: every line, the header included, ends with a line
// feed, and a field is quoted only where it must be (RFC 4180: a comma, a double quote or a line break inside it), an
// inner double quote doubled. This reader takes exactly that and reports, rather than repairs, anything else: a
// byte-order mark, a carriage return outside a quoted field, a blank line, a double quote inside an unquoted field or
// after a closing one, a quoted field never closed, and a text whose last line has no line feed.

/**
 * The records of a CSV text.
 *
 * Returns `{ records, lines, problems }`: `records[k]` is a record's fields as text, `lines[k]` the line it starts on,
 * and each problem names its line.
 */
export function parseCsv(text) {
  const records = [];
  const lines = [];
  const problems = [];
  if (text.length === 0) {
    problems.push('the text is empty: a CSV file has at least its header line');
    return { records, lines, problems };
  }

  let i = 0;
  if (text.charCodeAt(0) === 0xfeff) {
    problems.push('line 1: begins with a byte-order mark');
    i = 1;
  }

  let line = 1;
  let recordLine = 1;
  let record = [];
  let field = '';
  // `start`: nothing of the current field read yet; `bare`: inside an unquoted field; `quoted`: inside a quoted one;
  // `closed`: just after a quoted field's closing quote, where only a comma or a line feed may follow.
  let state = 'start';

  const endRecord = () => {
    record.push(field);
    if (record.length === 1 && record[0] === '' && state === 'start') {
      problems.push(`line ${recordLine}: is blank`);
    } else {
      records.push(record);
      lines.push(recordLine);
    }
    record = [];
    field = '';
    state = 'start';
  };

  for (; i < text.length; i += 1) {
    const c = text[i];
    if (state === 'quoted') {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          state = 'closed';
        }
      } else {
        if (c === '\n') line += 1;
        field += c;
      }
      continue;
    }
    if (c === ',') {
      record.push(field);
      field = '';
      state = 'start';
    } else if (c === '\n') {
      endRecord();
      line += 1;
      recordLine = line;
    } else if (c === '\r') {
      problems.push(`line ${line}: a carriage return outside a quoted field (every line ends with a line feed alone)`);
    } else if (c === '"') {
      if (state === 'start') {
        state = 'quoted';
      } else {
        problems.push(`line ${line}: a double quote ${state === 'closed' ? 'after a closing quote' : 'inside an unquoted field'}`);
      }
    } else if (state === 'closed') {
      problems.push(`line ${line}: text after a quoted field's closing quote`);
      field += c;
      state = 'bare';
    } else {
      field += c;
      state = 'bare';
    }
  }

  if (state === 'quoted') {
    problems.push(`line ${recordLine}: a quoted field is never closed`);
    endRecord();
  } else if (!text.endsWith('\n')) {
    problems.push(`line ${line}: the last line does not end with a line feed`);
    endRecord();
  }
  return { records, lines, problems };
}

/**
 * The lines of a CSV text as records keyed by `header`, which the first line must name exactly, in its order.
 *
 * Returns `{ rows, lines, problems }`: `rows[k]` maps each column to its field, `lines[k]` is its line, and a line
 * whose field count is not the header's is a problem rather than a row.
 */
export function csvTable(text, header) {
  const { records, lines: recordLines, problems } = parseCsv(text);
  const rows = [];
  const lines = [];
  if (records.length === 0) {
    problems.push('no header line');
    return { rows, lines, problems };
  }

  const [first, ...rest] = records;
  if (first.length !== header.length || first.some((name, k) => name !== header[k])) {
    problems.push(`line ${recordLines[0]}: the header is ${JSON.stringify(first.join(','))}, not ${JSON.stringify(header.join(','))}`);
  }
  rest.forEach((record, index) => {
    const at = recordLines[index + 1];
    if (record.length !== header.length) {
      problems.push(`line ${at}: ${record.length} field(s) where the header names ${header.length}`);
      return;
    }
    rows.push(Object.fromEntries(header.map((name, k) => [name, record[k]])));
    lines.push(at);
  });
  return { rows, lines, problems };
}
