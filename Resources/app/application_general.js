(function() {
  var setting_url;
  Task.fetch();
  Deletion.fetch();
  List.fetch();
  Token.fetch();
  Finished.fetch();
  Initialized.fetch();
  initializeApp();
  setting_url = "";
  window.last_opened = "";
  window.cur = 0;
  window.taskdict = {};
  window.obj = null;
  $(function() {
    var $container;
    $("#newtaskdate").datepicker({
      constrainInput: true,
      buttonImage: "famfamicons/calendar.png",
      buttonImageOnly: true,
      buttonText: "",
      showOn: "both",
      onSelect: function(dateText, inst) {
        if ($(this).parent().parent().find(".showdate").length === 1) {
          return $(this).parent().parent().find(".showdate").html(dateText);
        }
      }
    });
    $container = $("#container").notify();
    $("#calendar").fullCalendar({
      events: window.rendering_cal_process
    });
    $("#calendarview").hide();
    updateItems();
    shortcut.add("up", prevItem);
    shortcut.add("down", nextItem);
    shortcut.add("enter", open_for_edit, {
      disable_in_input: "true"
    });
    shortcut.add("backspace", pressed_delete, {
      disable_in_input: "true"
    });
    return shortcut.add("delete", pressed_delete, {
      disable_in_input: "true"
    });
  });
  window.create = function(template, vars, opts) {
    return $container.notify("create", template, vars, opts);
  };
  window.addlist_window = function() {
    $("#list_name").val("");
    $("#list_description").val("");
    return $("#dialog_addlist").dialog({
      modal: true,
      title: "Add A New List",
      dialogClass: "adding"
    });
  };
  window.add_list = function() {
    var description, name, newlist;
    name = $("#list_name").val();
    description = $("#list_description").val();
    newlist = List.init({
      name: name,
      description: description,
      time: (new Date().getTime()).toString(),
      synced: false
    });
    newlist.save();
    window.App.render_new(newlist);
    return $("#dialog_addlist").dialog("close");
  };
  window.edit_list = function() {
    var curr_list;
    curr_list = List.find($("#dialog_addlist").data("id"));
    curr_list.name = $("#list_name").val();
    curr_list.description = $("#list_description").val();
    curr_list.time = (new Date().getTime()).toString();
    curr_list.save();
    return $("#dialog_addlist").dialog("close");
  };
  window.open_background_dialog = function() {
    return $("#dialog_changebackground").dialog({
      modal: true,
      title: "Change Your Background"
    });
  };
  window.getAsText = function(readFile) {
    var reader;
    reader = new FileReader();
    reader.onload = function(e) {
      var bin;
      alert("here 2");
      bin = e.target.result;
      return alert(bin);
    };
    reader.readAsBinaryString(readFile, "UTF-16");
    return reader;
  };
  window.background_change = function() {
    var file;
    file = document.getElementById("background_file").files[0];
    alert(file);
    if (file) {
      return getAsText(file);
    }
  };
  window.toggle = function(element_a, element_b, tab_a, tab_b) {
    $(element_a).hide();
    $(element_b).show();
    $(tab_a).removeClass("active");
    $(tab_b).addClass("active");
    $("#calendar").fullCalendar("refetchEvents");
    return $("#calendar").fullCalendar("windowResize");
  };
  window.show_all_div = function() {
    $(".listdiv").show();
    $(".filterselected").removeClass("filterselected");
    return $("#allbutton").addClass("filterselected");
  };
}).call(this);
