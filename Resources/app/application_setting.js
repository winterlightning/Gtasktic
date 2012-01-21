(function() {
  jQuery(function($) {
    window.SettingApp = Spine.Controller.create({
      events: {
        "click #setting_button": "setting_window",
        "click #validate_button": "validate_code",
        "click #help_button": "show_help",
        "click #background_button": "background_change_window",
        "click #change_background_button": "background_change"
      },
      init: function() {
        var upload;
        window.there_upload_pic = false;
        upload = $("#fileuploader")[0];
        return upload.onchange = function(e) {
          var file, reader;
          e.preventDefault();
          file = upload.files[0];
          reader = new FileReader();
          window.there_upload_pic = false;
          reader.onload = function(event) {
            var holder, img;
            window.there_upload_pic = true;
            holder = $("#holder")[0];
            window.imageevent = event;
            img = new Image();
            img.src = event.target.result;
            img.width = 276;
            holder.innerHTML = '';
            return holder.appendChild(img);
          };
          reader.readAsDataURL(file);
          return false;
        };
      },
      background_change_window: function() {
        return $("#dialog_changebackground").dialog({
          title: 'Change Background',
          autoOpen: true,
          modal: true,
          buttons: {
            'Change Background': function() {
              if (window.there_upload_pic) {
                window.settingapp.background_change();
                return $(this).dialog("close");
              } else {
                return alert("Load an image or wait for image to complete loading");
              }
            }
          }
        });
      },
      background_change: function() {
        var back;
        back = BackgroundImage.first();
        back.image = window.imageevent.target.result;
        back.save();
        return $("#bghelp")[0].style.background = 'url(' + BackgroundImage.first().image + ') no-repeat center';
      },
      setting_window: function() {
        return $("#dialog").dialog({
          modal: true,
          title: 'Settings for sync',
          buttons: {
            'Validate Code': function() {
              window.settingapp.validate_code();
              return $(this).dialog("close");
            }
          }
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
            current_token = Token.first();
            current_token.current_token = window.obj['access_token'];
            now = moment().add('seconds', window.obj['expires_in']);
            current_token.expiration = now.toString();
            current_token.refresh_token = window.obj['refresh_token'];
            current_token.save();
            create("default", {
              title: "Validation succeeded",
              text: "Your list will now auto sync"
            });
            return initialize_and_sync_list();
          }
        };
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.send(form_data);
        window.xhr = xhr;
        return $("#dialog").dialog("close");
      },
      setup_api_on_entry: function(callback) {
        var current_token, data, expiration, now, xhr;
        if (Token.first().refresh_token === "") {
          $("#syncbutton")[0].src = "images/02-redo@2x.png";
          return true;
        }
        current_token = Token.first();
        expiration = moment(current_token.expiration);
        now = moment();
        if (now < expiration) {
          console.log("token not expired");
          return callback();
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
              current_token = Token.first();
              current_token.current_token = window.obj['access_token'];
              now = moment().add('seconds', window.obj['expires_in']);
              current_token.expiration = now.toString();
              current_token.save();
              return callback();
            }
          };
          xhr.send(data);
          return window.xhr = xhr;
        }
      }
    });
    return window.settingapp = SettingApp.init({
      el: "#theapp"
    });
  });
}).call(this);
