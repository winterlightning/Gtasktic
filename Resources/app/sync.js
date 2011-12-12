(function() {
  window.new_sync = function() {
    if ((navigator.onLine === false) || ($("#sync_button").hasClass("disabled"))) {}
  };
  window.sync_list = function() {
    var request;
    request = gapi.client.tasks.tasklists.list();
    return request.execute(function(resp) {
      console.log(resp);
      window.list_response = resp;
      return window.local_cloud_sync(List.all(), resp.items);
    });
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
  window.add_tasklist_to_cloud = function(tasklist) {
    var request, request_json;
    request_json = {
      path: "/tasks/v1/users/@me/lists",
      method: "POST",
      params: "title=list",
      body: {
        title: tasklist
      }
    };
    request = gapi.client.request(request_json);
    return request.execute(function(resp) {
      console.log(resp);
      return window.add_response = resp;
    });
  };
  window.local_cloud_sync = function(local, cloud) {
    var cloud_dict, cloud_ids, cloud_set, id, local_dict, local_ids, local_set, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _ref3, _ref4, _ref5, _results;
    console.log(local);
    console.log(cloud);
    _ref = de_array(local), local_dict = _ref[0], local_ids = _ref[1];
    _ref2 = de_array(cloud), cloud_dict = _ref2[0], cloud_ids = _ref2[1];
    local_set = new Set(local_ids);
    cloud_set = new Set(cloud_ids);
    console.log("there locally, not on the cloud");
    _ref3 = (local_set.difference(cloud_set)._set);
    for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
      id = _ref3[_i];
      console.log(id);
    }
    console.log("there on the cloud, not local");
    _ref4 = (cloud_set.difference(local_set)._set);
    for (_j = 0, _len2 = _ref4.length; _j < _len2; _j++) {
      id = _ref4[_j];
      console.log(id);
    }
    console.log("there on the cloud and local");
    _ref5 = (cloud_set.intersection(local_set)._set);
    _results = [];
    for (_k = 0, _len3 = _ref5.length; _k < _len3; _k++) {
      id = _ref5[_k];
      _results.push(console.log(id));
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
