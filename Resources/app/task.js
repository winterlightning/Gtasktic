(function() {
  var DeletedList, Deletion, Initialized, List, Task, TestStorage, Token, Version, exports;
  Task = Spine.Model.setup("Task", ["name", "done", "time", "duedate", "note", "order", "synced", "listid"]);
  Task.extend(Spine.Model.Local);
  Task.extend({
    active: function(id) {
      return this.select(function(item) {
        return !item.done && (item.listid === id);
      });
    },
    done: function(id) {
      return this.select(function(item) {
        return !!item.done && (item.listid === id);
      });
    },
    list: function(id) {
      return this.select(function(item) {
        return item.listid === id;
      });
    },
    destroyDone: function(id) {
      return this.done(id).forEach(function(rec) {
        Deletion.create({
          deletion_id: rec.synced === true ? rec.id : void 0
        });
        return rec.destroy();
      });
    },
    toCloudStructure: function(task) {
      var data;
      data = {
        title: task.name
      };
      if (task.duedate != null) {
        data.due = moment(a.duedate).format("YYYY-MM-DD") + "T12:00:00.000Z";
      }
      if (task.note != null) {
        data.notes = task.note;
      }
      if (task.done) {
        data.status = "completed";
      } else {
        data.status = "needsAction";
      }
      return data;
    },
    add_to_cloud: function(task) {
      var data, request, request_json;
      data = Task.toCloudStructure(task);
      request_json = {
        path: "/tasks/v1/lists/" + task.listid + "/tasks",
        method: "POST",
        params: "",
        body: data
      };
      request = gapi.client.request(request_json);
      return request.execute(function(resp) {
        var new_task, old_id;
        console.log(resp);
        window.add_response = resp;
        old_id = task.id;
        data = {
          name: task.name,
          time: task.time,
          listid: task.listid
        };
        if (task.duedate != null) {
          data.duedate = task.duedate;
        }
        if (task.note != null) {
          data.note = task.note;
        }
        new_task = Task.init(data);
        new_task.id = resp.id;
        new_task.save();
        return task.destroy();
      });
    },
    delete_from_cloud: function(task) {
      var request, request_json;
      request_json = {
        path: "/tasks/v1/lists/" + task.listid + "/tasks/" + task.id,
        method: "DELETE",
        params: "",
        body: ""
      };
      request = gapi.client.request(request_json);
      return request.execute(function(resp) {
        console.log(resp);
        return window.delete_response = resp;
      });
    },
    update_to_cloud: function(task) {
      var data, request, request_json;
      data = Task.toCloudStructure(task);
      data.id = task.id;
      request_json = {
        path: "/tasks/v1/lists/" + task.listid + "/tasks/" + task.id,
        method: "PUT",
        params: "",
        body: data
      };
      request = gapi.client.request(request_json);
      return request.execute(function(resp) {
        console.log(resp);
        return window.update_response = resp;
      });
    }
  });
  Deletion = Spine.Model.setup("Deletion", ["deletion_id"]);
  Deletion.extend(Spine.Model.Local);
  DeletedList = Spine.Model.setup("DeletedList", ["deletion_id"]);
  DeletedList.extend(Spine.Model.Local);
  List = Spine.Model.setup("List", ["name", "description", "synced", "time"]);
  List.extend(Spine.Model.Local);
  List.extend({
    add_from_cloud: function(tasklist) {
      var new_tasklist;
      new_tasklist = List.init({
        name: tasklist.title,
        time: (new Date()).toString()
      });
      new_tasklist.id = tasklist.id;
      new_tasklist.save();
      return window.App.render_new(new_tasklist);
    },
    add_to_cloud: function(tasklist) {
      var request, request_json;
      if (tasklist.name === "@default") {
        return true;
      }
      request_json = {
        path: "/tasks/v1/users/@me/lists",
        method: "POST",
        params: "",
        body: {
          title: tasklist.name
        }
      };
      request = gapi.client.request(request_json);
      return request.execute(function(resp) {
        var new_tasklist, old_id, task, _i, _len, _ref;
        console.log(resp);
        window.add_response = resp;
        old_id = tasklist.id;
        new_tasklist = List.init({
          name: tasklist.name,
          time: (new Date()).toString()
        });
        new_tasklist.id = resp.id;
        new_tasklist.save();
        _ref = Task.findAllByAttribute("listid", old_id);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          task = _ref[_i];
          task.listid = new_tasklist.id;
          task.save();
        }
        window.App.render_new(new_tasklist);
        return tasklist.destroy();
      });
    },
    delete_from_cloud: function(id) {
      var request, request_json;
      request_json = {
        path: "/tasks/v1/users/@me/lists/" + id,
        method: "DELETE",
        params: "",
        body: ""
      };
      request = gapi.client.request(request_json);
      return request.execute(function(resp) {
        console.log(resp);
        return window.delete_response = resp;
      });
    },
    update_to_cloud: function(tasklist) {
      var request, request_json;
      request_json = {
        path: "/tasks/v1/users/@me/lists/" + tasklist.id,
        method: "PUT",
        params: "",
        body: {
          id: tasklist.id,
          kind: "tasks#taskList",
          title: tasklist.title
        }
      };
      request = gapi.client.request(request_json);
      return request.execute(function(resp) {
        console.log(resp);
        return window.update_response = resp;
      });
    }
  });
  Version = Spine.Model.setup("Version", ["number"]);
  Version.extend(Spine.Model.Local);
  Initialized = Spine.Model.setup("Initialized", ["flag"]);
  Initialized.extend(Spine.Model.Local);
  Token = Spine.Model.setup("Token", ["current_token", "expiration", "refresh_token"]);
  Token.extend(Spine.Model.Local);
  TestStorage = Spine.Model.setup("TestStorage", ["stored"]);
  TestStorage.extend(Spine.Model.Local);
  exports = this;
  exports.Deletion = Deletion;
  exports.Task = Task;
  exports.DeletedList = DeletedList;
  exports.List = List;
  exports.Version = Version;
  exports.Initialized = Initialized;
  exports.Token = Token;
}).call(this);
