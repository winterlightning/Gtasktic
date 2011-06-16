// Create the Task model.
var Task = Spine.Model.setup("Task", ["name", "done", "time", "duedate", "note", "order", "synced"]);

// Persist model between page reloads.
Task.extend(Spine.Model.Local);

Task.extend({
  // Return all active tasks.
  active: function(){
    return(this.select(function(item){ return !item.done; }));
  },
  
  // Return all done tasks.
  done: function(){
    return(this.select(function(item){ return !!item.done; }));    
  },
  
  // Clear all done tasks.
  destroyDone: function(){
    this.done().forEach(function(rec){ rec.destroy() });
  }
  
});

//Deletion queue for tasks
var Deletion = Spine.Model.setup("Deletion", ["deletion_id"]);
Deletion.extend(Spine.Model.Local); 