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

delete_task = ->
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

  task_controller.el.addClass("child_1");
  
#export this shit
exports = this
this.nextItem = nextItem
this.prevItem = prevItem
this.updateItems = updateItems
this.open_for_edit = open_for_edit
this.delete_task = delete_task
this.make_child = make_child