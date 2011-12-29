(function() {
  Task.ordersort = function(a, b) {
    if (a.order < b.order) {
      return -1;
    } else {
      return 1;
    }
  };
  jQuery(function($) {
    window.Tasks = Spine.Controller.create({
      tag: "li",
      proxied: ["render", "remove"],
      events: {
        "change   input[type=checkbox]": "toggle",
        "click    .destroy": "destroy",
        "dblclick .item": "edit",
        "click .item": "toggle_select",
        "keypress input[type=text]": "blurOnEnter",
        "submit .edittask_form": "close"
      },
      elements: {
        "input.name": "input",
        ".item": "wrapper",
        ".datepicker": "inputdate",
        "textarea.note": "textarea"
      },
      init: function() {
        this.item.bind("update", this.render);
        window.taskdict[this.item.id] = this;
        return this.item.bind("destroy", this.remove);
      },
      render: function() {
        var elements;
        elements = $("#taskTemplate").tmpl(this.item);
        this.el.html(elements);
        this.refreshElements();
        this.el.data("id", this.item.id);
        this.el.find(".datepicker").datepicker({
          constrainInput: true
        });
        return this;
      },
      toggle: function() {
        this.item.done = !this.item.done;
        this.item.time = moment().toString();
        return this.item.save();
      },
      destroy: function() {
        var cur_task, d;
        if (this.item.synced === true) {
          cur_task = this.item;
          if (navigator.onLine) {
            $("#syncbutton")[0].src = "images/ajax-loader.gif";
            window.settingapp.setup_api_on_entry(function() {
              return Task.delete_from_cloud(cur_task, function() {
                return $("#syncbutton")[0].src = "images/02-redo@2x.png";
              });
            });
          } else {
            d = Deletion.init({
              deletion_id: this.item.id,
              listid: this.item.listid
            });
            d.id = this.item.id;
            d.save();
          }
        }
        return this.item.destroy();
      },
      edit: function() {
        if (this.wrapper.hasClass("editing")) {
          return;
        }
        if (this.el.hasClass("task_selected")) {
          this.el.removeClass("task_selected");
        }
        if (window.last_opened !== "") {
          window.taskdict[window.last_opened].close();
        }
        window.last_opened = this.item.id;
        this.wrapper.addClass("editing");
        return this.input.focus();
      },
      blurOnEnter: function(e) {
        if (e.keyCode === 13) {
          return e.target.blur();
        }
      },
      toggle_select: function() {
        var element;
        if (this.wrapper.hasClass("editing")) {
          return;
        }
        if (window.last_opened !== "") {
          window.taskdict[window.last_opened].close();
        }
        window.last_opened = "";
        $(".task_selected").removeClass("task_selected");
        element = this.el;
        $("li").each(function(idx, value) {
          if ($(value).data("id") === $(element).data("id")) {
            return window.cur = idx;
          }
        });
        return this.el.addClass("task_selected");
      },
      close: function() {
        var cur_task, element, input_value;
        input_value = this.input.val().replace("'", "''");
        this.wrapper.removeClass("editing");
        if (navigator.onLine) {
          $("#syncbutton")[0].src = "images/ajax-loader.gif";
          this.item.updateAttributes({
            name: input_value,
            time: moment().toString(),
            duedate: this.inputdate.val(),
            note: this.textarea.val(),
            updated: true
          });
          cur_task = this.item;
          window.settingapp.setup_api_on_entry(function() {
            return Task.update_to_cloud(cur_task, function() {
              return $("#syncbutton")[0].src = "images/02-redo@2x.png";
            });
          });
        } else {
          this.item.updateAttributes({
            name: input_value,
            time: moment().toString(),
            duedate: this.inputdate.val(),
            note: this.textarea.val(),
            updated: false
          });
        }
        this.el.addClass("task_selected");
        element = this.el;
        $("li").each(function(idx, value) {
          if ($(value).data("id") === $(element).data("id")) {
            return window.cur = idx;
          }
        });
        window.last_opened = "";
        return false;
      },
      remove: function() {
        return this.el.remove();
      }
    });
    window.TaskApp = Spine.Controller.create({
      tag: "div",
      proxied: ["addAll", "render", "renderCount", "remove", "attach"],
      events: {
        "click  .clear": "clear",
        "click  a.add": "addOne",
        "click  .deletelist": "deletelist",
        "click  .editlist": "editlist",
        "submit form.addform": "create_new"
      },
      elements: {
        ".items": "items",
        ".countVal": "count",
        ".clear": "clear",
        ".add": "add",
        ".addinputs .addtasks": "input",
        ".addinputs": "addform"
      },
      init: function() {
        this.item.bind("update", this.render);
        this.item.bind("update", this.attach);
        this.item.bind("destroy", this.remove);
        Task.bind("change", this.renderCount);
        return Task.fetch();
      },
      addAll: function() {
        var a, ordered;
        ordered = Task.list(this.item.id).sort(Task.ordersort);
        a = this.el;
        return $.each(ordered, function(key, value) {
          var view;
          view = Tasks.init({
            item: value
          });
          return a.find(".items").append(view.render().el);
        });
      },
      render: function() {
        var elements, tab_el, tab_html, tab_id, this_element, this_tab;
        elements = $("#listTemplate").tmpl(this.item);
        this.el.html(elements);
        this.refreshElements();
        this.el.data("id", this.item.id);
        this.addAll();
        if (this.item.id === "@default") {
          this.el.addClass("firstlist");
        }
        this.renderCount();
        tab_el = $(".listfilter");
        tab_id = "l" + (String(this.item.id).replace("@", ""));
        $("#" + tab_id).remove();
        tab_html = "<button id='" + tab_id + "'>" + this.item.name + "</button>";
        tab_el.prepend(tab_html);
        this.tab = $(String("#" + tab_id));
        this_element = "#" + this.item.id;
        this_tab = this.tab;
        this.tab.click(function() {
          $(".listdiv").hide();
          if (this_element === "#@default") {
            $(".firstlist .listdiv").show();
          } else {
            $(this_element).show();
          }
          $(".filterselected").removeClass("filterselected");
          return this_tab.addClass("filterselected");
        });
        return this;
      },
      renderCount: function() {
        var active, inactive;
        active = Task.active(this.item.id).length;
        this.count.text(active);
        return inactive = Task.done(this.item.id).length;
      },
      clear: function() {
        return Task.logDone(this.item.id);
      },
      addOne: function() {
        var new_task, view;
        new_task = Task.create({
          name: "",
          time: moment().toString(),
          done: false,
          order: Task.all().length + 1,
          synced: false,
          listid: this.item.id
        });
        view = Tasks.init({
          item: new_task
        });
        this.items.append(view.render().el);
        return view.edit();
      },
      deletelist: function() {
        var r, tasks;
        r = confirm("Are you sure you want to delete this list and all it's tasks");
        if (r) {
          DeletedList.create({
            deletion_id: this.item.synced === true ? this.item.id : void 0
          });
          tasks = Task.list(this.item.id);
          $.each(tasks, function(key, value) {
            Deletion.create({
              deletion_id: value.id,
              listid: value.synced === true ? value.listid : void 0
            });
            return value.destroy();
          });
          this.remove();
          return this.item.destroy();
        }
      },
      create_new: function() {
        var input_value, new_task, view;
        input_value = this.input.val().replace("'", "''");
        if (navigator.onLine) {
          alert("got here");
          new_task = Task.create({
            name: input_value,
            time: moment().toString(),
            done: false,
            order: Task.all().length + 1,
            synced: true,
            listid: this.item.id,
            updated: true
          });
          window.settingapp.setup_api_on_entry(function() {
            return Task.add_to_cloud(new_task, function() {
              return console.log("added to cloud");
            });
          });
        } else {
          new_task = Task.create({
            name: input_value,
            time: moment().toString(),
            done: false,
            order: Task.all().length + 1,
            synced: false,
            listid: this.item.id,
            updated: false
          });
        }
        view = Tasks.init({
          item: new_task
        });
        this.items.append(view.render().el);
        this.input.val("");
        return false;
      },
      remove: function() {
        this.el.remove();
        return this.tab.remove();
      },
      editlist: function() {
        var d;
        $("#list_name").val(this.item.name);
        $("#list_description").val(this.item.description);
        d = $("#dialog_addlist").dialog({
          modal: true,
          title: "Edit this list",
          dialogClass: "editing"
        });
        return d.data("id", this.item.id);
      },
      attach: function() {
        this.el.find(".roundedlist").sortable({
          update: function(event, ui) {
            return $(".roundedlist li").each(function(index) {
              var current;
              current = Task.find($(this).data("id"));
              current.order = $(this).index();
              current.listid = ($(this).parent().parent())[0].id;
              current.time = moment().toString();
              return current.save();
            });
          },
          connectWith: ".connectedsortable"
        });
        this.el.find(".addinputs").toggle();
        this.el.find(".addtoggle").click(function(event) {
          var clicked;
          clicked = $(this);
          clicked.toggle();
          clicked.parent().children(".addinputs").toggle();
          return clicked.parent().find(".addinputs .addtasks").focus();
        });
        return this.el.find(".doneadding").click(function(event) {
          var clicked;
          clicked = $(this);
          clicked.parent().parent().children(".addtoggle").toggle();
          return clicked.parent().toggle();
        });
      }
    });
    window.allLists = Spine.Controller.create({
      el: $("#listsoftasks"),
      proxied: ["render"],
      init: function() {
        List.fetch();
        return this.render();
      },
      render: function() {
        var cur_el, lists;
        lists = List.all();
        cur_el = this.el;
        return $.each(lists, function(key, value) {
          var list;
          list = TaskApp.init({
            item: value
          });
          cur_el.append(list.render().el);
          return list.attach();
        });
      },
      render_new: function(item) {
        var list;
        list = TaskApp.init({
          item: item
        });
        this.el.append(list.render().el);
        return list.attach();
      }
    });
    return window.App = allLists.init();
  });
}).call(this);
