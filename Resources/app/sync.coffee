window.new_sync = ->
  if (navigator.onLine == false) or ( $("#sync_button").hasClass("disabled") )
    return

  #save all the etags? alternative comparing
  #lists = sync list the list syncs 
  
  #call sync on the list of tasklist

window.initialize_and_sync_list = ->
  window.settingapp.setup_api_on_entry( window.delete_lists )

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
        window.delete_tasks()
    )
    
  if window.incrementer["delete_list"] is 0
    del.destroy() for del in DeletedList.all()
    window.delete_tasks()
  
#a function to delete all the tasks from the cloud that has been deleted locally
window.delete_tasks = () ->
  window.incrementer["delete_task"] = 0
  
  for d in Deletion.all()
    window.incrementer["delete_task"] = window.incrementer["delete_task"] + 1
    Task.delete_from_cloud( d,  () ->
      window.incrementer["delete_task"] = window.incrementer["delete_task"] - 1
      
      if window.incrementer["delete_task"] is 0
        del.destroy() for del in Deletion.all()
        window.sync_list()
    )
    
  if window.incrementer["delete_task"] is 0
    del.destroy() for del in Deletion.all()
    window.sync_list()
  
#syncs a tasks list, assumes that the task list exist in the cloud already
window.sync_task= (tasklist) ->
  request = gapi.client.tasks.tasks.list( tasklist: tasklist.id )
  
  #create a counter to increment and decrement when things come back
  window.incrementer[tasklist.id] = 0
  
  request.execute( (resp) -> 
    console.log(resp) 
    window.list_response = resp  
    
    #manually add the listid since the cloud return does not have it
    cloud_tasks = resp.items
    for c in cloud_tasks
      c.listid = tasklist.id
    
    local_tasks_for_list = Task.findAllByAttribute("listid", tasklist.id)
    
    window.local_cloud_sync( local_tasks_for_list, cloud_tasks, Task, (task)-> 
      console.log( "CALLBACK called " + window.incrementer[task.listid].toString() )
      
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
    
  )

window.sync_list = ->
  
  if List.exists "@default"
    #find if any of them is the default list, if it is, then sync by replacing our default list with theirs
    #this should only happen once when the user first syncs
    request = gapi.client.tasks.tasklists.get tasklist: "@default"
    request.execute( (resp) -> 
      console.log(resp) 
      
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
        console.log(resp) 
        window.list_response = resp  
        window.local_cloud_sync( List.all(), resp.items, List, window.sync_task )
      )
      
    )  
  else
    request = gapi.client.tasks.tasklists.list()
    request.execute( (resp) -> 
      console.log(resp) 
      window.list_response = resp  
      window.local_cloud_sync( List.all(), resp.items, List, window.sync_task )
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
  console.log(local)
  console.log(cloud)
  
  #convert both to sets of ids and dictionaries
  [local_dict, local_ids] = de_array(local)
  [cloud_dict, cloud_ids] = de_array(cloud)
  
  local_set = new Set(local_ids)
  cloud_set = new Set(cloud_ids)
  
  #process the set of ids that are there locally but not there on the cloud
  #If their synced flag is False, add them, else delete them
  console.log("there locally, not on the cloud")
  for id in ( local_set.difference( cloud_set )._set )
    if local_dict[id].synced is false
      console.log(id)
      window.local_dict = local_dict
    
      item.add_to_cloud(local_dict[id], callback) 
    else
      item.find(id).destroy()
  
  #process the set of ids that are there on the cloud but not there locally
  #Add them back locally since everything deleted should be on the deleted list and taken care of first  
  console.log("there on the cloud, not local")
  window.cloud_dict = 
  for id in ( cloud_set.difference( local_set )._set )
    console.log( id )
    
    item.add_from_cloud(cloud_dict[id], callback)
      
  #process the set of ids that are there in the cloud and locally
  #check their timestamps, if local > cloud, write local to cloud, if cloud > local, put it in passback to overwrite local,
  #if cloud == local, do nothing
  console.log("there on the cloud and local")
  for id in ( cloud_set.intersection( local_set )._set )
    #if the cloud has a timestamp, then compare it, else just overwrite cloud with local
    if cloud_dict[id].updated?
      local_time = moment(local_dict[id].time)
      cloud_time = moment(cloud_dict[id].updated)
      
      if local_time > cloud_time
        item.update_to_cloud( local_dict[id], callback )
      else
        item.update_to_local( cloud_dict[id], callback )
        
    else
      console.log("no timestamp, local updating to cloud")
      if parent_id?
        item.update_to_cloud( local_dict[id], callback, parent_id )
      else
        item.update_to_cloud( local_dict[id], callback )
      
  
  
  
  
  
  
  
  
  
  
  
  
window.Sync = ->
  
  if (navigator.onLine == false) or ( $("#sync_button").hasClass("disabled") )
    return
  
  $("#sync_button").addClass("disabled")
  
  b = Key.all()
  if b.length > 0
    unless b[0].validated == true
      denied = create("default", 
        title: "You have not validated"
        text: "You need to go to setting and validate your google account first."
      )
      return
  else
    denied = create("default", 
      title: "You have not validated"
      text: "You need to go to setting and validate your google account first."
    )
    return

  window.sync_window = create("sticky", 
    { title: "Sync with Google Cloud"
    text: "We are currently syncing."}
  , expires: false)

  b = JSON.stringify(Task)
  d = JSON.stringify(Deletion)
  e = JSON.stringify(List)
  f = JSON.stringify(DeletedList)

  file = Titanium.Filesystem.getApplicationDataDirectory()
  a = initial_login_entry(b, d, e, f, file)
 
window.Sync_failed = () ->
  $("#sync_button").removeClass("disabled")
  window.sync_window.close()
  create "default", 
    title: "Sync Failed"
    text: "Please try later. (Error is reported to developer to fix!)"

window.Sync_after = (a) ->
  $("#sync_button").removeClass("disabled")
  window.last_synced = a

  current = a.current
  deleted = a.deletion
  tasklist = a.tasklist
  deleted_list = a.list_deletions
  Titanium.API.debug current
  $.each Deletion.all(), (index, value) ->
    value.destroy()
  
  $.each DeletedList.all(), (index, value) ->
    value.destroy()
  
  $.each deleted, (index, value) ->
    deleteTask = Task.find(value)
    deleteTask.destroy()
  
  $.each deleted_list, (index, value) ->
    deleted = List.find(value)
    deleted.destroy()
  
  $.each current, (index, value) ->
    duedate = null
    duedate = (new Date(value.due)).format("mm/dd/yyyy")  if value.hasOwnProperty("due")
    if Task.exists(value.id)
      editable = Task.find(value.id)
      editable.name = value.title
      editable.done = (value.status == "completed")
      editable.duedate = duedate
      editable.listid = value.listid
      editable.note = value.notes  if value.hasOwnProperty("notes")
      editable.save()
    else
      unless value.title == ""
        task = Task.init(
          name: value.title
          time: (new Date().getTime()).toString()
          synced: true
          done: (value.status == "completed")
          duedate: duedate
          listid: value.listid
        )
        task.id = value.id
        task.note = value.notes  if value.hasOwnProperty("notes")
        task.save()
  
  $.each tasklist, (index, value) ->
    if List.exists(value.id)
      editable = List.find(value.id)
      editable.name = value.title
      editable.synced = true
      editable.save()
    else
      list = List.init(
        name: value.title
        synced: true
        time: (new Date().getTime()).toString()
      )
      list.id = value.id
      list.save()
      window.App.render_new list
  
  sync_window.close()
  create "default", 
    title: "Successful Sync"
    text: "Your todos have successfully synced with Google"

#add stuff for online and offline checking
window.online = (event) ->
  if navigator.onLine
    $("#sync_button").removeClass("disabled")
  else
    $("#sync_button").addClass("disabled")

addEvent(window, 'online', online);
addEvent(window, 'offline', online);

online(type: 'ready' )
