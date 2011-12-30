#the sync entry point
window.initialize_and_sync_list = ->
  if navigator.onLine and Token.first().refresh_token isnt ""
    $("#syncbutton")[0].src="images/ajax-loader.gif"
    window.settingapp.setup_api_on_entry( window.find_time_difference )

window.time_difference = null

#find the time difference
#find the time difference between the server and local
window.find_time_difference = ->
  current_time = moment()
  
  request_json = 
    path: "/tasks/v1/lists/@default/tasks"
    method: "POST"
    params: ""
    body: { title: "testing time" }
  
  request = gapi.client.request(request_json)
  request.execute( (resp) -> 
    console.log(resp)
    server_time = moment( resp.updated )
    window.time_difference = current_time - server_time
    
    request_json = 
      path: "/tasks/v1/lists/@default/tasks/#{ resp.id }"
      method: "DELETE"
      params: ""
      body: ""

    request = gapi.client.request(request_json)
    request.execute( (resp) -> 
      window.delete_tasks()
    )
    
  )

window.incrementer = {}

#a function to delete all the list from the cloud that has been deleted locally
window.delete_lists= () ->
  window.incrementer["delete_list"] = 0
  
  for d in DeletedList.all()
    window.incrementer["delete_list"] = window.incrementer["delete_list"] + 1
    List.delete_from_cloud( d.deletion_id,  () ->
      window.incrementer["delete_list"] = window.incrementer["delete_list"] - 1
      
      if window.incrementer["delete_list"] is 0
        del.destroy() for del in DeletedList.all()
        window.sync_list()
    )
    
  if window.incrementer["delete_list"] is 0
    del.destroy() for del in DeletedList.all()
    window.sync_list()
  
#a function to delete all the tasks from the cloud that has been deleted locally
window.delete_tasks = () ->
  window.incrementer["delete_task"] = 0
  
  for d in Deletion.all()
    window.incrementer["delete_task"] = window.incrementer["delete_task"] + 1
    Task.delete_from_cloud( d,  () ->
      window.incrementer["delete_task"] = window.incrementer["delete_task"] - 1
      
      if window.incrementer["delete_task"] is 0
        del.destroy() for del in Deletion.all()
        window.delete_lists()
    )
    
  if window.incrementer["delete_task"] is 0
    del.destroy() for del in Deletion.all()
    window.delete_lists()
  
#syncs a list's tasks, assumes that the task list exist in the cloud already
window.sync_task= (tasklist) ->
  request_json = 
    path: "/tasks/v1/lists/#{ tasklist.id }/tasks"
    method: "GET"
    params: ""
    body: ""
  
  request = gapi.client.request(request_json)
  
  #create a counter to increment and decrement when things come back
  window.incrementer[tasklist.id] = 0
  
  request.execute( (resp) -> 
    #console.log(resp) 
    window.list_response = resp  
    
    #manually add the listid since the cloud return does not have it
    cloud_tasks = []
    if resp.items? 
      cloud_tasks = resp.items 
      for c in cloud_tasks
        c.listid = tasklist.id
    
    local_tasks_for_list = Task.findAllByAttribute("listid", tasklist.id)
    
    window.local_cloud_sync( local_tasks_for_list, cloud_tasks, Task, (task)-> 
      #console.log( "CALLBACK called " + window.incrementer[task.listid].toString() )
      
      if window.incrementer[task.listid] is 0
        #check if it already exist to avoid making a duplicate
        if $("#"+task.listid).length > 0
          List.find(tasklist.id).save()
        else
          window.App.render_new List.find(task.listid)
    )
      
    #if no outstanding ajax request, render window
    if window.incrementer[tasklist.id] is 0
      #check if it already exist to avoid making a duplicate
      if $("#"+tasklist.id).length > 0
        List.find(tasklist.id).save()
      else
        window.App.render_new List.find(tasklist.id)
    
    window.check_no_incoming_calls( ()-> $("#syncbutton")[0].src="images/02-redo@2x.png" )
    
  )

window.sync_list = ->
  
  if List.exists "@default"
    #find if any of them is the default list, if it is, then sync by replacing our default list with theirs
    #this should only happen once when the user first syncs
    request = gapi.client.tasks.tasklists.get tasklist: "@default"
    request.execute( (resp) -> 
      #console.log(resp) 
      
      initial_list = List.find("@default")
      
      new_tasklist = List.init( name: resp.title, time: (new Date()).toString() )
      new_tasklist.id = resp.id
      new_tasklist.save()
      
      #change all the ids of the local task with that task list id
      for task in Task.findAllByAttribute("listid", initial_list.id)
        task.listid = new_tasklist.id
        task.save()
      
      initial_list.destroy()  
      
      #now do the sync 
      request = gapi.client.tasks.tasklists.list()
      request.execute( (resp) -> 
        #console.log(resp) 
        window.list_response = resp  
        window.local_cloud_sync( List.all(), resp.items, List, window.sync_task )
        
        #window.local_cloud_sync( List.all(), resp.items, List, (task)-> #console.log("done") )
      )
      
    )  
  else
    request = gapi.client.tasks.tasklists.list()
    request.execute( (resp) -> 
      #console.log(resp) 
      window.list_response = resp  
      window.local_cloud_sync( List.all(), resp.items, List, window.sync_task )
      #window.local_cloud_sync( List.all(), resp.items, List, (task)->#console.log("done") )
      true
    )
  
