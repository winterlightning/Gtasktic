window.Sync = ->
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
  window.sync_window.close()
  create "default", 
    title: "Sync Failed"
    text: "Please try later"

window.Sync_after = (a) ->
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
