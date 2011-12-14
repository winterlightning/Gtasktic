//Check if the app has been initialized or not and then initialize it
function initializeApp() {
	//Check if the app has being initialized
	if ( Initialized.all().length == 0) {
		//Delete all of the stuff before
		delete localStorage['Task'];
		
		//setting_url = create_link();
		//Key.create({ url: setting_url });
		
		//Set the version number 
		new_version = Version.init({ number: "0.2" });
		new_version.save();
		
		//set the intiialization flag
		set_init = Initialized.init({ flag: "true" } );
		set_init.save();
		
		//Create a list that represent the default list
		newlist = List.init( { name: "Your Todos", description: "", time: ( new Date().getTime() ).toString(), synced: false } );
		newlist.id = "@default";
		newlist.save();
		
		//Create a bunch of todos representing what people needs to do
		new_task = Task.init({name: "Click on settings and link your gtask account", time: ( new Date().getTime() ).toString(), done: false, order: Task.all().length + 1, synced: false, listid: "@default" });
		new_task_2 = Task.init({name: "Click on sync to get the tasks in your current google account", time: ( new Date().getTime() ).toString(), done: false, order: Task.all().length + 1, synced: false, listid: "@default" });
		new_task.save();
		new_task_2.save();
		
		//create a container for the new token
		new_token = Token.init({ current_token: "", expiration: "", refresh_token: "" });
		new_token.save();
	};
};