#inputs: array
#outputs: a dictionary with the id as the key, array of ids
window.de_array = (array) ->
  local_dict = {}
  local_ids = []
  
  for item in array
    local_dict[item.id] = item
    local_ids.push( item.id )
    
  return [local_dict, local_ids]
  
#the item to be synced should be passed as a third param, and function to add/edit/delete should be attached to it.
window.local_cloud_sync = (local, cloud, item, callback) ->
  
  ##console.log(local)
  ##console.log(cloud)
  
  #convert both to sets of ids and dictionaries
  [local_dict, local_ids] = de_array(local)
  [cloud_dict, cloud_ids] = de_array(cloud)
  
  window.local_set = new Set(local_ids)
  window.cloud_set = new Set(cloud_ids)
  
  #process the set of ids that are there locally but not there on the cloud
  #If their synced flag is False, add them, else delete them
  ##console.log("there locally, not on the cloud")
  for id in ( local_set.difference( cloud_set )._set )
    if local_dict[id].synced is false
      ##console.log(id)
      window.local_dict = local_dict
    
      item.add_to_cloud(local_dict[id], callback) 
    else
      item.find(id).destroy()
  
  #process the set of ids that are there on the cloud but not there locally
  #Add them back locally since everything deleted should be on the deleted list and taken care of first  
  ##console.log("there on the cloud, not local")
  window.cloud_dict = 
  for id in ( cloud_set.difference( local_set )._set )
    ##console.log( id )
    
    item.add_from_cloud(cloud_dict[id], callback)
      
  #process the set of ids that are there in the cloud and locally
  #check their timestamps, if local > cloud, write local to cloud, if cloud > local, put it in passback to overwrite local,
  #if cloud == local, do nothing
  ##console.log("there on the cloud and local")
  for id in ( cloud_set.intersection( local_set )._set )
    ##console.log( id )
    
    #if the cloud has a timestamp, then compare it, else just overwrite cloud with local
    if cloud_dict[id].updated?
      local_time = moment(local_dict[id].time)
      cloud_time = moment(cloud_dict[id].updated).add('milliseconds', window.time_difference)
      
      #console.log (local_dict[id] )
      
      #console.log(local_time.toString())
      #console.log(cloud_time.toString())
      
      if local_time > cloud_time
        item.update_to_cloud( local_dict[id], callback )
      else
        item.update_to_local( cloud_dict[id], callback )
        
    else
      #console.log("no timestamp, local updating to cloud")
      if parent_id?
        item.update_to_cloud( local_dict[id], callback, parent_id )
      else
        item.update_to_cloud( local_dict[id], callback )

#function to check there is no more incoming calls left from syncing      
window.check_no_incoming_calls= (callback)->
  sum = 0
  for key, value in window.incrementer
    sum = value + sum
  
  if sum is 0 
    callback()

#dynamically load a js file
window.loadJS= (file) ->
  jsElm = document.createElement("script")
  jsElm.type = "application/javascript"
  jsElm.src = file
  window.document.body.appendChild(jsElm)

window.dynamic_load_gapi = ( callback )->
  xhr = new XMLHttpRequest()
  xhr.open("GET", "https://apis.google.com/js/client.js", true)
  xhr.send(null)
  xhr.onreadystatechange = (status, response) ->
      if (xhr.readyState != 4)
          return;
      eval(xhr.response)
      a = setTimeout(callback(), 3000)

window.gapi_loaded = false
#add stuff for online and offline checking
window.online = (event) ->
  if navigator.onLine
    $("#sync_button").removeClass("disabled")
    
    $(document).ready(() ->
      if not window.gapi_loaded
        #window.loadJS("https://apis.google.com/js/client.js")
        dynamic_load_gapi( window.initialize_and_sync_list )
        window.gapi_loaded = true
    )
    
    #check if anything needs syncing, if anything does, do a general sync
    #if Task.synced().length >= 1 or List.synced().length >= 1 
  
  else
    $("#sync_button").addClass("disabled")

addEvent(window, 'online', online);
addEvent(window, 'offline', online);

online(type: 'ready' )


