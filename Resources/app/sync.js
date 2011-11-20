(function() {
  window.Sync = function() {
    var a, b, d, denied, e, f, file;
    if (navigator.onLine === false) {
      return;
    }
    b = Key.all();
    if (b.length > 0) {
      if (b[0].validated !== true) {
        denied = create("default", {
          title: "You have not validated",
          text: "You need to go to setting and validate your google account first."
        });
        return;
      }
    } else {
      denied = create("default", {
        title: "You have not validated",
        text: "You need to go to setting and validate your google account first."
      });
      return;
    }
    window.sync_window = create("sticky", {
      title: "Sync with Google Cloud",
      text: "We are currently syncing."
    }, {
      expires: false
    });
    b = JSON.stringify(Task);
    d = JSON.stringify(Deletion);
    e = JSON.stringify(List);
    f = JSON.stringify(DeletedList);
    file = Titanium.Filesystem.getApplicationDataDirectory();
    return a = initial_login_entry(b, d, e, f, file);
  };
  window.Sync_failed = function() {
    window.sync_window.close();
    return create("default", {
      title: "Sync Failed",
      text: "Please try later. (Error is reported to developer to fix!)"
    });
  };
  window.Sync_after = function(a) {
    var current, deleted, deleted_list, tasklist;
    current = a.current;
    deleted = a.deletion;
    tasklist = a.tasklist;
    deleted_list = a.list_deletions;
    Titanium.API.debug(current);
    $.each(Deletion.all(), function(index, value) {
      return value.destroy();
    });
    $.each(DeletedList.all(), function(index, value) {
      return value.destroy();
    });
    $.each(deleted, function(index, value) {
      var deleteTask;
      deleteTask = Task.find(value);
      return deleteTask.destroy();
    });
    $.each(deleted_list, function(index, value) {
      deleted = List.find(value);
      return deleted.destroy();
    });
    $.each(current, function(index, value) {
      var duedate, editable, task;
      duedate = null;
      if (value.hasOwnProperty("due")) {
        duedate = (new Date(value.due)).format("mm/dd/yyyy");
      }
      if (Task.exists(value.id)) {
        editable = Task.find(value.id);
        editable.name = value.title;
        editable.done = value.status === "completed";
        editable.duedate = duedate;
        editable.listid = value.listid;
        if (value.hasOwnProperty("notes")) {
          editable.note = value.notes;
        }
        return editable.save();
      } else {
        if (value.title !== "") {
          task = Task.init({
            name: value.title,
            time: (new Date().getTime()).toString(),
            synced: true,
            done: value.status === "completed",
            duedate: duedate,
            listid: value.listid
          });
          task.id = value.id;
          if (value.hasOwnProperty("notes")) {
            task.note = value.notes;
          }
          return task.save();
        }
      }
    });
    $.each(tasklist, function(index, value) {
      var editable, list;
      if (List.exists(value.id)) {
        editable = List.find(value.id);
        editable.name = value.title;
        editable.synced = true;
        return editable.save();
      } else {
        list = List.init({
          name: value.title,
          synced: true,
          time: (new Date().getTime()).toString()
        });
        list.id = value.id;
        list.save();
        return window.App.render_new(list);
      }
    });
    sync_window.close();
    return create("default", {
      title: "Successful Sync",
      text: "Your todos have successfully synced with Google"
    });
  };
  window.online = function(event) {
    if (navigator.onLine) {
      return $("#sync_button").removeClass("disabled");
    } else {
      return $("#sync_button").addClass("disabled");
    }
  };
  addEvent(window, 'online', online);
  addEvent(window, 'offline', online);
  online({
    type: 'ready'
  });
}).call(this);
