(function() {
  var delete_task, exports, make_child, nextItem, open_for_edit, prevItem, updateItems;
  nextItem = function() {
    if ($("textarea:focus").length === 0 && $("input:focus").length === 0) {
      if (cur < ($("li").length - 1)) {
        window.cur++;
      } else {
        window.cur = 0;
      }
      updateItems();
    }
    return true;
  };
  prevItem = function() {
    if ($("textarea:focus").length === 0 && $("input:focus").length === 0) {
      if (cur > 0) {
        window.cur--;
      } else {
        window.cur = $("li").length - 1;
      }
      updateItems();
    }
    return true;
  };
  updateItems = function() {
    $("li.task_selected").removeClass("task_selected");
    return $("li:eq(" + cur + ")").addClass("task_selected");
  };
  open_for_edit = function() {
    var current, task_controller;
    if ($("textarea:focus").length === 0 && $("input:focus").length === 0) {
      current = Task.find($(".task_selected").data("id"));
      task_controller = window.taskdict[$(".task_selected").data("id")];
      task_controller.edit();
    }
    return true;
  };
  delete_task = function() {
    var current, r, task_controller;
    r = confirm("Are you sure you want to delete this task?");
    if ($("textarea:focus").length === 0 && $("input:focus").length === 0) {
      if (r) {
        current = Task.find($(".task_selected").data("id"));
        task_controller = window.taskdict[$(".task_selected").data("id")];
        return task_controller.destroy();
      }
    }
  };
  make_child = function() {
    var current, task_controller;
    alert("make child");
    current = Task.find($(".task_selected").data("id"));
    task_controller = window.taskdict[$(".task_selected").data("id")];
    return task_controller.el.addClass("child_1");
  };
  exports = this;
  this.nextItem = nextItem;
  this.prevItem = prevItem;
  this.updateItems = updateItems;
  this.open_for_edit = open_for_edit;
  this.delete_task = delete_task;
  this.make_child = make_child;
}).call(this);
