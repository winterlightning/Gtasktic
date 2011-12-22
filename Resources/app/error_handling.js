window.onerror = function myErrorHandler(errorMsg, url, lineNumber) {
  total_message = errorMsg + " " + url + " " + lineNumber;
  
  //submit_error_form( total_message )
};