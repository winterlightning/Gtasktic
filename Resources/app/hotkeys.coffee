nextItem = ->
  if $("textarea:focus").length == 0 and $("input:focus").length == 0
    if cur < ($("li").length - 1)
      window.cur++
    else
      window.cur = 0
    updateItems()
  true
  
prevItem = ->
  if $("textarea:focus").length == 0 and $("input:focus").length == 0
    if cur > 0
      window.cur--
    else
      window.cur = $("li").length - 1
    updateItems()
  true

updateItems = ->
  $("li.task_selected").removeClass "task_selected"
  $("li:eq(" + cur + ")").addClass "task_selected"

open_for_edit = ->
  if $("textarea:focus").length == 0 and $("input:focus").length == 0
    current = Task.find($(".task_selected").data("id"))
    task_controller = window.taskdict[$(".task_selected").data("id")]
    task_controller.edit()
  true

pressed_delete = ->
  r = confirm("Are you sure you want to delete this task?")
  if $("textarea:focus").length == 0 and $("input:focus").length == 0
    if r
      current = Task.find($(".task_selected").data("id"))
      task_controller = window.taskdict[$(".task_selected").data("id")]
      task_controller.destroy()

make_child = ->
  alert "make child"
  current = Task.find($(".task_selected").data("id"))
  task_controller = window.taskdict[$(".task_selected").data("id")]
  
  #A. check if the list is the first of the list, if it is, it cannot be made into a child
  if task_controller.el.index() is 0
    alert "The first task cannot be made into a child"
    return;
  
  #B. Find the parent of the list
  
  #1. Find the first entry before it that has a level above it, assign that as the parent
  
  #2. Change the child's class, changing it's nested value, cannot tab something more than 1 before it's class
  
  task_controller.el.addClass("child_1");
  
#export this shit
exports = this
this.nextItem = nextItem
this.prevItem = prevItem
this.updateItems = updateItems
this.open_for_edit = open_for_edit
this.pressed_delete = pressed_delete
this.make_child = make_child