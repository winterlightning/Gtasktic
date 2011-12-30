window.initializeApp = ->
  if Initialized.all().length == 0
    delete localStorage["Task"]
    
    new_version = Version.init(number: "2.0")
    new_version.save()
    set_init = Initialized.init(flag: "true")
    set_init.save()
    newlist = List.init(
      name: "Your Todos"
      description: ""
      time: moment().toString()
      synced: false
    )
    
    newlist.id = "@default"
    newlist.save()
    new_task = Task.init(
      name: "Click on settings and link your gtask account"
      time: moment().toString()
      done: false
      order: Task.all().length + 1
      synced: false
      listid: "@default"
    )
    new_task_2 = Task.init(
      name: "Click on sync to get the tasks in your current google account"
      time: moment().toString()
      done: false
      order: Task.all().length + 1
      synced: false
      listid: "@default"
    )
    new_task.save()
    new_task_2.save()
    
    #initialize the token that will save the authenticated stuff
    new_token = Token.init(
      current_token: ""
      expiration: ""
      refresh_token: ""
    )
    new_token.save()

    #initialize the background image that will save the background image
    new_back = BackgroundImage.init( "image": "" )
    new_back.save()
   
  if Version.first().number is "0.2"
    
    #initialize the token that will save the authenticated stuff
    new_token = Token.init(
      current_token: ""
      expiration: ""
      refresh_token: ""
    )
    new_token.save()

    #initialize the background image that will save the background image
    new_back = BackgroundImage.init( "image": "" )
    new_back.save()
