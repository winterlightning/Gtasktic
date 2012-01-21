#this makes rest requests with coffee and token to google
#needed to do this because google sucked

class GoogleRequest
  
  constructor: (json) ->
    window.json = json
    @method = json.method
    @path = json.path
    @params = json.params
    
    if json.body isnt ""
      @body = JSON.stringify(json.body)
    else
      @body = ""
    this
  
  execute: (callback) ->
    xhr = new XMLHttpRequest()
    xhr.open(@method, "https://www.googleapis.com"+@path)
    
    xhr.onreadystatechange = (status, response) ->
      if xhr.readyState is 4
        if xhr.responseText isnt ""
          callback( JSON.parse(xhr.responseText) )
        else
          callback( "" )

    xhr.withCredentials = true
    xhr.setRequestHeader("Authorization", "Bearer "+Token.first().current_token )
    xhr.setRequestHeader("Content-Type","application/json")
    xhr.send(@body)
    
    window.xhr = xhr
    
window.GoogleRequest= GoogleRequest