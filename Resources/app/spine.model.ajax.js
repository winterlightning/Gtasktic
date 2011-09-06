(function() {
  (function($) {
    var ajaxSync, getUrl, methodMap, urlError;
    getUrl = function(object) {
      if (!(object && object.url)) {
        return null;
      }
      if ($.isFunction(object.url)) {
        return object.url();
      } else {
        return object.url;
      }
    };
    methodMap = {
      create: "POST",
      update: "PUT",
      destroy: "DELETE",
      read: "GET"
    };
    urlError = function() {
      throw new Error("A 'url' property or function must be specified");
    };
    ajaxSync = function(e, method, record) {
      var params;
      params = {
        type: methodMap[method],
        contentType: "application/json",
        dataType: "json",
        processData: false
      };
      params.url = getUrl(record);
      if (!params.url) {
        throw "Invalid URL";
      }
      if (method === "create" || method === "update") {
        params.data = JSON.stringify(record);
      }
      if (method === "read") {
        params.success = function(data) {
          return (record.populate || record.load)(data);
        };
      }
      params.error = function(e) {
        return record.trigger("error", e);
      };
      return $.ajax(params);
    };
    Spine.Model.Ajax = {
      extended: function() {
        this.sync(ajaxSync);
        return this.fetch(this.proxy(function(e) {
          return ajaxSync(e, "read", this);
        }));
      }
    };
    Spine.Model.extend({
      url: function() {
        return "/" + this.name.toLowerCase() + "s";
      }
    });
    return Spine.Model.include({
      url: function() {
        var base;
        base = getUrl(this.parent);
        base += (base.charAt(base.length - 1) === "/" ? "" : "/");
        base += encodeURIComponent(this.id);
        return base;
      }
    });
  })(jQuery);
}).call(this);
