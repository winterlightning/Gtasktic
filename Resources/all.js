(function() {
  var DeletedList, Deletion, Initialized, Key, List, Task, Version, exports, make_child, nextItem, open_for_edit, pressed_delete, prevItem, updateItems;
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
  (function($) {
    var db, db_path;
    db_path = Titanium.Filesystem.getFile(Titanium.Filesystem.getApplicationDataDirectory(), "gtasktic.db");
    db = Titanium.Database.openFile(db_path);
    String.prototype.replaceAll = function(strReplace, strWith) {
      var reg;
      reg = new RegExp(strReplace, "ig");
      return this.replace(reg, strWith);
    };
    db.execute("CREATE TABLE IF NOT EXISTS keyval ( key TEXT, value TEXT )");
    return Spine.Model.Local = {
      extended: function() {
        this.sync(this.proxy(this.saveLocal));
        return this.fetch(this.proxy(this.loadLocal));
      },
      saveLocal: function() {
        var result;
        result = JSON.stringify(this);
        db.execute("DELETE from keyval where key ='" + this.name + "'");
        result = result.replaceAll("'", "''");
        return db.execute("INSERT INTO keyval (key, value) VALUES ('" + this.name + "', '" + result + "')");
      },
      loadLocal: function() {
        var result, resultSet;
        resultSet = db.execute("SELECT value FROM keyval WHERE key = '" + this.name + "' LIMIT 1");
        result = resultSet.field(0);
        if (!result) {
          return;
        }
        result = JSON.parse(result);
        return this.refresh(result);
      }
    };
  })(jQuery);
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
    }
  });
  Deletion = Spine.Model.setup("Deletion", ["deletion_id"]);
  Deletion.extend(Spine.Model.Local);
  DeletedList = Spine.Model.setup("DeletedList", ["deletion_id"]);
  DeletedList.extend(Spine.Model.Local);
  Key = Spine.Model.setup("Key", ["url", "validated"]);
  Key.extend(Spine.Model.Local);
  List = Spine.Model.setup("List", ["name", "description", "synced", "time"]);
  List.extend(Spine.Model.Local);
  Version = Spine.Model.setup("Version", ["number"]);
  Version.extend(Spine.Model.Local);
  Initialized = Spine.Model.setup("Initialized", ["flag"]);
  Initialized.extend(Spine.Model.Local);
  exports = this;
  exports.Deletion = Deletion;
  exports.Task = Task;
  exports.DeletedList = DeletedList;
  exports.Key = Key;
  exports.List = List;
  exports.Version = Version;
  exports.Initialized = Initialized;
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
        this.item.done = !this.item.done;
        this.item.time = (new Date().getTime()).toString();
        return this.item.save();
      },
      destroy: function() {
        Deletion.create({
          deletion_id: this.item.synced === true ? this.item.id : void 0
        });
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
        var element, input_value;
        input_value = this.input.val().replace("'", "''");
        this.wrapper.removeClass("editing");
        this.item.updateAttributes({
          name: input_value,
          time: (new Date().getTime()).toString(),
          duedate: this.inputdate.val(),
          note: this.textarea.val()
        });
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
        return Task.destroyDone(this.item.id);
      },
      addOne: function() {
        var new_task, view;
        new_task = Task.create({
          name: "",
          time: (new Date().getTime()).toString(),
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
        var r, tasks;
        r = confirm("Are you sure you want to delete this list and all it's tasks");
        if (r) {
          DeletedList.create({
            deletion_id: this.item.synced === true ? this.item.id : void 0
          });
          tasks = Task.list(this.item.id);
          $.each(tasks, function(key, value) {
            Deletion.create({
              deletion_id: value.synced === true ? value.id : void 0
            });
            return value.destroy();
          });
          this.remove();
          return this.item.destroy();
        }
      },
      create_new: function() {
        var input_value, new_task, view;
        input_value = this.input.val().replace("'", "''");
        new_task = Task.create({
          name: input_value,
          time: (new Date().getTime()).toString(),
          done: false,
          order: Task.all().length + 1,
          synced: false,
          listid: this.item.id
        });
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
          dialogClass: "editing"
        });
        return d.data("id", this.item.id);
      },
      attach: function() {
        this.el.find(".roundedlist").sortable({
          update: function(event, ui) {
            return $(".roundedlist li").each(function(index) {
              var current;
              current = Task.find($(this).data("id"));
              current.order = $(this).index();
              current.listid = ($(this).parent().parent())[0].id;
              current.time = (new Date().getTime()).toString();
              return current.save();
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
  jQuery(function($) {
    window.SettingApp = Spine.Controller.create({
      events: {
        "click #setting_button": "setting_window",
        "click #validate_button": "validate_code"
      },
      setting_window: function() {
        return $("#dialog").dialog({
          modal: true,
          title: 'Settings for sync'
        });
      },
      validate_code: function() {
        var a, code, file, flag, keys;
        code = $('#validation').val();
        file = Titanium.Filesystem.getApplicationDataDirectory();
        a = validate_code(code, file);
        flag = a.flag;
        if (flag === true) {
          $("#dialog").dialog("close");
          keys = Key.all();
          keys[0].validated = true;
          keys[0].save();
          return create("default", {
            title: 'Successful Validation',
            text: 'You may use sync now'
          });
        } else {
          return create("default", {
            title: 'Failed validation',
            text: 'Please try again'
          });
        }
      }
    });
    return window.settingapp = SettingApp.init({
      el: "#theapp"
    });
  });
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
  String.prototype.replaceAll = function(strReplace, strWith) {
    var reg;
    reg = new RegExp(strReplace, "ig");
    return this.replace(reg, strWith);
  };
}).call(this);
