(function() {
  jQuery(function($) {
    window.SettingApp = Spine.Controller.create({
      events: {
        "click #setting_button": "setting_window",
        "click #validate_button": "validate_code"
      },
      setting_window: function() {
        return $("#dialog").dialog({
          modal: true,
          title: 'Settings for sync'
        });
      },
      validate_code: function() {
        var a, code, file, flag, keys;
        code = $('#validation').val();
        file = Titanium.Filesystem.getApplicationDataDirectory();
        a = validate_code(code, file);
        flag = a.flag;
        if (flag === true) {
          $("#dialog").dialog("close");
          keys = Key.all();
          keys[0].validated = true;
          keys[0].save();
          return create("default", {
            title: 'Successful Validation',
            text: 'You may use sync now'
          });
        } else {
          return create("default", {
            title: 'Failed validation',
            text: 'Please try again'
          });
        }
      }
    });
    return window.settingapp = SettingApp.init({
      el: "#theapp"
    });
  });
}).call(this);
