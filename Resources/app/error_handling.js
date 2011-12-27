(function() {
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
}).call(this);
