Finished = Spine.Model.setup("Finished", [ "name", "done", "time", "duedate", "note", "order", "synced", "listid", "time_finished" ])
Finished.extend Spine.Model.Local

Task = Spine.Model.setup("Task", [ "name", "done", "time", "duedate", "note", "order", "synced", "listid", "updated" ]) #nestlevel from 0 to whatever
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
  
  synced: () ->
    @select (item) ->
      not item.synced or not item.updated
  
  destroyDone: (id) ->
    @done(id).forEach (rec) ->
      Deletion.create deletion_id: rec.id  if rec.synced == true
      rec.destroy()
  
  logDone: ( id ) ->
    @done(id).forEach (rec) ->
      if rec.synced == true
        cur_task = rec
        if navigator.onLine
          $("#syncbutton")[0].src="images/ajax-loader.gif"
          window.settingapp.setup_api_on_entry( ()-> Task.delete_from_cloud(cur_task, ()-> $("#syncbutton")[0].src="images/02-redo@2x.png" ) )
        
        else
          d = Deletion.init deletion_id: rec.id, listid: rec.listid 
          d.id = rec.id
          d.save()
      
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
    console.log("add from cloud")
    if value.title is ""
      return true
    
    duedate = null
    duedate = moment(value.due).format("MM/DD/YYYY") if value.hasOwnProperty("due")    
    
    task = Task.init(
      name: value.title
      time: ( moment(value.updated).add('milliseconds', window.time_difference) ).toString()
      synced: true
      done: (value.status == "completed")
      duedate: duedate
      listid: value.listid
      updated: true
    )
    task.id = value.id
    task.note = value.notes  if value.hasOwnProperty("notes")
    task.save()
  
  #sync process
  add_to_cloud: (task, callback) -> #tasks needs to at least have a name and listid attribute
    console.log("add to cloud")
    #manually create the request since the api shit is not working
    data = Task.toCloudStructure(task)
    
    request_json = 
      path: "/tasks/v1/lists/#{ task.listid }/tasks"
      method: "POST"
      params: ""
      body: data
    
    request = new GoogleRequest(request_json)
    
    #increment the incrementor to keep track of outstanding requests
    window.incrementer[task.listid] = window.incrementer[task.listid] + 1
    
    request.execute( (resp) -> 
      console.log(resp) 
      window.add_response = resp
      
      #response need to update the local with correct id
      old_id = task.id
      
      data = { name: task.name, time: ( moment(resp.updated) + window.time_difference ).toString(), listid: task.listid, order: task.order, synced: true, updated: true}
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
    console.log("delete from cloud")
    request_json = 
      path: "/tasks/v1/lists/#{ task.listid }/tasks/#{ task.id }"
      method: "DELETE"
      params: ""
      body: ""

    request = new GoogleRequest(request_json)
    request.execute( (resp) -> 
      console.log(resp) 
      window.delete_response = resp
      
      callback()
    )
  
  update_to_cloud: (task, callback) ->
    console.log("update to cloud")
    
    data = Task.toCloudStructure(task)
    data.id = task.id
    
    window.updatedata = data
    
    request_json = 
      path: "/tasks/v1/lists/#{ task.listid }/tasks/#{ task.id }"
      method: "PUT"
      params: ""
      body: data
    
    request = new GoogleRequest(request_json)
    
    request.execute( (resp) -> 
      console.log(resp) 
      window.update_response = resp
      task.updated = true
      task.save()
      callback(task)
    )    
  
  update_to_local: (task, callback) ->
    console.log("update to local")
    local_task = Task.find(task.id)
    
    duedate = null
    duedate = moment(task.due).add("minutes", moment().zone()).format("MM/DD/YYYY") if task.hasOwnProperty("due")      
    
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

List = Spine.Model.setup("List", [ "name", "description", "synced", "time", "updated" ])
List.extend Spine.Model.Local

List.extend
  #sync processes
  
  #add a cloud list to your local storage
  add_from_cloud: (tasklist, callback ) ->
    new_tasklist = List.init( name: tasklist.title, time: (new Date()).toString() )
    new_tasklist.id = tasklist.id
    new_tasklist.synced = true
    new_tasklist.updated = true
    new_tasklist.save()
    
    callback(new_tasklist)

  synced: () ->
    @select (item) ->
      not item.synced or not item.updated

  add_to_cloud: (tasklist, callback) ->
    if tasklist.id is "@default"
      return true
    
    #manually create the request since the api shit is not working
    request_json = 
      path: "/tasks/v1/users/@me/lists"
      method: "POST"
      params: ""
      body:  title: tasklist.name
    
    request = new GoogleRequest(request_json)
    request.execute( (resp) -> 
      console.log(resp) 
      window.add_response = resp
    
      #destroy the old tasklist and create one with id corresponding to the new one
      old_id = tasklist.id
      
      new_tasklist = List.init( name: tasklist.name, time: (new Date()).toString(), synced: true, updated: true )
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
    
    request = new GoogleRequest(request_json)
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
    
    request = new GoogleRequest(request_json)
    request.execute( (resp) -> 
      console.log(resp) 
      window.update_response = resp
    
      callback(tasklist)  
    )

  update_to_local: (tasklist, callback) ->
    t = List.find(tasklist.id)
    t.name = tasklist.title
    t.save()
    
    callback(tasklist) 

Version = Spine.Model.setup("Version", [ "number" ])
Version.extend Spine.Model.Local
Initialized = Spine.Model.setup("Initialized", [ "flag" ])
Initialized.extend Spine.Model.Local

Token = Spine.Model.setup("Token", [ "current_token", "expiration", "refresh_token" ])
Token.extend Spine.Model.Local

TestStorage = Spine.Model.setup("TestStorage", [ "stored" ])
TestStorage.extend Spine.Model.Local

BackgroundImage = Spine.Model.setup("BackgroundImage", [ "image" ])
BackgroundImage.extend Spine.Model.Local

exports = this
exports.Deletion = Deletion
exports.Task = Task
exports.DeletedList = DeletedList
exports.List = List
exports.Version = Version
exports.Initialized = Initialized
exports.Token = Token
exports.Finished = Finished
exports.BackgroundImage = BackgroundImage