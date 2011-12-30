Task.fetch()
Deletion.fetch()
List.fetch()
Token.fetch()
Finished.fetch()
Initialized.fetch()
BackgroundImage.fetch()
initializeApp()

setting_url = ""
window.last_opened = ""
window.cur = 0
window.taskdict = {}
window.obj = null

$ ->
  #set background image
  if BackgroundImage.first().image isnt ""
    $("#bghelp")[0].style.background = 'url(' + BackgroundImage.first().image + ') no-repeat center'

  $("#newtaskdate").datepicker 
    constrainInput: true
    buttonImage: "famfamicons/calendar.png"
    buttonImageOnly: true
    buttonText: ""
    showOn: "both"
    onSelect: (dateText, inst) ->
      $(this).parent().parent().find(".showdate").html dateText  if $(this).parent().parent().find(".showdate").length == 1
  
  $container = $("#container").notify()
  $("#calendar").fullCalendar events: window.rendering_cal_process
  $("#calendarview").hide()
  updateItems()
  
  #shortcuts
  shortcut.add "up", prevItem
  shortcut.add "down", nextItem
  shortcut.add "enter", open_for_edit, disable_in_input: "true"
  shortcut.add "backspace", pressed_delete, disable_in_input: "true"
  shortcut.add "delete", pressed_delete, disable_in_input: "true"

window.create = (template, vars, opts) ->
  $container.notify "create", template, vars, opts

window.addlist_window = ->
  $("#list_name").val ""
  $("#list_description").val ""
  $("#dialog_addlist").dialog 
    modal: true
    title: "Add A New List"
    dialogClass: "adding"

window.add_list = ->
  name = $("#list_name").val()
  description = $("#list_description").val()
  
  if navigator.onLine
    newlist = List.init(
      name: name
      description: description
      time: (new Date().getTime()).toString()
      synced: true
    )
    newlist.save()
    
    window.settingapp.setup_api_on_entry( ()-> List.add_to_cloud( newlist, (list)-> 
      window.App.render_new list
      $("#syncbutton")[0].src="images/02-redo@2x.png" 
    ) )
    
  else  
    newlist = List.init(
      name: name
      description: description
      time: (new Date().getTime()).toString()
      synced: false
    )
    newlist.save()
  
  window.App.render_new newlist
  $("#dialog_addlist").dialog "close"

window.edit_list = ->
  curr_list = List.find($("#dialog_addlist").data("id"))
  curr_list.name = $("#list_name").val()
  curr_list.description = $("#list_description").val()
  curr_list.time = (new Date().getTime()).toString()
  
  if navigator.onLine
    curr_list.updated = true
    curr_list.save()
    
    window.settingapp.setup_api_on_entry( ()-> List.update_to_cloud( curr_list, (list)-> $("#syncbutton")[0].src="images/02-redo@2x.png" ) )
    
  else  
    curr_list.updated = false
    curr_list.save()
  
  
  $("#dialog_addlist").dialog "close"
  
#for calendar
window.toggle = (element_a, element_b, tab_a, tab_b) ->
  $(element_a).hide()
  $(element_b).show()
  $(tab_a).removeClass "active"
  $(tab_b).addClass "active"
  $("#calendar").fullCalendar "refetchEvents"
  $("#calendar").fullCalendar "windowResize"

window.show_all_div = ->
  $(".listdiv").show()
  $(".filterselected").removeClass "filterselected"
  $("#allbutton").addClass "filterselected"
  
#set window height to match gradient
ti_window = Titanium.UI.currentWindow
ti_window.height = 510