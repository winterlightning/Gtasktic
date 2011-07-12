// Create the Task model.
var Task = Spine.Model.setup("Task", ["name", "done", "time", "duedate", "note", "order", "synced", "listid"]);

// Persist model between page reloads.
Task.extend(Spine.Model.Local);

Task.extend({
  // Return all active tasks.
  active: function(id){
    return(this.select(function(item){ return !item.done && (item.listid == id); }));
  },
  
  // Return all done tasks.
  done: function(id){
    return(this.select(function(item){ return !!item.done && (item.listid == id); }));    
  },
  
  list: function(id) {
  	return(this.select(function(item){ return (item.listid == id); }));
  },
  
  // Clear all done tasks.
  destroyDone: function(id){
    this.done(id).forEach(function(rec){ 
    	if (rec.synced == true) {
      		Deletion.create({ deletion_id: rec.id });
      	};
    	rec.destroy() 
    });
  }
  
});

//Deletion queue for tasks
var Deletion = Spine.Model.setup("Deletion", ["deletion_id"]);
Deletion.extend(Spine.Model.Local); 

//Key storage for validation key storing
var Key = Spine.Model.setup("Key", ["url"]);
Key.extend(Spine.Model.Local); 

var List = Spine.Model.setup("List", ["name"]);
List.extend(Spine.Model.Local);