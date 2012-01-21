(function() {
  var GoogleRequest;
  GoogleRequest = (function() {
    function GoogleRequest(json) {
      window.json = json;
      this.method = json.method;
      this.path = json.path;
      this.params = json.params;
      if (json.body !== "") {
        this.body = JSON.stringify(json.body);
      } else {
        this.body = "";
      }
      this;
    }
    GoogleRequest.prototype.execute = function(callback) {
      var xhr;
      xhr = new XMLHttpRequest();
      xhr.open(this.method, "https://www.googleapis.com" + this.path);
      xhr.onreadystatechange = function(status, response) {
        if (xhr.readyState === 4) {
          if (xhr.responseText !== "") {
            return callback(JSON.parse(xhr.responseText));
          } else {
            return callback("");
          }
        }
      };
      xhr.withCredentials = true;
      xhr.setRequestHeader("Authorization", "Bearer " + Token.first().current_token);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(this.body);
      return window.xhr = xhr;
    };
    return GoogleRequest;
  })();
  window.GoogleRequest = GoogleRequest;
}).call(this);
