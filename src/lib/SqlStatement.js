const { PgLazyError } = require('../utils');
const minify = require('pg-minify');
class SqlStatement {
  constructor (strings, values = []) {
    this.strings = strings;
    this.values = [];
    this.bindings = [];
    this._addValues(values);
  }

  static check (statement) {
    if (!(statement instanceof SqlStatement)) {
      throw new PgLazyError('must build query with sql or _raw');
    }
  }

  append (statement) {
    if (!statement) {
      return this;
    }
    this.constructor.check(statement);
    this.strings = this.strings.slice(0, this.strings.length - 1)
      .concat([
        `${this.strings[this.strings.length - 1]} ${statement.strings[0]}`,
        ...statement.strings.slice(1)
      ]);
    this._addValues(statement.values);
    return this;
  }

  named (name) {
    this.name = name;
    return this;
  }

  get text () {
    const text = this.strings.reduce((prev, curr, i) => {
      const v = this.values[this.bindings[i - 1]];
      // TODO: Use Map for reverse lookup
      const binding = this.values.indexOf(v) + 1;
      return `${prev}$${binding}${curr}`;
    });
    return minify(text);
  }

  _addValues (values) {
    for (const v of values) {
      const i = this.values.indexOf(v);
      if (i > -1) {
        this.bindings.push(i);
      } else {
        this.values.push(v);
        this.bindings.push(this.values.length - 1);
      }
    }
  }
}
SqlStatement.sql = (strings, ...values) => new SqlStatement(strings, values);
SqlStatement._raw = (strings, ...values) => {
  const text = strings.reduce((prev, chunk, i) => prev + values[i - 1] + chunk);
  return new SqlStatement([text]);
};

module.exports = SqlStatement;
