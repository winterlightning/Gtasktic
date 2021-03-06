Task.ordersort = (a, b) ->
  (if (a.order < b.order) then -1 else 1)

jQuery ($) ->
  window.Tasks = Spine.Controller.create(
    tag: "li"
    proxied: [ "render", "remove" ]
    events: 
      "change   input[type=checkbox]": "toggle"
      "click    .destroy": "destroy"
      "dblclick .item": "edit"
      "click .item": "toggle_select"
      "keypress input[type=text]": "blurOnEnter"
      "submit .edittask_form": "close"
    
    elements: 
      "input.name": "input"
      ".item": "wrapper"
      ".datepicker": "inputdate"
      "textarea.note": "textarea"
    
    init: ->
      @item.bind "update", @render
      
      window.taskdict[@item.id] = this
      
      @item.bind "destroy", @remove
    
    render: ->
      elements = $("#taskTemplate").tmpl(@item)
      @el.html elements
      @refreshElements()
      @el.data "id", @item.id
      @el.find(".datepicker").datepicker constrainInput: true
      this
    
    toggle: ->
      @item.done = not @item.done
      @item.time = moment().toString()
      
      if navigator.onLine
        $("#syncbutton")[0].src="images/ajax-loader.gif"
        
        @item.updated = true
        @item.save()
        cur_task = @item
        window.settingapp.setup_api_on_entry( ()-> Task.update_to_cloud(cur_task, ()-> $("#syncbutton")[0].src="images/02-redo@2x.png" ) )
      else
        @item.updated = false
        @item.save()
    
    destroy: ->
      if @item.synced == true
        cur_task = @item
        if navigator.onLine
          $("#syncbutton")[0].src="images/ajax-loader.gif"
          window.settingapp.setup_api_on_entry( ()-> Task.delete_from_cloud(cur_task, ()-> $("#syncbutton")[0].src="images/02-redo@2x.png" ) )
        
        else
          d = Deletion.init deletion_id: @item.id, listid: @item.listid 
          d.id = @item.id
          d.save()
        
      @item.destroy()
    
    edit: ->
      if @wrapper.hasClass "editing"
        return
      
      if @el.hasClass "task_selected"
        @el.removeClass "task_selected"
      
      if window.last_opened isnt ""
        window.taskdict[window.last_opened].close()
      window.last_opened = @item.id
      
      @wrapper.addClass "editing"
      @input.focus()
    
    blurOnEnter: (e) ->
      e.target.blur()  if e.keyCode == 13

    toggle_select: ->
     if @wrapper.hasClass "editing"
        return
     
     if window.last_opened isnt ""
        window.taskdict[window.last_opened].close()
     window.last_opened = ""
     
     $(".task_selected").removeClass("task_selected")
     
     #complicated way to assign index
     element = @el
     $("li").each (idx, value ) -> 
        if $(value).data("id") is $( element ).data("id")
          window.cur = idx 

     @el.addClass "task_selected"

    close: (e) -> 
      input_value = @input.val().replace("'", "''")
      
      @wrapper.removeClass "editing"
      
      #check if online or offline, deal with accordingly
      if navigator.onLine
        $("#syncbutton")[0].src="images/ajax-loader.gif"
        @item.updateAttributes 
          name: input_value
          time: moment().toString()
          duedate: @inputdate.val()
          note: @textarea.val()
          updated: true
        cur_task = @item
        window.settingapp.setup_api_on_entry( ()-> Task.update_to_cloud(cur_task, ()-> $("#syncbutton")[0].src="images/02-redo@2x.png" ) )
        
      else
        @item.updateAttributes 
          name: input_value
          time: moment().toString()
          duedate: @inputdate.val()
          note: @textarea.val()
          updated: false
      
      #$(".task_selected").removeClass("task_selected")
      @el.addClass("task_selected")
      
      #complicated way to assign index
      element = @el
      $("li").each (idx, value ) -> 
        if $(value).data("id") is $( element ).data("id")
          window.cur = idx
      
      window.last_opened = ""
      false
    
    remove: ->
      @el.remove()
  )
  window.TaskApp = Spine.Controller.create(
    tag: "div"
    proxied: [ "addAll", "render", "renderCount", "remove", "attach" ]
    events: 
      "click  .clear": "clear"
      "click  a.add": "addOne"
      "click  .deletelist": "deletelist"
      "click  .editlist": "editlist"
      "submit form.addform": "create_new"
    
    elements: 
      ".items": "items"
      ".countVal": "count"
      ".clear": "clear"
      ".add": "add"
      ".addinputs .addtasks": "input"
      ".addinputs": "addform"
    
    init: ->
      @item.bind "update", @render
      @item.bind "update", @attach
      @item.bind "destroy", @remove
      Task.bind "change", @renderCount
      Task.fetch()
    
    addAll: ->
      ordered = Task.list(@item.id).sort(Task.ordersort)
      a = @el
      $.each ordered, (key, value) ->
        view = Tasks.init(item: value)
        a.find(".items").append view.render().el
    
    render: ->
      elements = $("#listTemplate").tmpl(@item)
      @el.html elements
      @refreshElements()
      @el.data "id", @item.id
      @addAll()
      @el.addClass "firstlist"  if @item.id == "@default"
      @renderCount()
      
      tab_el = $(".listfilter")
      tab_id = "l" + (String(@item.id).replace("@", ""))
      $("#" + tab_id).remove()
      tab_html = "<button id='" + tab_id + "'>" + @item.name + "</button>"
      tab_el.prepend tab_html
      @tab = $(String("#" + tab_id))
      this_element = "#" + @item.id
      this_tab = @tab
      
      @tab.click ->
        $(".listdiv").hide()
        if this_element == "#@default"
          $(".firstlist .listdiv").show()
        else
          $(this_element).show()
        $(".filterselected").removeClass "filterselected"
        this_tab.addClass "filterselected"
      
      this
    
    renderCount: ->
      active = Task.active(@item.id).length
      @count.text active
      inactive = Task.done(@item.id).length
    
    clear: ->
      Task.logDone @item.id
    
    addOne: ->
      new_task = Task.create(
        name: ""
        time: moment().toString()
        done: false
        order: Task.all().length + 1
        synced: false
        listid: @item.id
      )
      view = Tasks.init(item: new_task)
      @items.append view.render().el
      view.edit()
    
    deletelist: ->
      r = confirm("Are you sure you want to delete this list and all it's tasks")
      if r
        if navigator.onLine
          if @item.synced
            cur_id = @item.id
            $("#syncbutton")[0].src="images/ajax-loader.gif"
            window.settingapp.setup_api_on_entry( ()-> List.delete_from_cloud( cur_id, ()-> $("#syncbutton")[0].src="images/02-redo@2x.png" ) )
          
        else  
          DeletedList.create deletion_id: @item.id  if @item.synced == true
          tasks = Task.list(@item.id)
          $.each tasks, (key, value) ->
            Deletion.create deletion_id: value.id, listid: value.listid if value.synced == true
            value.destroy()
        
        @remove()
        @item.destroy()
    
    create_new: ->
      input_value = @input.val().replace("'", "''")
      
      if navigator.onLine
        $("#syncbutton")[0].src="images/ajax-loader.gif"
        new_task = Task.create(
          name: input_value
          time: moment().toString()
          done: false
          order: Task.all().length + 1
          synced: true
          listid: @item.id
          updated: true
        )
        this_list = @items
        window.settingapp.setup_api_on_entry( ()-> Task.add_to_cloud(new_task, (new_task)-> 
          $("#syncbutton")[0].src="images/02-redo@2x.png" 
          view = Tasks.init(item: new_task)
          this_list.append view.render().el
        ) )
      else
        new_task = Task.create(
          name: input_value
          time: moment().toString()
          done: false
          order: Task.all().length + 1
          synced: false
          listid: @item.id
          updated: false
        )
      
      view = Tasks.init(item: new_task)
      @items.append view.render().el
      @input.val ""
      false
    
    remove: ->
      @el.remove()
      @tab.remove()
    
    editlist: ->
      $("#list_name").val @item.name
      $("#list_description").val @item.description
      d = $("#dialog_addlist").dialog(
        modal: true
        title: "Edit this list"
        dialogClass: "editing"
        buttons:
          'Edit List': () ->
            edit_list()
            $(this).dialog("close")
      )

      d.data "id", @item.id
    
    attach: ->
      @el.find(".roundedlist").sortable update: (event, ui) ->
        $(".roundedlist li").each (index) ->
          #on change to a different list, you have to things to create a new task in a different list and delete the old task
          if navigator.onLine
            current = Task.find($(this).data("id"))
            current_list_id = ($(this).parent().parent())[0].id
            
            if current.listid isnt ($(this).parent().parent())[0].id
              $("#syncbutton")[0].src="images/ajax-loader.gif"
              new_task = Task.init( 
                name: current.name
                time: moment().toString()
                done: current.done
                order: $(this).index()
                synced: false
                listid: ($(this).parent().parent())[0].id
                updated: false
              )
              new_task.save()
              
              this_list = List.find(current_list_id)
              this_list.save()
              
              window.settingapp.setup_api_on_entry( ()-> Task.add_to_cloud(new_task, (new_task)-> 
                $("#syncbutton")[0].src="images/02-redo@2x.png" 
                this_list.save()
              ) )
              
              window.settingapp.setup_api_on_entry( () -> Task.delete_from_cloud(current, ()-> console.log("old task deleted") ) )
              
              current.destroy()
              
            else
              current.order = $(this).index()
              current.save() 
                            
          else          
            current = Task.find($(this).data("id"))
            current_list_id = ($(this).parent().parent())[0].id
            
            if current.listid isnt ($(this).parent().parent())[0].id
              new_task = Task.init( 
                name: current.name
                time: moment().toString()
                done: current.done
                order: $(this).index()
                synced: false
                listid: ($(this).parent().parent())[0].id
                updated: false
              )
              new_task.save()
              current.destroy()
              if List.exists(current_list_id)
                 new_list = List.find(current_list_id)
                 new_list.save()
            else
              current.order = $(this).index()
              current.save()  
                               
      connectWith: ".connectedsortable"
      
      @el.find(".addinputs").toggle()
      @el.find(".addtoggle").click (event) ->
        clicked = $(this)
        clicked.toggle()
        clicked.parent().children(".addinputs").toggle()
        clicked.parent().find(".addinputs .addtasks").focus()
      
      @el.find(".doneadding").click (event) ->
        clicked = $(this)
        clicked.parent().parent().children(".addtoggle").toggle()
        clicked.parent().toggle()
  )
  window.allLists = Spine.Controller.create(
    el: $("#listsoftasks")
    proxied: [ "render" ]
    init: ->
      List.fetch()
      @render()
    
    render: ->
      lists = List.all()
      cur_el = @el
      $.each lists, (key, value) ->
        list = TaskApp.init(item: value)
        cur_el.append list.render().el
        list.attach()
    
    render_new: (item) ->
      list = TaskApp.init(item: item)
      @el.append list.render().el
      list.attach()
  )
  window.App = allLists.init()
