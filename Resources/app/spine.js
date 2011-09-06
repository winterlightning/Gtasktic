(function() {
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
}).call(this);
