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
  
  #sync process
  add_to_cloud: (list_name) ->
    #manually create the request since the api shit is not working
    request_json = 
      path: "/tasks/v1/users/@me/lists"
      method: "POST"
      params: ""
      body:  title: list_name
    
    request = gapi.client.request(request_json)
    request.execute( (resp) -> 
      console.log(resp) 
      window.add_response = resp
    )  
  
  delete_from_cloud: (id) ->
    alert("delete from cloud")
  
  update_to_cloud: (tasklist) ->
    alert("update to cloud")
    
  
Deletion = Spine.Model.setup("Deletion", [ "deletion_id" ])
Deletion.extend Spine.Model.Local
DeletedList = Spine.Model.setup("DeletedList", [ "deletion_id" ])
DeletedList.extend Spine.Model.Local

List = Spine.Model.setup("List", [ "name", "description", "synced", "time" ])
List.extend Spine.Model.Local

List.extend
  #sync processes
  add_to_cloud: (list_name) ->
    #manually create the request since the api shit is not working
    request_json = 
      path: "/tasks/v1/users/@me/lists"
      method: "POST"
      params: ""
      body:  title: list_name
    
    request = gapi.client.request(request_json)
    request.execute( (resp) -> 
      console.log(resp) 
      window.add_response = resp
    
      #change all the ids of the local task with that task list id and also change that list's id
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
      body:  { id: tasklist.id, kind: "tasks#taskList", title: tasklist.title }
    
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
