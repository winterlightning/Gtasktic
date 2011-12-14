(function() {
  jQuery(function($) {
    window.SettingApp = Spine.Controller.create({
      events: {
        "click #setting_button": "setting_window",
        "click #validate_button": "validate_code",
        "click #help_button": "show_help"
      },
      setting_window: function() {
        return $("#dialog").dialog({
          modal: true,
          title: 'Settings for sync'
        });
      },
      show_help: function() {
        return $("#dialog_help").dialog({
          modal: true,
          title: 'Help Tips'
        });
      },
      open_validation_window: function() {
        return window.open('https://accounts.google.com/o/oauth2/auth?scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Ftasks&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code&client_id=784374432524.apps.googleusercontent.com');
      },
      validate_code: function() {
        var form_data, xhr;
        xhr = new XMLHttpRequest();
        form_data = $('#auth_submit').serialize();
        xhr.open("POST", "https://accounts.google.com/o/oauth2/token");
        xhr.onreadystatechange = function(status, response) {
          var current_token, now;
          if (xhr.readyState === 4) {
            window.obj = $.parseJSON(window.xhr.response);
            gapi.auth.setToken(window.obj);
            gapi.client.load("tasks", "v1", function() {
              return console.log("api loaded");
            });
            current_token = Token.first();
            current_token.current_token = window.obj['access_token'];
            now = moment().add('seconds', window.obj['expires_in']);
            current_token.expiration = now.toString();
            current_token.refresh_token = window.obj['refresh_token'];
            return current_token.save();
          }
        };
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.send(form_data);
        window.xhr = xhr;
        return $("#dialog").dialog("close");
      },
      setup_api_on_entry: function(callback) {
        var current_token, data, expiration, now, xhr;
        current_token = Token.first();
        expiration = moment(current_token.expiration);
        now = moment();
        if (now < expiration) {
          console.log("token not expired");
          gapi.auth.setToken({
            access_token: current_token.current_token,
            expires_in: 3600,
            token_type: "Bearer"
          });
          return gapi.client.load("tasks", "v1", function() {
            console.log("api loaded");
            return callback();
          });
        } else {
          console.log("token expired");
          xhr = new XMLHttpRequest();
          current_token = Token.first();
          window.refresh = current_token.refresh_token;
          data = "client_id=784374432524.apps.googleusercontent.com&client_secret=u4K1AZXSj8P9hIlEddLsMi6d&refresh_token=" + window.refresh + "&grant_type=refresh_token";
          window.data = data;
          xhr.open("POST", "https://accounts.google.com/o/oauth2/token");
          xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
          xhr.onreadystatechange = function(status, response) {
            if (xhr.readyState === 4) {
              window.obj = $.parseJSON(window.xhr.response);
              gapi.auth.setToken(window.obj);
              gapi.client.load("tasks", "v1", function() {
                console.log("api loaded");
                return callback();
              });
              current_token = Token.first();
              current_token.current_token = window.obj['access_token'];
              now = moment().add('seconds', window.obj['expires_in']);
              current_token.expiration = now.toString();
              return current_token.save();
            }
          };
          xhr.send(data);
          return window.xhr = xhr;
        }
      },
      refresh_token: function() {
        return alert("refresh token");
      }
    });
    return window.settingapp = SettingApp.init({
      el: "#theapp"
    });
  });
}).call(this);
