Task.ordersort = function(a, b){ 
    return (a.order < b.order) ? -1 : 1;
};

jQuery(function($){
  
  window.Tasks = Spine.Controller.create({
    tag: "li",
    
    proxied: ["render", "remove"],
    
    events: {
      "change   input[type=checkbox]": "toggle",
      "click    .destroy":             "destroy",
      "dblclick .item":                "edit",
      "keypress input[type=text]":     "blurOnEnter",
      "submit .edittask_form": "close"
      //"blur     input[type=text]":     "close",
    },
    
    elements: {
      "input.name": "input",
      ".item": "wrapper",
      ".datepicker": "inputdate",
      "textarea.note": "textarea"
    },
    
    init: function(){
      this.item.bind("update",  this.render);
      this.item.bind("destroy", this.remove);
    },
    
    render: function(){
      var elements = $("#taskTemplate").tmpl(this.item);
      this.el.html(elements);
      this.refreshElements();
      
      //Store the id of the element in the item itself
      this.el.data('id', this.item.id);
      
      this.el.find('.datepicker').datepicker({
		constrainInput: true
	  });				
      
      return this;
    },
    
    toggle: function(){
      this.item.done = !this.item.done;
      this.item.time = ( new Date().getTime() ).toString();
      this.item.save();      
    },
    
    destroy: function(){
      if (this.item.synced == true) {
      	Deletion.create({ deletion_id: this.item.id });
      };
      this.item.destroy();
    },
    
    edit: function(){
      this.wrapper.addClass("editing");
      this.input.focus();
    },
    
    blurOnEnter: function(e) {
      if (e.keyCode == 13) e.target.blur();
    },
    
    close: function(){
      this.wrapper.removeClass("editing");
      
      this.item.updateAttributes({name: this.input.val(), time: ( new Date().getTime() ).toString(), duedate: this.inputdate.val(), note: this.textarea.val() });
    
      return false;
    },
    
    remove: function(){
      this.el.remove();
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
      "submit form.addform":   "create_new"
    },
    
    elements: {
      ".items":     "items",
      ".countVal":  "count",
      ".clear":     "clear",
      ".add": 		"add",
      ".addinputs .addtasks":  "input",
      ".addinputs": "addform"
    },
    
    init: function(){
      //Task.bind("refresh", this.addAll);
      this.item.bind("update",  this.render);
      this.item.bind("update",  this.attach);
      this.item.bind("destroy", this.remove);
      
      Task.bind("change", this.renderCount);
      
      Task.fetch();
    },
    
    addAll: function() {
	  var ordered = Task.list(this.item.id).sort(Task.ordersort);
	  
	  a = this.el;

	  $.each(ordered, function(key, value) {
     	var view = Tasks.init({item: value});
      	a.find('.items').append(view.render().el);
	  });
	 
    },
    
    render: function() {
   	  var elements = $("#listTemplate").tmpl(this.item);
      this.el.html(elements);	
      this.refreshElements();
	  
	  //Store the id of the element in the item itself
      this.el.data('id', this.item.id);
	  
	  this.addAll();
	  
	  if (this.item.id == "@default") {
	  	this.el.addClass("firstlist");
	  };
	        
	  this.renderCount();
	  	  
	  tab_el = $(".listfilter");
	  
	  /*This section is for the bottom right filter*/
	  tab_id= "l"+(String(this.item.id).replace("@", ""));
	  $("#"+tab_id).remove();//delete duplicates
	  tab_html = "<button id='"+tab_id+"'>" + this.item.name + "</button>"
	  tab_el.prepend(tab_html);
	  
	  this.tab = $(String("#"+tab_id));
	  var this_element = "#"+this.item.id;
	  var this_tab = this.tab;
	  
	  this.tab.click(function() {
	  	$(".listdiv").hide();
	  	
	  	//extra code for default
	  	if (this_element == "#@default") {
	  		$(".firstlist .listdiv").show();
	  	}
	  	else {
	  		$(this_element).show();
	  	};
	  	
	  	$(".filterselected").removeClass("filterselected");
	  	this_tab.addClass("filterselected");
	  });
      
      return this;
    },
    
    renderCount: function() {
      var active = Task.active(this.item.id).length;
      this.count.text(active);
      
      var inactive = Task.done(this.item.id).length;
    },

    clear: function(){
      Task.destroyDone(this.item.id);
    },
    
    addOne: function() {
    	new_task = Task.create({name: "", time: ( new Date().getTime() ).toString(), done: false, order: Task.all().length + 1, synced: false, listid: this.item.id });
		var view = Tasks.init({item: new_task});
      	this.items.append(view.render().el);
      	view.edit();
    },
    
    deletelist: function() {
      var r = confirm("Are you sure you want to delete this list and all it's tasks");
	  
	  if (r) {

		if (this.item.synced == true) {
			DeletedList.create({ deletion_id: this.item.id });
		};

    	tasks = Task.list(this.item.id);
	  	
	  	$.each(tasks, function(key, value) {
	  		if (value.synced == true) {
      			Deletion.create({ deletion_id: value.id });
      		};
	  		
	    	value.destroy();
	  	});
	  	
	  	this.remove();
	  	
		this.item.destroy();
      };
    },
    
    create_new: function() {
    	new_task = Task.create({name: this.input.val(), time: ( new Date().getTime() ).toString(), done: false, order: Task.all().length + 1, synced: false, listid: this.item.id });
		var view = Tasks.init({item: new_task});
      	this.items.append(view.render().el);    
    	
    	this.input.val("");
    	
    	return false;
    },
    
    remove: function() {
		this.el.remove();
		
		/*Delete the tab*/
		this.tab.remove();
    },
    
    editlist: function() {
    	$('#list_name').val(this.item.name);
		$('#list_description').val(this.item.description);
		
    	d = $("#dialog_addlist").dialog({ modal: true, title: 'Edit this list', dialogClass: "editing" });
    	d.data('id', this.item.id);
    },
  
    attach: function() {
		this.el.find( ".roundedlist" ).sortable({
	        update: function(event, ui) {
	            $(".roundedlist li").each (function(index) {
					//retrieve current task
					var current = Task.find($(this).data("id"));
    						current.order = $(this).index();
    						current.save();
  						});
			}
		});
		this.el.find(".addinputs").toggle();
		
		this.el.find(".addtoggle").click( function(event)
		{
			var clicked = $(this);
		   	clicked.toggle();
		   	clicked.parent().children(".addinputs").toggle();
		});
		
		this.el.find(".doneadding").click(function(event)
		{
			var clicked = $(this);
		   	clicked.parent().parent().children(".addtoggle").toggle();
		   	clicked.parent().toggle();
		});
		
    }
  
  });

  window.allLists = Spine.Controller.create({
    el: $("#listsoftasks"),
    
    proxied: ["render"],
    
    init: function(){
    	List.fetch();
    	this.render();
    },
    
    render: function() {
      var lists = List.all();
      cur_el = this.el;
            
      $.each(lists, function(key, value) {
	      var list = TaskApp.init({"item": value});
	      cur_el.append( list.render().el );
	      
	      list.attach();
	  });
      
    },
    
    render_new: function( item ) {
    	 var list = TaskApp.init({"item": item});
    	 this.el.append(list.render().el);
    	 
    	 list.attach();
    }
   
  });
 
  window.App = allLists.init();
 
});