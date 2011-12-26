#this file has a function that sends all js error to a global form that 

window.myErrorHandler = (errorMsg, url, lineNumber) ->
  total_message = errorMsg + " " + url + " " + lineNumber + " " + navigator.userAgent
  total_message = encodeURIComponent(total_message)

  #setup xhr
  xhr = new XMLHttpRequest()
  xhr.open("POST", "https://docs.google.com/spreadsheet/formResponse")
  xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded")
  xhr.onreadystatechange = (status, response) ->
  if xhr.readyState is 4
    window.obj = $.parseJSON(window.xhr.response)
  
  #setup submit data
  submit_data = "formkey=dExjNVkwM1JkQm1oYy1BMGRKVjlUaVE6MQ&entry.0.single=#{ total_message }&hl=en_US"
  console.log( submit_data )
  xhr.send( submit_data )
  
window.onerror = window.myErrorHandler