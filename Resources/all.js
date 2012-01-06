(function() {
  var BackgroundImage, DeletedList, Deletion, Finished, Initialized, List, Set, Task, TestStorage, Token, Version, exports, make_child, nextItem, open_for_edit, pressed_delete, prevItem, setting_url, ti_window, updateItems;
  (function() {
    var $, Class, Controller, Events, Log, Model, Spine, eventSplitter, isArray, makeArray, moduleKeywords;
    if (typeof exports !== "undefined") {
      Spine = exports;
    } else {
      Spine = this.Spine = {};
    }
    Spine.version = "0.0.4";
    $ = Spine.$ = this.jQuery || this.Zepto || function() {
      return arguments[0];
    };
    makeArray = Spine.makeArray = function(args) {
      return Array.prototype.slice.call(args, 0);
    };
    isArray = Spine.isArray = function(value) {
      return Object.prototype.toString.call(value) === "[object Array]";
    };
    if (typeof Array.prototype.indexOf === "undefined") {
      Array.prototype.indexOf = function(value) {
        var i;
        i = 0;
        while (i < this.length) {
          if (this[i] === value) {
            return i;
          }
          i++;
        }
        return -1;
      };
    }
    Events = Spine.Events = {
      bind: function(ev, callback) {
        var calls, evs, i;
        evs = ev.split(" ");
        calls = this._callbacks || (this._callbacks = {});
        i = 0;
        while (i < evs.length) {
          (this._callbacks[evs[i]] || (this._callbacks[evs[i]] = [])).push(callback);
          i++;
        }
        return this;
      },
      trigger: function() {
        var args, calls, ev, i, l, list;
        args = makeArray(arguments);
        ev = args.shift();
        if (!(calls = this._callbacks)) {
          return false;
        }
        if (!(list = this._callbacks[ev])) {
          return false;
        }
        i = 0;
        l = list.length;
        while (i < l) {
          if (list[i].apply(this, args) === false) {
            return false;
          }
          i++;
        }
        return true;
      },
      unbind: function(ev, callback) {
        var calls, i, l, list;
        if (!ev) {
          this._callbacks = {};
          return this;
        }
        if (!(calls = this._callbacks)) {
          return this;
        }
        if (!(list = calls[ev])) {
          return this;
        }
        if (!callback) {
          delete this._callbacks[ev];
          return this;
        }
        i = 0;
        l = list.length;
        while (i < l) {
          if (callback === list[i]) {
            list = list.slice();
            list.splice(i, 1);
            calls[ev] = list;
            break;
          }
          i++;
        }
        return this;
      }
    };
    Log = Spine.Log = {
      trace: true,
      logPrefix: "(App)",
      log: function() {
        var args;
        if (!this.trace) {
          return;
        }
        if (typeof console === "undefined") {
          return;
        }
        args = makeArray(arguments);
        if (this.logPrefix) {
          args.unshift(this.logPrefix);
        }
        console.log.apply(console, args);
        return this;
      }
    };
    if (typeof Object.create !== "function") {
      Object.create = function(o) {
        var F;
        F = function() {};
        F.prototype = o;
        return new F();
      };
    }
    moduleKeywords = ["included", "extended"];
    Class = Spine.Class = {
      inherited: function() {},
      created: function() {},
      prototype: {
        initialize: function() {},
        init: function() {}
      },
      create: function(include, extend) {
        var object;
        object = Object.create(this);
        object.parent = this;
        object.prototype = object.fn = Object.create(this.prototype);
        if (include) {
          object.include(include);
        }
        if (extend) {
          object.extend(extend);
        }
        object.created();
        this.inherited(object);
        return object;
      },
      init: function() {
        var instance;
        instance = Object.create(this.prototype);
        instance.parent = this;
        instance.initialize.apply(instance, arguments);
        instance.init.apply(instance, arguments);
        return instance;
      },
      proxy: function(func) {
        var thisObject;
        thisObject = this;
        return function() {
          return func.apply(thisObject, arguments);
        };
      },
      proxyAll: function() {
        var functions, i, _results;
        functions = makeArray(arguments);
        i = 0;
        _results = [];
        while (i < functions.length) {
          this[functions[i]] = this.proxy(this[functions[i]]);
          _results.push(i++);
        }
        return _results;
      },
      include: function(obj) {
        var included, key;
        for (key in obj) {
          if (moduleKeywords.indexOf(key) === -1) {
            this.fn[key] = obj[key];
          }
        }
        included = obj.included;
        if (included) {
          included.apply(this);
        }
        return this;
      },
      extend: function(obj) {
        var extended, key;
        for (key in obj) {
          if (moduleKeywords.indexOf(key) === -1) {
            this[key] = obj[key];
          }
        }
        extended = obj.extended;
        if (extended) {
          extended.apply(this);
        }
        return this;
      }
    };
    Class.prototype.proxy = Class.proxy;
    Class.prototype.proxyAll = Class.proxyAll;
    Class.inst = Class.init;
    Class.sub = Class.create;
    Spine.guid = function() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r, v;
        r = Math.random() * 16 | 0;
        v = (c === "x" ? r : r & 0x3 | 0x8);
        return v.toString(16);
      }).toUpperCase();
    };
    Model = Spine.Model = Class.create();
    Model.extend(Events);
    Model.extend({
      setup: function(name, atts) {
        var model;
        model = Model.sub();
        if (name) {
          model.name = name;
        }
        if (atts) {
          model.attributes = atts;
        }
        return model;
      },
      created: function(sub) {
        this.records = {};
        return this.attributes = (this.attributes ? makeArray(this.attributes) : []);
      },
      find: function(id) {
        var record;
        record = this.records[id];
        if (!record) {
          throw "Unknown record";
        }
        return record.clone();
      },
      exists: function(id) {
        try {
          return this.find(id);
        } catch (e) {
          return false;
        }
      },
      refresh: function(values) {
        var i, il, record;
        values = this.fromJSON(values);
        this.records = {};
        i = 0;
        il = values.length;
        while (i < il) {
          record = values[i];
          record.newRecord = false;
          this.records[record.id] = record;
          i++;
        }
        this.trigger("refresh");
        return this;
      },
      select: function(callback) {
        var key, result;
        result = [];
        for (key in this.records) {
          if (callback(this.records[key])) {
            result.push(this.records[key]);
          }
        }
        return this.cloneArray(result);
      },
      findByAttribute: function(name, value) {
        var key;
        for (key in this.records) {
          if (this.records[key][name] === value) {
            return this.records[key].clone();
          }
        }
      },
      findAllByAttribute: function(name, value) {
        return this.select(function(item) {
          return item[name] === value;
        });
      },
      each: function(callback) {
        var key, _results;
        _results = [];
        for (key in this.records) {
          _results.push(callback(this.records[key]));
        }
        return _results;
      },
      all: function() {
        return this.cloneArray(this.recordsValues());
      },
      first: function() {
        var record;
        record = this.recordsValues()[0];
        return record && record.clone();
      },
      last: function() {
        var record, values;
        values = this.recordsValues();
        record = values[values.length - 1];
        return record && record.clone();
      },
      count: function() {
        return this.recordsValues().length;
      },
      deleteAll: function() {
        var key, _results;
        _results = [];
        for (key in this.records) {
          _results.push(delete this.records[key]);
        }
        return _results;
      },
      destroyAll: function() {
        var key, _results;
        _results = [];
        for (key in this.records) {
          _results.push(this.records[key].destroy());
        }
        return _results;
      },
      update: function(id, atts) {
        return this.find(id).updateAttributes(atts);
      },
      create: function(atts) {
        var record;
        record = this.init(atts);
        return record.save();
      },
      destroy: function(id) {
        return this.find(id).destroy();
      },
      sync: function(callback) {
        return this.bind("change", callback);
      },
      fetch: function(callbackOrParams) {
        if (typeof callbackOrParams === "function") {
          return this.bind("fetch", callbackOrParams);
        } else {
          return this.trigger.apply(this, ["fetch"].concat(makeArray(arguments)));
        }
      },
      toJSON: function() {
        return this.recordsValues();
      },
      fromJSON: function(objects) {
        var i, results;
        if (!objects) {
          return;
        }
        if (typeof objects === "string") {
          objects = JSON.parse(objects);
        }
        if (isArray(objects)) {
          results = [];
          i = 0;
          while (i < objects.length) {
            results.push(this.init(objects[i]));
            i++;
          }
          return results;
        } else {
          return this.init(objects);
        }
      },
      recordsValues: function() {
        var key, result;
        result = [];
        for (key in this.records) {
          result.push(this.records[key]);
        }
        return result;
      },
      cloneArray: function(array) {
        var i, result;
        result = [];
        i = 0;
        while (i < array.length) {
          result.push(array[i].clone());
          i++;
        }
        return result;
      }
    });
    Model.include({
      model: true,
      newRecord: true,
      init: function(atts) {
        if (atts) {
          this.load(atts);
        }
        return this.trigger("init", this);
      },
      isNew: function() {
        return this.newRecord;
      },
      isValid: function() {
        return !this.validate();
      },
      validate: function() {},
      load: function(atts) {
        var name, _results;
        _results = [];
        for (name in atts) {
          _results.push(this[name] = atts[name]);
        }
        return _results;
      },
      attributes: function() {
        var attr, i, result;
        result = {};
        i = 0;
        while (i < this.parent.attributes.length) {
          attr = this.parent.attributes[i];
          result[attr] = this[attr];
          i++;
        }
        result.id = this.id;
        return result;
      },
      eql: function(rec) {
        return rec && rec.id === this.id && rec.parent === this.parent;
      },
      save: function() {
        var error;
        error = this.validate();
        if (error) {
          this.trigger("error", this, error);
          return false;
        }
        this.trigger("beforeSave", this);
        if (this.newRecord) {
          this.create();
        } else {
          this.update();
        }
        this.trigger("save", this);
        return this;
      },
      updateAttribute: function(name, value) {
        this[name] = value;
        return this.save();
      },
      updateAttributes: function(atts) {
        this.load(atts);
        return this.save();
      },
      destroy: function() {
        this.trigger("beforeDestroy", this);
        delete this.parent.records[this.id];
        this.destroyed = true;
        this.trigger("destroy", this);
        return this.trigger("change", this, "destroy");
      },
      dup: function() {
        var result;
        result = this.parent.init(this.attributes());
        result.newRecord = this.newRecord;
        return result;
      },
      clone: function() {
        return Object.create(this);
      },
      reload: function() {
        var original;
        if (this.newRecord) {
          return this;
        }
        original = this.parent.find(this.id);
        this.load(original.attributes());
        return original;
      },
      toJSON: function() {
        return this.attributes();
      },
      exists: function() {
        return this.id && this.id in this.parent.records;
      },
      update: function() {
        var clone, records;
        this.trigger("beforeUpdate", this);
        records = this.parent.records;
        records[this.id].load(this.attributes());
        clone = records[this.id].clone();
        this.trigger("update", clone);
        return this.trigger("change", clone, "update");
      },
      create: function() {
        var clone, records;
        this.trigger("beforeCreate", this);
        if (!this.id) {
          this.id = Spine.guid();
        }
        this.newRecord = false;
        records = this.parent.records;
        records[this.id] = this.dup();
        clone = records[this.id].clone();
        this.trigger("create", clone);
        return this.trigger("change", clone, "create");
      },
      bind: function(events, callback) {
        return this.parent.bind(events, this.proxy(function(record) {
          if (record && this.eql(record)) {
            return callback.apply(this, arguments);
          }
        }));
      },
      trigger: function() {
        return this.parent.trigger.apply(this.parent, arguments);
      }
    });
    eventSplitter = /^(\w+)\s*(.*)$/;
    Controller = Spine.Controller = Class.create({
      tag: "div",
      initialize: function(options) {
        var key;
        this.options = options;
        for (key in this.options) {
          this[key] = this.options[key];
        }
        if (!this.el) {
          this.el = document.createElement(this.tag);
        }
        this.el = $(this.el);
        if (!this.events) {
          this.events = this.parent.events;
        }
        if (!this.elements) {
          this.elements = this.parent.elements;
        }
        if (this.events) {
          this.delegateEvents();
        }
        if (this.elements) {
          this.refreshElements();
        }
        if (this.proxied) {
          return this.proxyAll.apply(this, this.proxied);
        }
      },
      $: function(selector) {
        return $(selector, this.el);
      },
      delegateEvents: function() {
        var eventName, key, match, method, methodName, selector, _results;
        _results = [];
        for (key in this.events) {
          methodName = this.events[key];
          method = this.proxy(this[methodName]);
          match = key.match(eventSplitter);
          eventName = match[1];
          selector = match[2];
          _results.push(selector === "" ? this.el.bind(eventName, method) : this.el.delegate(selector, eventName, method));
        }
        return _results;
      },
      refreshElements: function() {
        var key, _results;
        _results = [];
        for (key in this.elements) {
          _results.push(this[this.elements[key]] = this.$(key));
        }
        return _results;
      },
      delay: function(func, timeout) {
        return setTimeout(this.proxy(func), timeout || 0);
      }
    });
    Controller.include(Events);
    Controller.include(Log);
    Spine.App = Class.create();
    Spine.App.extend(Events);
    return Controller.fn.App = Spine.App;
  })();
  Set = (function() {
    function Set(set) {
      this._set = (set === void 0 ? [] : set);
      this.length = this._set.length;
      this.contains = function(element) {
        return this._set.indexOf(element) !== -1;
      };
    }
    Set.prototype.union = function(s) {
      var A, B, i, set;
      A = (s.length > this.length ? s : this);
      B = (s.length > this.length ? this : s);
      set = A.copy();
      i = 0;
      while (i < B.length) {
        set.add(B._set[i]);
        i++;
      }
      return set;
    };
    Set.prototype.intersection = function(s) {
      var A, B, element, i, set;
      set = new Set();
      A = (s.length > this.length ? s : this);
      B = (s.length > this.length ? this : s);
      i = 0;
      while (i < B.length) {
        element = B._set[i];
        if (A.contains(element)) {
          set.add(element);
        }
        i++;
      }
      return set;
    };
    Set.prototype.difference = function(s) {
      var element, i, set;
      set = new Set();
      i = 0;
      while (i < this.length) {
        element = this._set[i];
        if (!s.contains(element)) {
          set.add(element);
        }
        i++;
      }
      return set;
    };
    Set.prototype.symmetricDifference = function(s) {
      return this.union(s).difference(this.intersection(s));
    };
    Set.prototype.isSuperSet = function(s) {
      var i;
      i = 0;
      while (i < s.length) {
        if (!this.contains(s._set[i])) {
          return false;
        }
        i++;
      }
      return true;
    };
    Set.prototype.isSubSet = function(s) {
      var i;
      i = 0;
      while (i < this.length) {
        if (!s.contains(this._set[i])) {
          return false;
        }
        i++;
      }
      return true;
    };
    Set.prototype.add = function(element) {
      if (this._set.indexOf(element) === -1) {
        this._set.push(element);
        this.length++;
      }
      return this.length;
    };
    Set.prototype.remove = function(element) {
      var i;
      i = this._set.indexOf(element);
      if (i !== -1) {
        this.length--;
        return this._set.splice(i, 1)[0];
      } else {
        return null;
      }
    };
    Set.prototype.copy = function() {
      return new Set(this._set.slice());
    };
    Set.prototype.asArray = function() {
      return this._set;
    };
    return Set;
  })();
  exports = this;
  exports.Set = Set;
  Spine.Model.Local = {
    extended: function() {
      this.sync(this.proxy(this.saveLocal));
      return this.fetch(this.proxy(this.loadLocal));
    },
    saveLocal: function() {
      var result;
      result = JSON.stringify(this);
      return localStorage[this.name] = result;
    },
    loadLocal: function() {
      var result;
      result = localStorage[this.name];
      if (!result) {
        return;
      }
      result = JSON.parse(result);
      return this.refresh(result);
    }
  };
  Finished = Spine.Model.setup("Finished", ["name", "done", "time", "duedate", "note", "order", "synced", "listid", "time_finished"]);
  Finished.extend(Spine.Model.Local);
  Task = Spine.Model.setup("Task", ["name", "done", "time", "duedate", "note", "order", "synced", "listid", "updated"]);
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
    synced: function() {
      return this.select(function(item) {
        return !item.synced || !item.updated;
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
        var cur_task, d;
        if (rec.synced === true) {
          cur_task = rec;
          if (navigator.onLine) {
            $("#syncbutton")[0].src = "images/ajax-loader.gif";
            window.settingapp.setup_api_on_entry(function() {
              return Task.delete_from_cloud(cur_task, function() {
                return $("#syncbutton")[0].src = "images/02-redo@2x.png";
              });
            });
          } else {
            d = Deletion.init({
              deletion_id: rec.id,
              listid: rec.listid
            });
            d.id = rec.id;
            d.save();
          }
        }
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
      if ((task.duedate != null) && task.duedate !== "") {
        data.due = moment(task.duedate).format("YYYY-MM-DD") + "T12:00:00.000Z";
      }
      if ((task.note != null) && task.note !== "") {
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
      console.log("add from cloud");
      if (value.title === "") {
        return true;
      }
      duedate = null;
      if (value.hasOwnProperty("due")) {
        duedate = (new Date(value.due)).format("mm/dd/yyyy");
      }
      task = Task.init({
        name: value.title,
        time: (moment(value.updated).add('milliseconds', window.time_difference)).toString(),
        synced: true,
        done: value.status === "completed",
        duedate: duedate,
        listid: value.listid,
        updated: true
      });
      task.id = value.id;
      if (value.hasOwnProperty("notes")) {
        task.note = value.notes;
      }
      return task.save();
    },
    add_to_cloud: function(task, callback) {
      var data, request, request_json;
      console.log("add to cloud");
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
          time: (moment(resp.updated) + window.time_difference).toString(),
          listid: task.listid,
          order: task.order,
          synced: true,
          updated: true
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
      console.log("delete from cloud");
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
      console.log("update to cloud");
      data = Task.toCloudStructure(task);
      data.id = task.id;
      window.updatedata = data;
      request_json = {
        path: "/tasks/v1/lists/" + task.listid + "/tasks/" + task.id,
        method: "PUT",
        params: "",
        body: data
      };
      request = gapi.client.request(request_json);
      return request.execute(function(resp) {
        console.log(resp);
        window.update_response = resp;
        task.updated = true;
        task.save();
        return callback(task);
      });
    },
    update_to_local: function(task, callback) {
      var duedate, local_task;
      console.log("update to local");
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
  List = Spine.Model.setup("List", ["name", "description", "synced", "time", "updated"]);
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
      new_tasklist.updated = true;
      new_tasklist.save();
      return callback(new_tasklist);
    },
    synced: function() {
      return this.select(function(item) {
        return !item.synced || !item.updated;
      });
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
          time: (new Date()).toString(),
          synced: true,
          updated: true
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
  BackgroundImage = Spine.Model.setup("BackgroundImage", ["image"]);
  BackgroundImage.extend(Spine.Model.Local);
  exports = this;
  exports.Deletion = Deletion;
  exports.Task = Task;
  exports.DeletedList = DeletedList;
  exports.List = List;
  exports.Version = Version;
  exports.Initialized = Initialized;
  exports.Token = Token;
  exports.Finished = Finished;
  exports.BackgroundImage = BackgroundImage;
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
  Task.ordersort = function(a, b) {
    if (a.order < b.order) {
      return -1;
    } else {
      return 1;
    }
  };
  jQuery(function($) {
    window.Tasks = Spine.Controller.create({
      tag: "li",
      proxied: ["render", "remove"],
      events: {
        "change   input[type=checkbox]": "toggle",
        "click    .destroy": "destroy",
        "dblclick .item": "edit",
        "click .item": "toggle_select",
        "keypress input[type=text]": "blurOnEnter",
        "submit .edittask_form": "close"
      },
      elements: {
        "input.name": "input",
        ".item": "wrapper",
        ".datepicker": "inputdate",
        "textarea.note": "textarea"
      },
      init: function() {
        this.item.bind("update", this.render);
        window.taskdict[this.item.id] = this;
        return this.item.bind("destroy", this.remove);
      },
      render: function() {
        var elements;
        elements = $("#taskTemplate").tmpl(this.item);
        this.el.html(elements);
        this.refreshElements();
        this.el.data("id", this.item.id);
        this.el.find(".datepicker").datepicker({
          constrainInput: true
        });
        return this;
      },
      toggle: function() {
        var cur_task;
        this.item.done = !this.item.done;
        this.item.time = moment().toString();
        if (navigator.onLine) {
          $("#syncbutton")[0].src = "images/ajax-loader.gif";
          this.item.updated = true;
          this.item.save();
          cur_task = this.item;
          return window.settingapp.setup_api_on_entry(function() {
            return Task.update_to_cloud(cur_task, function() {
              return $("#syncbutton")[0].src = "images/02-redo@2x.png";
            });
          });
        } else {
          this.item.updated = false;
          return this.item.save();
        }
      },
      destroy: function() {
        var cur_task, d;
        if (this.item.synced === true) {
          cur_task = this.item;
          if (navigator.onLine) {
            $("#syncbutton")[0].src = "images/ajax-loader.gif";
            window.settingapp.setup_api_on_entry(function() {
              return Task.delete_from_cloud(cur_task, function() {
                return $("#syncbutton")[0].src = "images/02-redo@2x.png";
              });
            });
          } else {
            d = Deletion.init({
              deletion_id: this.item.id,
              listid: this.item.listid
            });
            d.id = this.item.id;
            d.save();
          }
        }
        return this.item.destroy();
      },
      edit: function() {
        if (this.wrapper.hasClass("editing")) {
          return;
        }
        if (this.el.hasClass("task_selected")) {
          this.el.removeClass("task_selected");
        }
        if (window.last_opened !== "") {
          window.taskdict[window.last_opened].close();
        }
        window.last_opened = this.item.id;
        this.wrapper.addClass("editing");
        return this.input.focus();
      },
      blurOnEnter: function(e) {
        if (e.keyCode === 13) {
          return e.target.blur();
        }
      },
      toggle_select: function() {
        var element;
        if (this.wrapper.hasClass("editing")) {
          return;
        }
        if (window.last_opened !== "") {
          window.taskdict[window.last_opened].close();
        }
        window.last_opened = "";
        $(".task_selected").removeClass("task_selected");
        element = this.el;
        $("li").each(function(idx, value) {
          if ($(value).data("id") === $(element).data("id")) {
            return window.cur = idx;
          }
        });
        return this.el.addClass("task_selected");
      },
      close: function() {
        var cur_task, element, input_value;
        input_value = this.input.val().replace("'", "''");
        this.wrapper.removeClass("editing");
        if (navigator.onLine) {
          $("#syncbutton")[0].src = "images/ajax-loader.gif";
          this.item.updateAttributes({
            name: input_value,
            time: moment().toString(),
            duedate: this.inputdate.val(),
            note: this.textarea.val(),
            updated: true
          });
          cur_task = this.item;
          window.settingapp.setup_api_on_entry(function() {
            return Task.update_to_cloud(cur_task, function() {
              return $("#syncbutton")[0].src = "images/02-redo@2x.png";
            });
          });
        } else {
          this.item.updateAttributes({
            name: input_value,
            time: moment().toString(),
            duedate: this.inputdate.val(),
            note: this.textarea.val(),
            updated: false
          });
        }
        this.el.addClass("task_selected");
        element = this.el;
        $("li").each(function(idx, value) {
          if ($(value).data("id") === $(element).data("id")) {
            return window.cur = idx;
          }
        });
        window.last_opened = "";
        return false;
      },
      remove: function() {
        return this.el.remove();
      }
    });
    window.TaskApp = Spine.Controller.create({
      tag: "div",
      proxied: ["addAll", "render", "renderCount", "remove", "attach"],
      events: {
        "click  .clear": "clear",
        "click  a.add": "addOne",
        "click  .deletelist": "deletelist",
        "click  .editlist": "editlist",
        "submit form.addform": "create_new"
      },
      elements: {
        ".items": "items",
        ".countVal": "count",
        ".clear": "clear",
        ".add": "add",
        ".addinputs .addtasks": "input",
        ".addinputs": "addform"
      },
      init: function() {
        this.item.bind("update", this.render);
        this.item.bind("update", this.attach);
        this.item.bind("destroy", this.remove);
        Task.bind("change", this.renderCount);
        return Task.fetch();
      },
      addAll: function() {
        var a, ordered;
        ordered = Task.list(this.item.id).sort(Task.ordersort);
        a = this.el;
        return $.each(ordered, function(key, value) {
          var view;
          view = Tasks.init({
            item: value
          });
          return a.find(".items").append(view.render().el);
        });
      },
      render: function() {
        var elements, tab_el, tab_html, tab_id, this_element, this_tab;
        elements = $("#listTemplate").tmpl(this.item);
        this.el.html(elements);
        this.refreshElements();
        this.el.data("id", this.item.id);
        this.addAll();
        if (this.item.id === "@default") {
          this.el.addClass("firstlist");
        }
        this.renderCount();
        tab_el = $(".listfilter");
        tab_id = "l" + (String(this.item.id).replace("@", ""));
        $("#" + tab_id).remove();
        tab_html = "<button id='" + tab_id + "'>" + this.item.name + "</button>";
        tab_el.prepend(tab_html);
        this.tab = $(String("#" + tab_id));
        this_element = "#" + this.item.id;
        this_tab = this.tab;
        this.tab.click(function() {
          $(".listdiv").hide();
          if (this_element === "#@default") {
            $(".firstlist .listdiv").show();
          } else {
            $(this_element).show();
          }
          $(".filterselected").removeClass("filterselected");
          return this_tab.addClass("filterselected");
        });
        return this;
      },
      renderCount: function() {
        var active, inactive;
        active = Task.active(this.item.id).length;
        this.count.text(active);
        return inactive = Task.done(this.item.id).length;
      },
      clear: function() {
        return Task.logDone(this.item.id);
      },
      addOne: function() {
        var new_task, view;
        new_task = Task.create({
          name: "",
          time: moment().toString(),
          done: false,
          order: Task.all().length + 1,
          synced: false,
          listid: this.item.id
        });
        view = Tasks.init({
          item: new_task
        });
        this.items.append(view.render().el);
        return view.edit();
      },
      deletelist: function() {
        var cur_id, r, tasks;
        r = confirm("Are you sure you want to delete this list and all it's tasks");
        if (r) {
          if (navigator.onLine) {
            if (this.item.synced) {
              cur_id = this.item.id;
              $("#syncbutton")[0].src = "images/ajax-loader.gif";
              window.settingapp.setup_api_on_entry(function() {
                return List.delete_from_cloud(cur_id, function() {
                  return $("#syncbutton")[0].src = "images/02-redo@2x.png";
                });
              });
            }
          } else {
            DeletedList.create({
              deletion_id: this.item.synced === true ? this.item.id : void 0
            });
            tasks = Task.list(this.item.id);
            $.each(tasks, function(key, value) {
              Deletion.create({
                deletion_id: value.id,
                listid: value.synced === true ? value.listid : void 0
              });
              return value.destroy();
            });
          }
          this.remove();
          return this.item.destroy();
        }
      },
      create_new: function() {
        var input_value, new_task, this_list, view;
        input_value = this.input.val().replace("'", "''");
        if (navigator.onLine) {
          $("#syncbutton")[0].src = "images/ajax-loader.gif";
          new_task = Task.create({
            name: input_value,
            time: moment().toString(),
            done: false,
            order: Task.all().length + 1,
            synced: true,
            listid: this.item.id,
            updated: true
          });
          this_list = this.items;
          window.settingapp.setup_api_on_entry(function() {
            return Task.add_to_cloud(new_task, function(new_task) {
              var view;
              $("#syncbutton")[0].src = "images/02-redo@2x.png";
              view = Tasks.init({
                item: new_task
              });
              return this_list.append(view.render().el);
            });
          });
        } else {
          new_task = Task.create({
            name: input_value,
            time: moment().toString(),
            done: false,
            order: Task.all().length + 1,
            synced: false,
            listid: this.item.id,
            updated: false
          });
        }
        view = Tasks.init({
          item: new_task
        });
        this.items.append(view.render().el);
        this.input.val("");
        return false;
      },
      remove: function() {
        this.el.remove();
        return this.tab.remove();
      },
      editlist: function() {
        var d;
        $("#list_name").val(this.item.name);
        $("#list_description").val(this.item.description);
        d = $("#dialog_addlist").dialog({
          modal: true,
          title: "Edit this list",
          dialogClass: "editing",
          buttons: {
            'Edit List': function() {
              edit_list();
              return $(this).dialog("close");
            }
          }
        });
        return d.data("id", this.item.id);
      },
      attach: function() {
        this.el.find(".roundedlist").sortable({
          update: function(event, ui) {
            return $(".roundedlist li").each(function(index) {
              var current, current_list_id, new_list, new_task, this_list;
              if (navigator.onLine) {
                current = Task.find($(this).data("id"));
                current_list_id = ($(this).parent().parent())[0].id;
                if (current.listid !== ($(this).parent().parent())[0].id) {
                  $("#syncbutton")[0].src = "images/ajax-loader.gif";
                  new_task = Task.init({
                    name: current.name,
                    time: moment().toString(),
                    done: current.done,
                    order: $(this).index(),
                    synced: false,
                    listid: ($(this).parent().parent())[0].id,
                    updated: false
                  });
                  new_task.save();
                  this_list = List.find(current_list_id);
                  this_list.save();
                  window.settingapp.setup_api_on_entry(function() {
                    return Task.add_to_cloud(new_task, function(new_task) {
                      $("#syncbutton")[0].src = "images/02-redo@2x.png";
                      return this_list.save();
                    });
                  });
                  window.settingapp.setup_api_on_entry(function() {
                    return Task.delete_from_cloud(current, function() {
                      return console.log("old task deleted");
                    });
                  });
                  return current.destroy();
                } else {
                  current.order = $(this).index();
                  return current.save();
                }
              } else {
                current = Task.find($(this).data("id"));
                current_list_id = ($(this).parent().parent())[0].id;
                if (current.listid !== ($(this).parent().parent())[0].id) {
                  new_task = Task.init({
                    name: current.name,
                    time: moment().toString(),
                    done: current.done,
                    order: $(this).index(),
                    synced: false,
                    listid: ($(this).parent().parent())[0].id,
                    updated: false
                  });
                  new_task.save();
                  current.destroy();
                  if (List.exists(current_list_id)) {
                    new_list = List.find(current_list_id);
                    return new_list.save();
                  }
                } else {
                  current.order = $(this).index();
                  return current.save();
                }
              }
            });
          },
          connectWith: ".connectedsortable"
        });
        this.el.find(".addinputs").toggle();
        this.el.find(".addtoggle").click(function(event) {
          var clicked;
          clicked = $(this);
          clicked.toggle();
          clicked.parent().children(".addinputs").toggle();
          return clicked.parent().find(".addinputs .addtasks").focus();
        });
        return this.el.find(".doneadding").click(function(event) {
          var clicked;
          clicked = $(this);
          clicked.parent().parent().children(".addtoggle").toggle();
          return clicked.parent().toggle();
        });
      }
    });
    window.allLists = Spine.Controller.create({
      el: $("#listsoftasks"),
      proxied: ["render"],
      init: function() {
        List.fetch();
        return this.render();
      },
      render: function() {
        var cur_el, lists;
        lists = List.all();
        cur_el = this.el;
        return $.each(lists, function(key, value) {
          var list;
          list = TaskApp.init({
            item: value
          });
          cur_el.append(list.render().el);
          return list.attach();
        });
      },
      render_new: function(item) {
        var list;
        list = TaskApp.init({
          item: item
        });
        this.el.append(list.render().el);
        return list.attach();
      }
    });
    return window.App = allLists.init();
  });
  jQuery(function($) {
    window.SettingApp = Spine.Controller.create({
      events: {
        "click #setting_button": "setting_window",
        "click #validate_button": "validate_code",
        "click #help_button": "show_help",
        "click #background_button": "background_change_window",
        "click #change_background_button": "background_change"
      },
      init: function() {
        var upload;
        upload = $("#fileuploader")[0];
        return upload.onchange = function(e) {
          var file, reader;
          e.preventDefault();
          file = upload.files[0];
          reader = new FileReader();
          reader.onload = function(event) {
            var holder, img;
            holder = $("#holder")[0];
            window.imageevent = event;
            img = new Image();
            img.src = event.target.result;
            img.width = 276;
            holder.innerHTML = '';
            return holder.appendChild(img);
          };
          reader.readAsDataURL(file);
          return false;
        };
      },
      background_change_window: function() {
        return $("#dialog_changebackground").dialog({
          title: 'Change Background',
          autoOpen: true,
          modal: true,
          buttons: {
            'Change Background': function() {
              window.settingapp.background_change();
              return $(this).dialog("close");
            }
          }
        });
      },
      background_change: function() {
        var back;
        back = BackgroundImage.first();
        back.image = window.imageevent.target.result;
        back.save();
        return $("#bghelp")[0].style.background = 'url(' + BackgroundImage.first().image + ') no-repeat center';
      },
      setting_window: function() {
        return $("#dialog").dialog({
          modal: true,
          title: 'Settings for sync',
          buttons: {
            'Validate Code': function() {
              window.settingapp.validate_code();
              return $(this).dialog("close");
            }
          }
        });
      },
      show_help: function() {
        return $("#dialog_help").dialog({
          modal: true,
          title: 'Help Tips'
        });
      },
      open_validation_window: function() {
        return window.open('https://accounts.google.com/o/oauth2/auth?scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Ftasks&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code&client_id=784374432524.apps.googleusercontent.com');
      },
      validate_code: function() {
        var form_data, xhr;
        xhr = new XMLHttpRequest();
        form_data = $('#auth_submit').serialize();
        xhr.open("POST", "https://accounts.google.com/o/oauth2/token");
        xhr.onreadystatechange = function(status, response) {
          var current_token, now;
          if (xhr.readyState === 4) {
            window.obj = $.parseJSON(window.xhr.response);
            gapi.auth.setToken(window.obj);
            gapi.client.load("tasks", "v1", function() {
              return console.log("api loaded");
            });
            current_token = Token.first();
            current_token.current_token = window.obj['access_token'];
            now = moment().add('seconds', window.obj['expires_in']);
            current_token.expiration = now.toString();
            current_token.refresh_token = window.obj['refresh_token'];
            current_token.save();
            create("default", {
              title: "Validation succeeded",
              text: "Your list will now auto sync"
            });
            return initialize_and_sync_list();
          }
        };
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.send(form_data);
        window.xhr = xhr;
        return $("#dialog").dialog("close");
      },
      setup_api_on_entry: function(callback) {
        var current_token, data, expiration, now, xhr;
        if (Token.first().refresh_token === "") {
          $("#syncbutton")[0].src = "images/02-redo@2x.png";
          return true;
        }
        current_token = Token.first();
        expiration = moment(current_token.expiration);
        now = moment();
        if (now < expiration) {
          console.log("token not expired");
          gapi.auth.setToken({
            access_token: current_token.current_token,
            expires_in: 3600,
            token_type: "Bearer"
          });
          return gapi.client.load("tasks", "v1", function() {
            console.log("api loaded");
            return callback();
          });
        } else {
          console.log("token expired");
          xhr = new XMLHttpRequest();
          current_token = Token.first();
          window.refresh = current_token.refresh_token;
          data = "client_id=784374432524.apps.googleusercontent.com&client_secret=u4K1AZXSj8P9hIlEddLsMi6d&refresh_token=" + window.refresh + "&grant_type=refresh_token";
          window.data = data;
          xhr.open("POST", "https://accounts.google.com/o/oauth2/token");
          xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
          xhr.onreadystatechange = function(status, response) {
            if (xhr.readyState === 4) {
              window.obj = $.parseJSON(window.xhr.response);
              gapi.auth.setToken(window.obj);
              gapi.client.load("tasks", "v1", function() {
                console.log("api loaded");
                return callback();
              });
              current_token = Token.first();
              current_token.current_token = window.obj['access_token'];
              now = moment().add('seconds', window.obj['expires_in']);
              current_token.expiration = now.toString();
              return current_token.save();
            }
          };
          xhr.send(data);
          return window.xhr = xhr;
        }
      }
    });
    return window.settingapp = SettingApp.init({
      el: "#theapp"
    });
  });
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
  window.initializeApp = function() {
    var new_back, new_task, new_task_2, new_token, new_version, newlist, set_init;
    if (Initialized.all().length === 0) {
      delete localStorage["Task"];
      new_version = Version.init({
        number: "2.0"
      });
      new_version.save();
      set_init = Initialized.init({
        flag: "true"
      });
      set_init.save();
      newlist = List.init({
        name: "Your Todos",
        description: "",
        time: moment().toString(),
        synced: false
      });
      newlist.id = "@default";
      newlist.save();
      new_task = Task.init({
        name: "Click on settings and link your gtask account",
        time: moment().toString(),
        done: false,
        order: Task.all().length + 1,
        synced: false,
        listid: "@default"
      });
      new_task_2 = Task.init({
        name: "Click on sync to get the tasks in your current google account",
        time: moment().toString(),
        done: false,
        order: Task.all().length + 1,
        synced: false,
        listid: "@default"
      });
      new_task.save();
      new_task_2.save();
      new_token = Token.init({
        current_token: "",
        expiration: "",
        refresh_token: ""
      });
      new_token.save();
      new_back = BackgroundImage.init({
        "image": ""
      });
      new_back.save();
    }
    if (Version.first().number === "0.2") {
      new_token = Token.init({
        current_token: "",
        expiration: "",
        refresh_token: ""
      });
      new_token.save();
      new_back = BackgroundImage.init({
        "image": ""
      });
      return new_back.save();
    }
  };
  window.myErrorHandler = function(errorMsg, url, lineNumber) {
    var submit_data, total_message, xhr;
    total_message = errorMsg + " " + url + " " + lineNumber + " " + navigator.userAgent;
    total_message = encodeURIComponent(total_message);
    xhr = new XMLHttpRequest();
    xhr.open("POST", "https://docs.google.com/spreadsheet/formResponse");
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.onreadystatechange = function(status, response) {};
    if (xhr.readyState === 4) {
      window.obj = $.parseJSON(window.xhr.response);
    }
    submit_data = "formkey=dExjNVkwM1JkQm1oYy1BMGRKVjlUaVE6MQ&entry.0.single=" + total_message + "&hl=en_US";
    console.log(submit_data);
    return xhr.send(submit_data);
  };
  window.onerror = window.myErrorHandler;
  Task.fetch();
  Deletion.fetch();
  List.fetch();
  Token.fetch();
  Finished.fetch();
  Initialized.fetch();
  Version.fetch();
  BackgroundImage.fetch();
  initializeApp();
  setting_url = "";
  window.last_opened = "";
  window.cur = 0;
  window.taskdict = {};
  window.obj = null;
  $(function() {
    if (BackgroundImage.first().image !== "") {
      $("#bghelp")[0].style.background = 'url(' + BackgroundImage.first().image + ') no-repeat center';
    }
    $("#newtaskdate").datepicker({
      constrainInput: true,
      buttonImage: "famfamicons/calendar.png",
      buttonImageOnly: true,
      buttonText: "",
      showOn: "both",
      onSelect: function(dateText, inst) {
        if ($(this).parent().parent().find(".showdate").length === 1) {
          return $(this).parent().parent().find(".showdate").html(dateText);
        }
      }
    });
    window.container = $("#container").notify();
    $("#calendar").fullCalendar({
      events: window.rendering_cal_process
    });
    $("#calendarview").hide();
    updateItems();
    shortcut.add("up", prevItem);
    shortcut.add("down", nextItem);
    shortcut.add("enter", open_for_edit, {
      disable_in_input: "true"
    });
    shortcut.add("backspace", pressed_delete, {
      disable_in_input: "true"
    });
    return shortcut.add("delete", pressed_delete, {
      disable_in_input: "true"
    });
  });
  window.create = function(template, vars, opts) {
    return window.container.notify("create", template, vars, opts);
  };
  window.addlist_window = function() {
    $("#list_name").val("");
    $("#list_description").val("");
    return $("#dialog_addlist").dialog({
      modal: true,
      title: "Add A New List",
      dialogClass: "adding",
      buttons: {
        'Add List': function() {
          add_list();
          return $(this).dialog("close");
        }
      }
    });
  };
  window.add_list = function() {
    var description, name, newlist;
    name = $("#list_name").val();
    description = $("#list_description").val();
    if (navigator.onLine) {
      newlist = List.init({
        name: name,
        description: description,
        time: (new Date().getTime()).toString(),
        synced: true
      });
      newlist.save();
      window.settingapp.setup_api_on_entry(function() {
        return List.add_to_cloud(newlist, function(list) {
          window.App.render_new(list);
          return $("#syncbutton")[0].src = "images/02-redo@2x.png";
        });
      });
    } else {
      newlist = List.init({
        name: name,
        description: description,
        time: (new Date().getTime()).toString(),
        synced: false
      });
      newlist.save();
    }
    window.App.render_new(newlist);
    return $("#dialog_addlist").dialog("close");
  };
  window.edit_list = function() {
    var curr_list;
    curr_list = List.find($("#dialog_addlist").data("id"));
    curr_list.name = $("#list_name").val();
    curr_list.description = $("#list_description").val();
    curr_list.time = (new Date().getTime()).toString();
    if (navigator.onLine) {
      curr_list.updated = true;
      curr_list.save();
      window.settingapp.setup_api_on_entry(function() {
        return List.update_to_cloud(curr_list, function(list) {
          return $("#syncbutton")[0].src = "images/02-redo@2x.png";
        });
      });
    } else {
      curr_list.updated = false;
      curr_list.save();
    }
    return $("#dialog_addlist").dialog("close");
  };
  window.toggle = function(element_a, element_b, tab_a, tab_b) {
    $(element_a).hide();
    $(element_b).show();
    $(tab_a).removeClass("active");
    $(tab_b).addClass("active");
    $("#calendar").fullCalendar("refetchEvents");
    return $("#calendar").fullCalendar("windowResize");
  };
  window.show_all_div = function() {
    $(".listdiv").show();
    $(".filterselected").removeClass("filterselected");
    return $("#allbutton").addClass("filterselected");
  };
  if (typeof Titanium !== "undefined" && Titanium !== null) {
    ti_window = Titanium.UI.currentWindow;
    ti_window.height = 510;
  }
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
  pressed_delete = function() {
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
    if (task_controller.el.index() === 0) {
      alert("The first task cannot be made into a child");
      return;
    }
    return task_controller.el.addClass("child_1");
  };
  exports = this;
  this.nextItem = nextItem;
  this.prevItem = prevItem;
  this.updateItems = updateItems;
  this.open_for_edit = open_for_edit;
  this.pressed_delete = pressed_delete;
  this.make_child = make_child;
}).call(this);
