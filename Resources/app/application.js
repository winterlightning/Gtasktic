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
      "submit .edittask_form": "close",
      //"blur     input[type=text]":     "close",
    },
    
    elements: {
      "input.name": "input",
      ".item": "wrapper",
      ".datepicker": "inputdate",
      "textarea.note": "textarea",
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
		constrainInput: true,
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
    },
    
    remove: function(){
      this.el.remove();
    }
  });
  
  /*window.TaskApp = Spine.Controller.create({
    el: $("#tasks"),
    
    proxied: ["addOne", "addAll", "renderCount"],

    events: {
      "submit #newtask_form":   "create",
      "click  .clear": "clear"
    },

    elements: {
      ".items":     "items",
      ".countVal":  "count",
      ".clear":     "clear",
      "form input:text": "input",
      "form input:hidden": "inputdate",
      ".showdate":  "datedisplay",
    },
    
    init: function(){
      Task.bind("create",  this.addOne);
      Task.bind("refresh", this.addAll);
      Task.bind("refresh change", this.renderCount);
      Task.fetch();
    },
    
    addOne: function(task) {
      var view = Tasks.init({item: task});
      this.items.append(view.render().el);
    },

    addAll: function() {
      var ordered = Task.all().sort(Task.ordersort);
      //Task.each(this.addOne);
      
      var a = this.items;
      
      $.each(ordered, function(key, value) {
     	var view = Tasks.init({item: value});
      	a.append(view.render().el);
	  });
      
    },
        
    create: function(){
      Task.create({name: this.input.val(), time: ( new Date().getTime() ).toString(), done: false, duedate: this.inputdate.val(), order: Task.all().length + 1, synced: false });
      this.input.val("");
      this.inputdate.val("");
      this.datedisplay.html("");
      return false;
    },
    
    renderCount: function(){
      var active = Task.active().length;
      this.count.text(active);
      
      var inactive = Task.done().length;
      this.clear[inactive ? "show" : "hide"]();
    }
  });
  
  window.App = TaskApp.init(); */
 
  window.TaskApp = Spine.Controller.create({
    tag: "div",
    
    proxied: ["addAll", "render", "renderCount"],

    events: {
      "click  .clear": "clear"
    },
    
    elements: {
      ".items":     "items",
      ".countVal":  "count",
      ".clear":     "clear",
    },
    
    init: function(){
      //Task.bind("refresh", this.addAll);
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
	        
	  this.renderCount();
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
      a = this.el;
      
      $.each(lists, function(key, value) {
	      var list = TaskApp.init({"item": value});
	      a.append( list.render().el );
	      list.addAll();
	  });
      
    },
       
  });
 
  window.App = allLists.init();
 
});