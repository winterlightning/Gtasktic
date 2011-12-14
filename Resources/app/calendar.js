(function() {
  window.rendering_cal = function() {
    var calendar_input, dated_tasks;
    dated_tasks = Task.select(function(item) {
      return item.duedate !== void 0;
    });
    calendar_input = [];
    $.each(dated_tasks, function(index, value) {
      return calendar_input.push({
        title: value.name,
        start: new Date(value.duedate)
      });
    });
    return $("#calendar").fullCalendar("renderEvent", calendar_input, false);
  };
  window.rendering_cal_process = function(start, end, callback) {
    var calendar_input, dated_tasks, f, finished_tasks, _i, _len;
    dated_tasks = Task.select(function(item) {
      return item.duedate !== void 0;
    });
    finished_tasks = Finished.all();
    calendar_input = [];
    $.each(dated_tasks, function(index, value) {
      return calendar_input.push({
        title: value.name,
        start: new Date(value.duedate),
        className: "current_task"
      });
    });
    for (_i = 0, _len = finished_tasks.length; _i < _len; _i++) {
      f = finished_tasks[_i];
      calendar_input.push({
        title: f.name,
        start: new Date(f.time_finished),
        className: "finished_task"
      });
    }
    $("#calendar").fullCalendar("renderEvent", calendar_input, false);
    return callback(calendar_input);
  };
}).call(this);
