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
    add_to_cloud: function(list_name) {
      var request, request_json;
      request_json = {
        path: "/tasks/v1/users/@me/lists",
        method: "POST",
        params: "",
        body: {
          title: list_name
        }
      };
      request = gapi.client.request(request_json);
      return request.execute(function(resp) {
        console.log(resp);
        return window.add_response = resp;
      });
    },
    delete_from_cloud: function(id) {
      return alert("delete from cloud");
    },
    update_to_cloud: function(tasklist) {
      return alert("update to cloud");
    }
  });
  Deletion = Spine.Model.setup("Deletion", ["deletion_id"]);
  Deletion.extend(Spine.Model.Local);
  DeletedList = Spine.Model.setup("DeletedList", ["deletion_id"]);
  DeletedList.extend(Spine.Model.Local);
  List = Spine.Model.setup("List", ["name", "description", "synced", "time"]);
  List.extend(Spine.Model.Local);
  List.extend({
    add_to_cloud: function(list_name) {
      var request, request_json;
      request_json = {
        path: "/tasks/v1/users/@me/lists",
        method: "POST",
        params: "",
        body: {
          title: list_name
        }
      };
      request = gapi.client.request(request_json);
      return request.execute(function(resp) {
        console.log(resp);
        return window.add_response = resp;
      });
    },
    delete_from_cloud: function(id) {
      return alert("delete from cloud");
    },
    update_to_cloud: function(tasklist) {
      return alert("update to cloud");
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
