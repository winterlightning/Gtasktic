(function() {
  (function($) {
    var db, db_path;
    db_path = Titanium.Filesystem.getFile(Titanium.Filesystem.getApplicationDataDirectory(), "gtasktic.db");
    db = Titanium.Database.openFile(db_path);
    String.prototype.replaceAll = function(strReplace, strWith) {
      var reg;
      reg = new RegExp(strReplace, "ig");
      return this.replace(reg, strWith);
    };
    db.execute("CREATE TABLE IF NOT EXISTS keyval ( key TEXT, value TEXT )");
    return Spine.Model.Local = {
      extended: function() {
        this.sync(this.proxy(this.saveLocal));
        return this.fetch(this.proxy(this.loadLocal));
      },
      saveLocal: function() {
        var result;
        result = JSON.stringify(this);
        db.execute("DELETE from keyval where key ='" + this.name + "'");
        result = result.replaceAll("'", "''");
        return db.execute("INSERT INTO keyval (key, value) VALUES ('" + this.name + "', '" + result + "')");
      },
      loadLocal: function() {
        var result, resultSet;
        resultSet = db.execute("SELECT value FROM keyval WHERE key = '" + this.name + "' LIMIT 1");
        result = resultSet.field(0);
        if (!result) {
          return;
        }
        result = JSON.parse(result);
        return this.refresh(result);
      }
    };
  })(jQuery);
}).call(this);
