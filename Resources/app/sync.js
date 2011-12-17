(function() {
  window.new_sync = function() {
    if ((navigator.onLine === false) || ($("#sync_button").hasClass("disabled"))) {}
  };
  window.initialize_and_sync_list = function() {
    return window.settingapp.setup_api_on_entry(window.delete_lists);
  };
  window.incrementer = {};
  window.delete_lists = function() {
    var d, del, _i, _j, _len, _len2, _ref, _ref2;
    window.incrementer["delete_list"] = 0;
    _ref = DeletedList.all();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      d = _ref[_i];
      window.incrementer["delete_list"] = window.incrementer["delete_list"] + 1;
      List.delete_from_cloud(d.deletion_id, function() {
        var del, _j, _len2, _ref2;
        window.incrementer["delete_list"] = window.incrementer["delete_list"] - 1;
        if (window.incrementer["delete_list"] === 0) {
          _ref2 = DeletedList.all();
          for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
            del = _ref2[_j];
            del.destroy();
          }
          return window.delete_tasks();
        }
      });
    }
    if (window.incrementer["delete_list"] === 0) {
      _ref2 = DeletedList.all();
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        del = _ref2[_j];
        del.destroy();
      }
      return window.delete_tasks();
    }
  };
  window.delete_tasks = function() {
    var d, del, _i, _j, _len, _len2, _ref, _ref2;
    window.incrementer["delete_task"] = 0;
    _ref = Deletion.all();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      d = _ref[_i];
      window.incrementer["delete_task"] = window.incrementer["delete_task"] + 1;
      Task.delete_from_cloud(d, function() {
        var del, _j, _len2, _ref2;
        window.incrementer["delete_task"] = window.incrementer["delete_task"] - 1;
        if (window.incrementer["delete_task"] === 0) {
          _ref2 = Deletion.all();
          for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
            del = _ref2[_j];
            del.destroy();
          }
          return window.sync_list();
        }
      });
    }
    if (window.incrementer["delete_task"] === 0) {
      _ref2 = Deletion.all();
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        del = _ref2[_j];
        del.destroy();
      }
      return window.sync_list();
    }
  };
  window.sync_task = function(tasklist) {
    var request;
    request = gapi.client.tasks.tasks.list({
      tasklist: tasklist.id
    });
    window.incrementer[tasklist.id] = 0;
    return request.execute(function(resp) {
      var c, cloud_tasks, local_tasks_for_list, _i, _len;
      console.log(resp);
      window.list_response = resp;
      cloud_tasks = resp.items;
      for (_i = 0, _len = cloud_tasks.length; _i < _len; _i++) {
        c = cloud_tasks[_i];
        c.listid = tasklist.id;
      }
      local_tasks_for_list = Task.findAllByAttribute("listid", tasklist.id);
      window.local_cloud_sync(local_tasks_for_list, cloud_tasks, Task, function(task) {
        console.log("CALLBACK called " + window.incrementer[task.listid].toString());
        if (window.incrementer[task.listid] === 0) {
          if ($("#" + task.listid).length > 0) {
            return List.find(tasklist.id).save();
          } else {
            return window.App.render_new(List.find(task.listid));
          }
        }
      });
      if (window.incrementer[tasklist.id] === 0) {
        if ($("#" + tasklist.id).length > 0) {
          return List.find(tasklist.id).save();
        } else {
          return window.App.render_new(List.find(tasklist.id));
        }
      }
    });
  };
  window.sync_list = function() {
    var request;
    if (List.exists("@default")) {
      request = gapi.client.tasks.tasklists.get({
        tasklist: "@default"
      });
      return request.execute(function(resp) {
        var initial_list, new_tasklist, task, _i, _len, _ref;
        console.log(resp);
        initial_list = List.find("@default");
        new_tasklist = List.init({
          name: resp.title,
          time: (new Date()).toString()
        });
        new_tasklist.id = resp.id;
        new_tasklist.save();
        _ref = Task.findAllByAttribute("listid", initial_list.id);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          task = _ref[_i];
          task.listid = new_tasklist.id;
          task.save();
        }
        initial_list.destroy();
        request = gapi.client.tasks.tasklists.list();
        return request.execute(function(resp) {
          console.log(resp);
          window.list_response = resp;
          return window.local_cloud_sync(List.all(), resp.items, List, window.sync_task);
        });
      });
    } else {
      request = gapi.client.tasks.tasklists.list();
      return request.execute(function(resp) {
        console.log(resp);
        window.list_response = resp;
        return window.local_cloud_sync(List.all(), resp.items, List, window.sync_task);
      });
    }
  };
  window.de_array = function(array) {
    var item, local_dict, local_ids, _i, _len;
    local_dict = {};
    local_ids = [];
    for (_i = 0, _len = array.length; _i < _len; _i++) {
      item = array[_i];
      local_dict[item.id] = item;
      local_ids.push(item.id);
    }
    return [local_dict, local_ids];
  };
  window.local_cloud_sync = function(local, cloud, item, callback) {
    var cloud_dict, cloud_ids, cloud_time, id, local_dict, local_ids, local_time, _i, _j, _len, _len2, _ref, _ref2, _ref3, _ref4, _results;
    console.log(local);
    console.log(cloud);
    _ref = de_array(local), local_dict = _ref[0], local_ids = _ref[1];
    _ref2 = de_array(cloud), cloud_dict = _ref2[0], cloud_ids = _ref2[1];
    window.local_set = new Set(local_ids);
    window.cloud_set = new Set(cloud_ids);
    console.log("there locally, not on the cloud");
    _ref3 = (local_set.difference(cloud_set)._set);
    for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
      id = _ref3[_i];
      if (local_dict[id].synced === false) {
        console.log(id);
        window.local_dict = local_dict;
        item.add_to_cloud(local_dict[id], callback);
      } else {
        item.find(id).destroy();
      }
    }
    console.log("there on the cloud, not local");
    window.cloud_dict = (function() {
      var _j, _len2, _ref4, _results;
      _ref4 = (cloud_set.difference(local_set)._set);
      _results = [];
      for (_j = 0, _len2 = _ref4.length; _j < _len2; _j++) {
        id = _ref4[_j];
        console.log(id);
        _results.push(item.add_from_cloud(cloud_dict[id], callback));
      }
      return _results;
    })();
    console.log("there on the cloud and local");
    _ref4 = (cloud_set.intersection(local_set)._set);
    _results = [];
    for (_j = 0, _len2 = _ref4.length; _j < _len2; _j++) {
      id = _ref4[_j];
      console.log(id);
      _results.push(cloud_dict[id].updated != null ? (local_time = moment(local_dict[id].time), cloud_time = moment(cloud_dict[id].updated), console.log(local_time.toString()), console.log(cloud_time.toString()), local_time > cloud_time ? item.update_to_cloud(local_dict[id], callback) : item.update_to_local(cloud_dict[id], callback)) : (console.log("no timestamp, local updating to cloud"), typeof parent_id !== "undefined" && parent_id !== null ? item.update_to_cloud(local_dict[id], callback, parent_id) : item.update_to_cloud(local_dict[id], callback)));
    }
    return _results;
  };
  window.Sync = function() {
    var a, b, d, denied, e, f, file;
    if ((navigator.onLine === false) || ($("#sync_button").hasClass("disabled"))) {
      return;
    }
    $("#sync_button").addClass("disabled");
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
    $("#sync_button").removeClass("disabled");
    window.sync_window.close();
    return create("default", {
      title: "Sync Failed",
      text: "Please try later. (Error is reported to developer to fix!)"
    });
  };
  window.Sync_after = function(a) {
    var current, deleted, deleted_list, tasklist;
    $("#sync_button").removeClass("disabled");
    window.last_synced = a;
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
