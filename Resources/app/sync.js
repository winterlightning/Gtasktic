(function() {
  window.initialize_and_sync_list = function() {
    if (navigator.onLine && Token.first().refresh_token !== "") {
      $("#syncbutton")[0].src = "images/ajax-loader.gif";
      return window.settingapp.setup_api_on_entry(window.find_time_difference);
    }
  };
  window.time_difference = null;
  window.find_time_difference = function() {
    var current_time, request, request_json;
    current_time = moment();
    request_json = {
      path: "/tasks/v1/lists/@default/tasks",
      method: "POST",
      params: "",
      body: {
        title: "testing time"
      }
    };
    request = gapi.client.request(request_json);
    return request.execute(function(resp) {
      var server_time;
      console.log(resp);
      server_time = moment(resp.updated);
      window.time_difference = current_time - server_time;
      request_json = {
        path: "/tasks/v1/lists/@default/tasks/" + resp.id,
        method: "DELETE",
        params: "",
        body: ""
      };
      request = gapi.client.request(request_json);
      return request.execute(function(resp) {
        return window.delete_tasks();
      });
    });
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
          return window.sync_list();
        }
      });
    }
    if (window.incrementer["delete_list"] === 0) {
      _ref2 = DeletedList.all();
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        del = _ref2[_j];
        del.destroy();
      }
      return window.sync_list();
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
          return window.delete_lists();
        }
      });
    }
    if (window.incrementer["delete_task"] === 0) {
      _ref2 = Deletion.all();
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        del = _ref2[_j];
        del.destroy();
      }
      return window.delete_lists();
    }
  };
  window.sync_task = function(tasklist) {
    var request, request_json;
    request_json = {
      path: "/tasks/v1/lists/" + tasklist.id + "/tasks",
      method: "GET",
      params: "",
      body: ""
    };
    request = gapi.client.request(request_json);
    window.incrementer[tasklist.id] = 0;
    return request.execute(function(resp) {
      var c, cloud_tasks, local_tasks_for_list, _i, _len;
      window.list_response = resp;
      cloud_tasks = [];
      if (resp.items != null) {
        cloud_tasks = resp.items;
        for (_i = 0, _len = cloud_tasks.length; _i < _len; _i++) {
          c = cloud_tasks[_i];
          c.listid = tasklist.id;
        }
      }
      local_tasks_for_list = Task.findAllByAttribute("listid", tasklist.id);
      window.local_cloud_sync(local_tasks_for_list, cloud_tasks, Task, function(task) {
        if (window.incrementer[task.listid] === 0) {
          if ($("#" + task.listid).length > 0) {
            return List.find(tasklist.id).save();
          } else {
            return window.App.render_new(List.find(task.listid));
          }
        }
      });
      return window.check_no_incoming_calls(function() {
        var tasklist, _j, _len2, _ref;
        _ref = List.all();
        for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
          tasklist = _ref[_j];
          if ($("#" + tasklist.id).length > 0) {
            List.find(tasklist.id).save();
          } else {
            window.App.render_new(List.find(tasklist.id));
          }
        }
        return $("#syncbutton")[0].src = "images/02-redo@2x.png";
      });
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
          window.list_response = resp;
          return window.local_cloud_sync(List.all(), resp.items, List, window.sync_task);
        });
      });
    } else {
      request = gapi.client.tasks.tasklists.list();
      return request.execute(function(resp) {
        window.list_response = resp;
        window.local_cloud_sync(List.all(), resp.items, List, window.sync_task);
        return true;
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
    _ref = de_array(local), local_dict = _ref[0], local_ids = _ref[1];
    _ref2 = de_array(cloud), cloud_dict = _ref2[0], cloud_ids = _ref2[1];
    window.local_set = new Set(local_ids);
    window.cloud_set = new Set(cloud_ids);
    _ref3 = (local_set.difference(cloud_set)._set);
    for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
      id = _ref3[_i];
      if (local_dict[id].synced === false) {
        window.local_dict = local_dict;
        item.add_to_cloud(local_dict[id], callback);
      } else {
        item.find(id).destroy();
      }
    }
    window.cloud_dict = (function() {
      var _j, _len2, _ref4, _results;
      _ref4 = (cloud_set.difference(local_set)._set);
      _results = [];
      for (_j = 0, _len2 = _ref4.length; _j < _len2; _j++) {
        id = _ref4[_j];
        _results.push(item.add_from_cloud(cloud_dict[id], callback));
      }
      return _results;
    })();
    _ref4 = (cloud_set.intersection(local_set)._set);
    _results = [];
    for (_j = 0, _len2 = _ref4.length; _j < _len2; _j++) {
      id = _ref4[_j];
      _results.push(cloud_dict[id].updated != null ? (local_time = moment(local_dict[id].time), cloud_time = moment(cloud_dict[id].updated).add('milliseconds', window.time_difference), local_time > cloud_time ? item.update_to_cloud(local_dict[id], callback) : item.update_to_local(cloud_dict[id], callback)) : typeof parent_id !== "undefined" && parent_id !== null ? item.update_to_cloud(local_dict[id], callback, parent_id) : item.update_to_cloud(local_dict[id], callback));
    }
    return _results;
  };
  window.check_no_incoming_calls = function(callback) {
    var key, sum, value, _len, _ref;
    sum = 0;
    _ref = window.incrementer;
    for (value = 0, _len = _ref.length; value < _len; value++) {
      key = _ref[value];
      sum = value + sum;
    }
    if (sum === 0) {
      return callback();
    }
  };
  window.dynamic_load_gapi = function(callback) {
    var xhr;
    xhr = new XMLHttpRequest();
    xhr.open("GET", "https://apis.google.com/js/client.js", true);
    xhr.send(null);
    return xhr.onreadystatechange = function(status, response) {
      var a;
      if (xhr.readyState !== 4) {
        return;
      }
      eval(xhr.response);
      return a = setTimeout(callback, 2000);
    };
  };
  window.gapi_loaded = false;
  window.online = function(event) {
    if (navigator.onLine) {
      $("#sync_button").removeClass("disabled");
      return $(document).ready(function() {
        if (!window.gapi_loaded) {
          dynamic_load_gapi("window.initialize_and_sync_list()");
          return window.gapi_loaded = true;
        } else {
          return window.initialize_and_sync_list();
        }
      });
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
