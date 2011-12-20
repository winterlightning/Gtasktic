Finished = Spine.Model.setup("Finished", [ "name", "done", "time", "duedate", "note", "order", "synced", "listid", "time_finished" ])
Finished.extend Spine.Model.Local

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
  
  logDone: ( id ) ->
    @done(id).forEach (rec) ->
      Deletion.create deletion_id: rec.id  if rec.synced == true
      Finished.create 
        name: rec.name
        note: rec.note
        listid: rec.listid
        time_finished: moment().format('MM/DD/YYYY')
      rec.destroy()
  
  toCloudStructure: (task) ->
    data = { title: task.name }
    data.due = moment(task.duedate).format("YYYY-MM-DD")+"T12:00:00.000Z" if task.duedate? and task.duedate isnt ""
    data.notes = task.note if task.note? and task.note isnt ""
    if task.done
      data.status = "completed"
    else
      data.status = "needsAction"
      
    data
  
  add_from_cloud: (value, callback) ->
    if value.title is ""
      return true
    
    duedate = null
    duedate = (new Date(value.due)).format("mm/dd/yyyy")  if value.hasOwnProperty("due")    
    
    task = Task.init(
      name: value.title
      time: ( moment(value.updated).add('milliseconds', window.time_difference) ).toString()
      synced: true
      done: (value.status == "completed")
      duedate: duedate
      listid: value.listid
    )
    task.id = value.id
    task.note = value.notes  if value.hasOwnProperty("notes")
    task.save()
  
  #sync process
  add_to_cloud: (task, callback) -> #tasks needs to at least have a name and listid attribute
    #manually create the request since the api shit is not working
    data = Task.toCloudStructure(task)
    
    request_json = 
      path: "/tasks/v1/lists/#{ task.listid }/tasks"
      method: "POST"
      params: ""
      body: data
    
    request = gapi.client.request(request_json)
    
    #increment the incrementor to keep track of outstanding requests
    window.incrementer[task.listid] = window.incrementer[task.listid] + 1
    
    request.execute( (resp) -> 
      console.log(resp) 
      window.add_response = resp
      
      #response need to update the local with correct id
      old_id = task.id
      
      data = { name: task.name, time: ( moment(resp.updated) + window.time_difference ).toString(), listid: task.listid, order: task.order, synced: true}
      data.duedate = task.duedate if task.duedate?
      data.note = task.note if task.note?
      
      new_task = Task.init( data )
      new_task.id = resp.id
      new_task.save()
      
      task.destroy()
      
      window.incrementer[task.listid] = window.incrementer[task.listid] - 1
      callback(new_task)
    )
  
  delete_from_cloud: (task, callback) ->
    request_json = 
      path: "/tasks/v1/lists/#{ task.listid }/tasks/#{ task.id }"
      method: "DELETE"
      params: ""
      body: ""

    request = gapi.client.request(request_json)
    request.execute( (resp) -> 
      console.log(resp) 
      window.delete_response = resp
      
      callback()
    )
  
  update_to_cloud: (task, callback) ->
    data = Task.toCloudStructure(task)
    data.id = task.id
    
    window.updatedata = data
    
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
  
  update_to_local: (task, callback) ->
    local_task = Task.find(task.id)
    
    duedate = null
    duedate = (new Date(task.due)).format("mm/dd/yyyy")  if task.hasOwnProperty("due")        
    
    local_task.updateAttributes
      name: task.title
      time: moment(task.updated).toString()
      synced: true
      done: (task.status == "completed")
      duedate: duedate
      listid: task.listid
   
Deletion = Spine.Model.setup("Deletion", [ "deletion_id", "listid" ])
Deletion.extend Spine.Model.Local
DeletedList = Spine.Model.setup("DeletedList", [ "deletion_id" ])
DeletedList.extend Spine.Model.Local

List = Spine.Model.setup("List", [ "name", "description", "synced", "time" ])
List.extend Spine.Model.Local

List.extend
  #sync processes
  
  #add a cloud list to your local storage
  add_from_cloud: (tasklist, callback ) ->
    new_tasklist = List.init( name: tasklist.title, time: (new Date()).toString() )
    new_tasklist.id = tasklist.id
    new_tasklist.synced = true
    new_tasklist.save()
    
    callback(new_tasklist)

  add_to_cloud: (tasklist, callback) ->
    if tasklist.id is "@default"
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
      
      new_tasklist = List.init( name: tasklist.name, time: (new Date()).toString(), synced: true )
      new_tasklist.id = resp.id
      new_tasklist.save()
      
      #change all the ids of the local task with that task list id
      for task in Task.findAllByAttribute("listid", old_id)
        task.listid = new_tasklist.id
        task.save()
        
      tasklist.destroy()
      
      callback(new_tasklist)
    )  
  
  delete_from_cloud: (id, callback) ->
    request_json = 
      path: "/tasks/v1/users/@me/lists/"+ id
      method: "DELETE"
      params: ""
      body:  ""
    
    request = gapi.client.request(request_json)
    request.execute( (resp) -> 
      console.log(resp) 
      window.delete_response = resp
      
      callback()
    )  
  
    #delete all it's children tasks too!!
  
  update_to_cloud: (tasklist, callback) ->
    request_json = 
      path: "/tasks/v1/users/@me/lists/"+tasklist.id
      method: "PUT"
      params: ""
      body:  { id: tasklist.id, kind: "tasks#taskList", title: tasklist.name }
    
    request = gapi.client.request(request_json)
    request.execute( (resp) -> 
      console.log(resp) 
      window.update_response = resp
    
      callback(tasklist)  
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
exports.Finished = Finished