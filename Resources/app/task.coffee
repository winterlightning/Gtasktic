Task = Spine.Model.setup("Task", [ "name", "done", "time", "duedate", "note", "order", "synced", "listid" ]) #nestlevel from 0 to whatever
Task.extend Spine.Model.Local
Task.extend 
  active: (id) ->
    @select (item) ->
      not item.done and (item.listid == id)
  
  done: (id) ->
    @select (item) ->
      not not item.done and (item.listid == id)
  
  list: (id) ->
    @select (item) ->
      item.listid == id
  
  destroyDone: (id) ->
    @done(id).forEach (rec) ->
      Deletion.create deletion_id: rec.id  if rec.synced == true
      rec.destroy()
  
  toCloudStructure: (task) ->
    data = { title: task.name }
    data.due = moment(a.duedate).format("YYYY-MM-DD")+"T12:00:00.000Z" if task.duedate?
    data.notes = task.note if task.note?
    if task.done
      data.status = "completed"
    else
      data.status = "needsAction"
      
    data
  
  #sync process
  add_to_cloud: (task) -> #tasks needs to at least have a name and listid attribute
    #manually create the request since the api shit is not working
    data = Task.toCloudStructure(task)
    
    request_json = 
      path: "/tasks/v1/lists/#{ task.listid }/tasks"
      method: "POST"
      params: ""
      body: data
    
    request = gapi.client.request(request_json)
    request.execute( (resp) -> 
      console.log(resp) 
      window.add_response = resp
      
      #response need to update the local with correct id
      old_id = task.id
      
      data = { name: task.name, time: task.time, listid: task.listid}
      data.duedate = task.duedate if task.duedate?
      data.note = task.note if task.note?
      
      new_task = Task.init( data )
      new_task.id = resp.id
      new_task.save()
      
      task.destroy()
      
    )
  
  delete_from_cloud: (task) ->
    request_json = 
      path: "/tasks/v1/lists/#{ task.listid }/tasks/#{ task.id }"
      method: "DELETE"
      params: ""
      body: ""

    request = gapi.client.request(request_json)
    request.execute( (resp) -> 
      console.log(resp) 
      window.delete_response = resp
    )
  
  update_to_cloud: (task) ->
    data = Task.toCloudStructure(task)
    data.id = task.id
    
    request_json = 
      path: "/tasks/v1/lists/#{ task.listid }/tasks/#{ task.id }"
      method: "PUT"
      params: ""
      body: data
    
    request = gapi.client.request(request_json)
    request.execute( (resp) -> 
      console.log(resp) 
      window.update_response = resp
    )    
  
  update_to_local: (task) ->
    alert("update to local")
   
Deletion = Spine.Model.setup("Deletion", [ "deletion_id" ])
Deletion.extend Spine.Model.Local
DeletedList = Spine.Model.setup("DeletedList", [ "deletion_id" ])
DeletedList.extend Spine.Model.Local

List = Spine.Model.setup("List", [ "name", "description", "synced", "time" ])
List.extend Spine.Model.Local

List.extend
  #sync processes
  
  #add a cloud list to your local storage
  add_from_cloud: (tasklist) ->
    new_tasklist = List.init( name: tasklist.title, time: (new Date()).toString() )
    new_tasklist.id = tasklist.id
    new_tasklist.save()
    
    window.App.render_new new_tasklist
  
  add_to_cloud: (tasklist) ->
    if tasklist.name is "@default"
      return true
    
    #manually create the request since the api shit is not working
    request_json = 
      path: "/tasks/v1/users/@me/lists"
      method: "POST"
      params: ""
      body:  title: tasklist.name
    
    request = gapi.client.request(request_json)
    request.execute( (resp) -> 
      console.log(resp) 
      window.add_response = resp
    
      #destroy the old tasklist and create one with id corresponding to the new one
      old_id = tasklist.id
      
      new_tasklist = List.init( name: tasklist.name, time: (new Date()).toString() )
      new_tasklist.id = resp.id
      new_tasklist.save()
      
      #change all the ids of the local task with that task list id
      for task in Task.findAllByAttribute("listid", old_id)
        task.listid = new_tasklist.id
        task.save()
        
      window.App.render_new new_tasklist
      tasklist.destroy()
    )  
  
  delete_from_cloud: (id) ->
    request_json = 
      path: "/tasks/v1/users/@me/lists/"+ id
      method: "DELETE"
      params: ""
      body:  ""
    
    request = gapi.client.request(request_json)
    request.execute( (resp) -> 
      console.log(resp) 
      window.delete_response = resp
    )  
  
  update_to_cloud: (tasklist) ->
    request_json = 
      path: "/tasks/v1/users/@me/lists/"+tasklist.id
      method: "PUT"
      params: ""
      body:  { id: tasklist.id, kind: "tasks#taskList", title: tasklist.name }
    
    request = gapi.client.request(request_json)
    request.execute( (resp) -> 
      console.log(resp) 
      window.update_response = resp
    )  

Version = Spine.Model.setup("Version", [ "number" ])
Version.extend Spine.Model.Local
Initialized = Spine.Model.setup("Initialized", [ "flag" ])
Initialized.extend Spine.Model.Local

Token = Spine.Model.setup("Token", [ "current_token", "expiration", "refresh_token" ])
Token.extend Spine.Model.Local

TestStorage = Spine.Model.setup("TestStorage", [ "stored" ])
TestStorage.extend Spine.Model.Local

exports = this
exports.Deletion = Deletion
exports.Task = Task
exports.DeletedList = DeletedList
exports.List = List
exports.Version = Version
exports.Initialized = Initialized
exports.Token = Token
