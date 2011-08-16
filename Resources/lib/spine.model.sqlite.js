(function($){
	db_path = Titanium.Filesystem.getFile(Titanium.Filesystem.getApplicationDataDirectory(), 'gtasktic.db');
	db = Titanium.Database.openFile( db_path );
	db.execute("CREATE TABLE IF NOT EXISTS keyval ( key TEXT, value TEXT )");
	
	Spine.Model.Local = {
	  extended: function(){
	    this.sync(this.proxy(this.saveLocal));
	    this.fetch(this.proxy(this.loadLocal));
	  },
	    
	  saveLocal: function(){
	    var result = JSON.stringify(this);
	    db.execute("DELETE from keyval where key ='" + this.name+"'");
	    db.execute("INSERT INTO keyval (key, value) VALUES ('" +this.name +"', '"+ result +"')");
	  },
	
	  loadLocal: function(){
	  	var resultSet = db.execute("SELECT value FROM keyval WHERE key = '"+ this.name +"' LIMIT 1");
	    result = resultSet.field(0);
	    if ( !result ) return;
	    var result = JSON.parse(result);
	    this.refresh(result);
	  }
   };
		
})(jQuery);