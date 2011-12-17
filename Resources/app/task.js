(function() {
  var DeletedList, Deletion, Finished, Initialized, List, Task, TestStorage, Token, Version, exports;
  Finished = Spine.Model.setup("Finished", ["name", "done", "time", "duedate", "note", "order", "synced", "listid", "time_finished"]);
  Finished.extend(Spine.Model.Local);
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
    logDone: function(id) {
      return this.done(id).forEach(function(rec) {
        Deletion.create({
          deletion_id: rec.synced === true ? rec.id : void 0
        });
        Finished.create({
          name: rec.name,
          note: rec.note,
          listid: rec.listid,
          time_finished: moment().format('MM/DD/YYYY')
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
    add_from_cloud: function(value, callback) {
      var duedate, task;
      if (value.title === "") {
        return true;
      }
      duedate = null;
      if (value.hasOwnProperty("due")) {
        duedate = (new Date(value.due)).format("mm/dd/yyyy");
      }
      task = Task.init({
        name: value.title,
        time: moment(value.updated).toString(),
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
    },
    add_to_cloud: function(task, callback) {
      var data, request, request_json;
      data = Task.toCloudStructure(task);
      request_json = {
        path: "/tasks/v1/lists/" + task.listid + "/tasks",
        method: "POST",
        params: "",
        body: data
      };
      request = gapi.client.request(request_json);
      window.incrementer[task.listid] = window.incrementer[task.listid] + 1;
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
        task.destroy();
        window.incrementer[task.listid] = window.incrementer[task.listid] - 1;
        return callback(new_task);
      });
    },
    delete_from_cloud: function(task, callback) {
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
        window.delete_response = resp;
        return callback();
      });
    },
    update_to_cloud: function(task, callback) {
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
    },
    update_to_local: function(task, callback) {
      var duedate, local_task;
      local_task = Task.find(task.id);
      duedate = null;
      if (task.hasOwnProperty("due")) {
        duedate = (new Date(task.due)).format("mm/dd/yyyy");
      }
      return local_task.updateAttributes({
        name: task.title,
        time: moment(task.updated).toString(),
        synced: true,
        done: task.status === "completed",
        duedate: duedate,
        listid: task.listid
      });
    }
  });
  Deletion = Spine.Model.setup("Deletion", ["deletion_id", "listid"]);
  Deletion.extend(Spine.Model.Local);
  DeletedList = Spine.Model.setup("DeletedList", ["deletion_id"]);
  DeletedList.extend(Spine.Model.Local);
  List = Spine.Model.setup("List", ["name", "description", "synced", "time"]);
  List.extend(Spine.Model.Local);
  List.extend({
    add_from_cloud: function(tasklist, callback) {
      var new_tasklist;
      new_tasklist = List.init({
        name: tasklist.title,
        time: (new Date()).toString()
      });
      new_tasklist.id = tasklist.id;
      new_tasklist.synced = true;
      new_tasklist.save();
      return callback(new_tasklist);
    },
    add_to_cloud: function(tasklist, callback) {
      var request, request_json;
      if (tasklist.id === "@default") {
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
        tasklist.destroy();
        return callback(new_tasklist);
      });
    },
    delete_from_cloud: function(id, callback) {
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
        window.delete_response = resp;
        return callback();
      });
    },
    update_to_cloud: function(tasklist, callback) {
      var request, request_json;
      request_json = {
        path: "/tasks/v1/users/@me/lists/" + tasklist.id,
        method: "PUT",
        params: "",
        body: {
          id: tasklist.id,
          kind: "tasks#taskList",
          title: tasklist.name
        }
      };
      request = gapi.client.request(request_json);
      return request.execute(function(resp) {
        console.log(resp);
        window.update_response = resp;
        return callback(tasklist);
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
  exports.Finished = Finished;
}).call(this);
