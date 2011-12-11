window.new_sync = ->
  if (navigator.onLine == false) or ( $("#sync_button").hasClass("disabled") )
    return

  #save all the etags? alternative comparing
  #lists = sync list the list syncs 
  
  #call sync on the list of tasklist

window.sync_list = ->
  request = gapi.client.tasks.tasklists.list()
  request.execute( (resp) -> 
    console.log(resp) 
    window.list_response = resp  
    window.local_cloud_sync( List.all(), resp.items )
  )

window.de_array = (array) ->
  local_dict = {}
  local_ids = []
  
  for item in array
    local_dict[item.id] = item
    local_ids.push( item.id )
    
  return [local_dict, local_ids]

window.local_cloud_sync = (local, cloud) ->
  console.log(local)
  console.log(cloud)
  
  #convert both to sets of ids and dictionaries
  [local_dict, local_ids] = de_array(local)
  
  #process the set of ids that are there locally but not there on the cloud
  #If their synced flag is False, add them, else delete them
  
  
  #process the set of ids that are there on the cloud but not there locally
  #Add them back locally since everything deleted should be on the deleted list and taken care of first  
  
  
  #process the set of ids that are there in the cloud and locally
  #check their timestamps, if local > cloud, write local to cloud, if cloud > local, put it in passback to overwrite local,
  #if cloud == local, do nothing
  

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
