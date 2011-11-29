jQuery ($) ->
  #create an app for all the validation stuff
  window.SettingApp = Spine.Controller.create(
    events: 
      "click #setting_button" : "setting_window"
      "click #validate_button": "validate_code"
      "click #help_button" : "show_help"
    
    setting_window: ->
      $("#dialog").dialog({ modal: true, title: 'Settings for sync' })
    
    show_help: ->
      alert("help here")
    
    validate_code: ->
      code = $('#validation').val();
      file = Titanium.Filesystem.getApplicationDataDirectory()
      a = validate_code(code, file)
      flag = a.flag
      
      if (flag == true)
        $("#dialog").dialog("close")
        keys = Key.all()
        keys[0].validated = true
        keys[0].save()
        create("default", { title:'Successful Validation', text:'You may use sync now'})
      else
        create("default", { title:'Failed validation', text:'Please try again'})      
    
  )
  window.settingapp = SettingApp.init(el: "#theapp")