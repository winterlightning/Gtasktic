window.onerror = myErrorHandler = (errorMsg, url, lineNumber) ->
  total_message = errorMsg + " " + url + " " + lineNumber

  