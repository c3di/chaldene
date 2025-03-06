import CodeGenerator from './CodeGenerator';

export default class PythonCodeGenerator extends CodeGenerator {
  constructor() {
    super('Python');
  }

  public widgetValueToCodeLiteral(type: string, value: any): string {
    if (type === 'string') {
      if (value === null || value === undefined) {
        return quote('');
      }
      if (value.includes('\n')) {
        return multilineQuote(value);
      } else {
        return quote(value);
      }
    }

    if (type === 'boolean') {
      return value ? 'True' : 'False';
    }

    if (type === 'number') {
      if (value === null || value === undefined) {
        return '0';
      }
    }

    if (value === null || value === undefined) {
      return 'None';
    }

    if (type === 'tuple2') {
      return `(${value[0]}, ${value[1]})`;
    }

    if (type === 'string[]') {
      return `[${value.map(quote).join(', ')}]`;
    }
    return value;
  }
}
/**
 * Encode a string as a properly escaped Python string, complete with quotes.
 * @param {string} string Text to encode.
 * @return {string} Python string.
 */
function quote(str: string): string {
  str = str.replace(/\\/g, '\\\\').replace(/\n/g, '\\\n');

  // Follow the CPython behaviour of repr() for a non-byte string.
  let quote = "'";
  if (str.includes("'")) {
    if (!str.includes('"')) {
      quote = '"';
    } else {
      str = str.replace(/'/g, "\\'");
    }
  }
  return quote + str + quote;
}

/**
 * Encode a string as a properly escaped multiline Python string, complete
 * with quotes.
 * @param {string} string Text to encode.
 * @return {string} Python string.
 */
function multilineQuote(str: string): string {
  const lines = str.split(/\n/g).map(quote);
  // Join with the following, plus a newline:
  // + '\n' +
  return lines.join(" + '\\n' + \n");
}
