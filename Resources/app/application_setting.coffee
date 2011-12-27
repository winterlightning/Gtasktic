jQuery ($) ->
  #create an app for all the validation stuff
  window.SettingApp = Spine.Controller.create(
    events: 
      "click #setting_button" : "setting_window"
      "click #validate_button": "validate_code"
      "click #help_button" : "show_help"
      "click #background_button" : "background_change_window"
    
    background_change_window: ->
      $("#dialog_changebackground").dialog 
        modal: true
        title: "Change Your Background"
    
    setting_window: ->
      $("#dialog").dialog({ modal: true, title: 'Settings for sync' })
    
    show_help: ->
      $("#dialog_help").dialog({ modal: true, title: 'Help Tips' })
    
    open_validation_window: ->
      window.open('https://accounts.google.com/o/oauth2/auth?scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Ftasks&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code&client_id=784374432524.apps.googleusercontent.com')
    
    validate_code: ->
      xhr = new XMLHttpRequest()
      
      form_data = $('#auth_submit').serialize()
      xhr.open("POST", "https://accounts.google.com/o/oauth2/token")
      xhr.onreadystatechange = (status, response) ->
        if xhr.readyState is 4
          window.obj = $.parseJSON(window.xhr.response)
          gapi.auth.setToken(window.obj);
          gapi.client.load("tasks", "v1", -> console.log("api loaded"));
          
          #1. Set the access token as the current token
          #2. Set the refresh token 
          #3. Set a timer for when the access token is expired
          current_token = Token.first()
          current_token.current_token = window.obj['access_token']
          now = moment().add('seconds', window.obj['expires_in']);
          current_token.expiration = now.toString()
          current_token.refresh_token = window.obj['refresh_token']
          current_token.save()
          
          create "default", 
            title: "Validation succeeded"
            text: "You can now sync your list"
          
      xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded")
      xhr.send(form_data)
      
      window.xhr = xhr
      
      $("#dialog").dialog("close")
    
    setup_api_on_entry: ( callback ) ->
      #if token not expired, set token and load api
      current_token = Token.first()
      expiration = moment( current_token.expiration )
      
      now = moment()
      
      if now < expiration
        console.log("token not expired")
        gapi.auth.setToken
          access_token: current_token.current_token
          expires_in: 3600
          token_type: "Bearer"
          
        gapi.client.load("tasks", "v1", -> 
          console.log("api loaded")
          callback()
        )
        
      
      else
        console.log("token expired")
      
        #else, get refresh token and set it and load api on callback
        xhr = new XMLHttpRequest()
        
        #setup the data
        current_token = Token.first()
        
        window.refresh = current_token.refresh_token
        data = "client_id=784374432524.apps.googleusercontent.com&client_secret=u4K1AZXSj8P9hIlEddLsMi6d&refresh_token=#{ window.refresh }&grant_type=refresh_token"
        window.data = data
        
        xhr.open("POST", "https://accounts.google.com/o/oauth2/token")
        xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded")
        xhr.onreadystatechange = (status, response) ->
          if xhr.readyState is 4
            window.obj = $.parseJSON(window.xhr.response)
            gapi.auth.setToken(window.obj);
            gapi.client.load("tasks", "v1", -> 
              console.log("api loaded")
              callback()
            )
            
            #1. Set the access token as the current token
            #2. Set the refresh token 
            #3. Set a timer for when the access token is expired
            current_token = Token.first()
            current_token.current_token = window.obj['access_token']
            now = moment().add('seconds', window.obj['expires_in']);
            current_token.expiration = now.toString()
            current_token.save()
            
        
        xhr.send(data)
        window.xhr = xhr
      
  )
  window.settingapp = SettingApp.init(el: "#theapp")
