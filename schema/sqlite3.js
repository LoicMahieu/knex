
// sqlite3 Schema Grammar

var util = require('util');

module.exports = {
  
  wrapValue: function(value) {
    return (value !== '*' ? util.format('"%s"', value) : "*");
  },

  // The possible column modifiers.
  modifiers: ['Nullable', 'Default', 'Increment'],
  
  // Compile the query to determine if a table exists.
  compileTableExists: function() {
    return "select * from sqlite_master where type = 'table' and name = ?";
  },

  // Compile a create table command.
  compileCreateTable: function(blueprint, command) {
    var columns = this.getColumns(blueprint).join(', ');
    var sql = 'create table ' + this.wrapTable(blueprint) + ' (' + columns;
    
    // SQLite forces primary keys to be added when the table is initially created
    // so we will need to check for a primary key commands and add the columns
    // to the table's declaration here so they can be created on the tables.
    sql += this.addForeignKeys(blueprint);
    sql += this.addPrimaryKeys(blueprint) || '';
    sql +=')';
    return sql;
  },

  // Get the foreign key syntax for a table creation statement.
  // Once we have all the foreign key commands for the table creation statement
  // we'll loop through each of them and add them to the create table SQL we
  // are building, since SQLite needs foreign keys on the tables creation.
  addForeignKeys: function(blueprint) {
    var sql = '';
    var foreigns = this.getCommandsByName(blueprint, 'foreign');
    for (var i = 0, l = foreigns.length; i < l; i++) {
      var foreign = foreigns[i];
      var on = this.wrapTable(foreign.on);
      var columns = this.columnize(foreign.columns);
      var onColumns = this.columnize(foreign.references);
      sql += ', foreign key(' + columns + ') references ' + on + '(' + onColumns + ')';
    }
    return sql;
  },
  
  // Get the primary key syntax for a table creation statement.
  addPrimaryKeys: function(blueprint) {
    var primary = this.getCommandByName(blueprint, 'primary');
    if (primary) {
      var columns = this.columnize(primary.columns);
      return ', primary key (' + columns + ')';
    }
  },

  // Compile alter table commands for adding columns
  compileAdd: function(blueprint, command) {
    var table = this.wrapTable(blueprint);
    var columns = this.prefixArray('add column', this.getColumns(blueprint));
    var statements = [];
    for (var i = 0, l = columns.length; i < l; i++) {
      statements.push('alter table ' + table + ' ' + columns[i]);
    }
    return statements;
  },

  // Compile a unique key command.
  compileUnique: function(blueprint, command) {
    var columns = this.columnize(command.columns);
    var table = this.wrapTable(blueprint);
    return 'create unique index ' + command.index + ' on ' + table + ' (' + columns + ')';
  },
  
  // Compile a plain index key command.
  compileIndex: function(blueprint, command) {
    var columns = this.columnize(command.columns);
    var table = this.wrapTable(blueprint);
    return 'create index ' + command.index + ' on ' + table + ' (' + columns + ')';
  },
  
  // Compile a foreign key command.
  compileForeign: function(blueprint, command) {
    // Handled on table creation...
  },
  
  // Compile a drop table command.
  compileDropTable: function(blueprint, command) {
    return 'drop table ' + this.wrapTable(blueprint);
  },

  // Compile a drop table (if exists) command.
  compileDropTableIfExists: function(blueprint, command) {
    return 'drop table if exists ' + this.wrapTable(blueprint);
  },
  
  // Compile a drop column command.
  compileDropColumn: function(blueprint, command) {
    throw new Error("Drop column not supported for SQLite.");
  },
  
  // Compile a drop unique key command.
  compileDropUnique: function(blueprint, command) {
    return 'drop index ' + command.index;
  },
  
  // Compile a drop index command.
  compileDropIndex: function(blueprint, command) {
    return 'drop index ' + command.index;
  },

  // Compile a rename table command.
  compileRename: function(blueprint, command) {
    return 'alter table ' + this.wrapTable(blueprint) + ' rename to ' + this.wrapTable(command.to);
  },
  
  // Create the column definition for a string type.
  typeString: function(column) {
    return 'varchar';
  },
  
  // Create the column definition for a text type.
  typeText: function(column) {
    return 'text';
  },
  
  // Create the column definition for a integer type.
  typeInteger: function(column) {
    return 'integer';
  },
  
  // Create the column definition for a float type.
  typeFloat: function(column) {
    return 'float';
  },
  
  // Create the column definition for a decimal type.
  typeDecimal: function(column) {
    return 'float';
  },
  
  // Create the column definition for a boolean type.
  typeBoolean: function(column) {
    return 'tinyint';
  },
  
  // Create the column definition for a enum type.
  typeEnum: function(column) {
    return 'varchar';
  },
  
  // Create the column definition for a date type.
  typeDate: function(column) {
    return 'date';
  },
  
  // Create the column definition for a date-time type.
  typeDateTime: function(column) {
    return 'datetime';
  },
  
  // Create the column definition for a time type.
  typeTime: function(column) {
    return 'time';
  },
  
  // Create the column definition for a timestamp type.
  typeTimestamp: function(column) {
    return 'datetime';
  },
  
  // Create the column definition for a binary type.
  typeBinary: function(column) {
    return 'blob';
  },
  
  // Get the SQL for a nullable column modifier.
  modifyNullable: function(blueprint, column) {
    return column.nullable ? ' null' : ' not null';
  },
  
  // Get the SQL for a default column modifier.
  modifyDefault: function(blueprint, column) {
    if (column.defaultValue) {
      return " default '" + this.getDefaultValue(column.defaultValue) + "'";
    }
  },
  
  // Get the SQL for an auto-increment column modifier.
  modifyIncrement: function(blueprint, column) {
    if (column.type == 'integer' && column.autoIncrement) {
      return ' primary key autoincrement';
    }
  }

};
