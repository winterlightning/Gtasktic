#import gflags.gflags as gflags
import sys
print "version", sys.version
import gapi.httplib2 as httplib2

from gapi.apiclient.discovery import build
from gapi.oauth2client.file import Storage
from gapi.oauth2client.client import OAuth2WebServerFlow
from gapi.oauth2client.tools import run, create_url

import datetime
import pickle
import gapi.simplejson as json

import os

service = None
task_dict= {}

#create a task
def create_task ( task, tasklist='@default' ):
    global service
    
    result = service.tasks().insert(tasklist=tasklist, body=task).execute()
    print result['id']
    
    return result

#delete a task
def delete_task ( task, tasklist='@default' ):
    global service
    
    try:
        tasklist = task_dict[task]
        print "tasklist: ", tasklist
        service.tasks().delete(tasklist=tasklist, task=task).execute()
    except:
        print "task ", task, " does not exist"
    
#update a task
def update_task ( task, updating, tasklist='@default' ):
    global service
    
    tasklist = task_dict[task]
    
    # First retrieve the task to update.
    task = service.tasks().get(tasklist=tasklist, task=task).execute()
    
    if task['status'] == "completed" and updating['status'] == "needsAction":
        print task
        del task['completed']
    
    for k, v in updating.iteritems():
        task[k] = v
    
    print task
    
    result = service.tasks().update(tasklist=tasklist, task=task['id'], body=task).execute()
    # Print the completed date.
    print result

def create_link():
    # Set up a Flow object to be used if we need to authenticate. This
    # sample uses OAuth 2.0, and we set up the OAuth2WebServerFlow with
    # the information it needs to authenticate. Note that it is called
    # the Web Server Flow, but it can also handle the flow for native
    # applications
    # The client_id and client_secret are copied from the API Access tab on
    # the Google APIs Console
    FLOW = OAuth2WebServerFlow(
        client_id='784374432524.apps.googleusercontent.com',
        client_secret='u4K1AZXSj8P9hIlEddLsMi6d',
        scope='https://www.googleapis.com/auth/tasks',
        user_agent='YOUR_APPLICATION_NAME/YOUR_APPLICATION_VERSION')
    
    return create_url(FLOW)

def validate_code(code):
    FLOW = OAuth2WebServerFlow(
    client_id='784374432524.apps.googleusercontent.com',
    client_secret='u4K1AZXSj8P9hIlEddLsMi6d',
    scope='https://www.googleapis.com/auth/tasks',
    user_agent='YOUR_APPLICATION_NAME/YOUR_APPLICATION_VERSION')
    
    storage = Storage('tasks.dat')
    
    credentials = run(FLOW, storage, code=code)    

    flag = None
    if credentials is None or credentials.invalid == True:
        flag = False
        print "### CREDENTIAL INVALID"
    else:
        flag = True
        print "### CREDENTAIL Validated"
    
    return { "creds": credentials, "flag": flag }

def get_all_tasks():
    global service
    global task_dict
    
    #get all the tasks
    tasklists = service.tasklists().list().execute()

    tasks = []
    for tasklist in tasklists['items']:
        this_list = service.tasks().list(tasklist=tasklist['id'] ).execute()
        print tasklist
        if this_list.has_key("items"):
            tasks = tasks + this_list['items']
        
            for task in this_list['items']:
                task_dict[(task['id'])] = tasklist['id']
                task["listid"] = tasklist['id']
        
    return [tasks, tasklists['items']]

def store_input( data ):
    print "here 1"
    output = open('/data.pkl', 'wb')
    
    print output
    print "current dir: ", os.pardir
    
    pickle.dump(data, output)
    
    print "here 3"
    output.close()
    
def open_storage():
    pkl_file = open('/data.pkl', 'rb')
    
    data = pickle.load(pkl_file)    
    pkl_file.close()    

    return data

#Sync the model given a local data set, and a cloud data set
#1. Both model must have a timestamp
#2. Local model must have a synced flag
def sync_model(local, cloud):
    
    #1. If a task is local but not in the cloud, write it back to the cloud. If a task is updated, write it back to the cloud
    for task_b in current_tasks:
        found = False
        updated = False
        
        print task_b["id"]
        
        for task in tasks: 
            
            if task['id'] == task_b["id"]:
                found = True
                
                #check both timestamp for local and cloud is there
                if task_b.has_key("time") and task.has_key('updated'):
                    local_time = datetime.datetime.fromtimestamp( int( task_b["time"] )/1000 )
                    parsed = task['updated'][0:task['updated'].find(".")]
                    cloud_time = datetime.datetime.strptime(parsed, '%Y-%m-%dT%H:%M:%S') - datetime.timedelta(hours=4)
                    
                    print "time comparison ", (local_time > cloud_time)
                    
                    #if the local update stamp 
                    if (local_time > cloud_time):
                        
                        print local_time, " local and cloud ", cloud_time, " ", task_b["name"]
                        
                        print "NEED TO UPDATE " + task["title"]
                        
                        print "task done ", task_b["done"] 
                        
                        entry = { 'title': task_b["name"] }
                        
                        if task_b["done"]:
                            entry["status"] = "completed"
                        else:
                            entry["status"] = "needsAction"
                        
                        if task_b.has_key("note"):
                            entry["notes"] = task_b["note"]
                        
                        if task_b.has_key("duedate"):
                            entry['due'] = datetime.datetime.strptime('06/17/2011', '%m/%d/%Y').isoformat()+".000Z"
                        
                        print entry
                        
                        update_task ( task['id'], entry )

    
        if not found or updated:
            #check the sync flag, if the sync flag is yes, that means it should be deleted, else it should be added
            if task_b.synced: #this is a local task that needs to be deleted
                pass 
            else: #this is a local task that needs to be added
                print "ADDED" + task_b.name
                
                a = create_task( { 'title': task_b.name } )
                print a
    
            deleted.append(task_b.id)
    
    pass


#1. Initial login
#a. check for all spreadsheet starts with taskstrike_
#b. for each of them, read all the task out
#c. return the tasks in a array
#d. Initialize into the first one as the one being written to
def initial_login( current_tasks, deletions ):
    global service

    print current_tasks
    print deletions

    store_input( [current_tasks, deletions] ) # this is for debugging, you can pickle the inputs and put them out again
    
    current_tasks = json.loads(current_tasks)
    deletions = json.loads( deletions )
    
    # Set up a Flow object to be used if we need to authenticate. This
    # sample uses OAuth 2.0, and we set up the OAuth2WebServerFlow with
    # the information it needs to authenticate. Note that it is called
    # the Web Server Flow, but it can also handle the flow for native
    # applications
    # The client_id and client_secret are copied from the API Access tab on
    # the Google APIs Console
    FLOW = OAuth2WebServerFlow(
        client_id='784374432524.apps.googleusercontent.com',
        client_secret='u4K1AZXSj8P9hIlEddLsMi6d',
        scope='https://www.googleapis.com/auth/tasks',
        user_agent='YOUR_APPLICATION_NAME/YOUR_APPLICATION_VERSION')
    
    # To disable the local server feature, uncomment the following line:
    # FLAGS.auth_local_webserver = False
    
    # If the Credentials don't exist or are invalid, run through the native client
    # flow. The Storage object will ensure that if successful the good
    # Credentials will get written back to a file.
    storage = Storage('tasks.dat')
    credentials = storage.get()
    if credentials is None or credentials.invalid == True:
        print "#### NO CREDENTIALS"
        return {};
    else:
        pass
    
    # Create an httplib2.Http object to handle our HTTP requests and authorize it
    # with our good Credentials.
    http = httplib2.Http()
    http = credentials.authorize(http)
    
    # Build a service object for interacting with the API. Visit
    # the Google APIs Console
    # to get a developerKey for your own application.
    service = build(serviceName='tasks', version='v1', http=http,
           developerKey='AIzaSyDjOuKvvMRHiTYJsOu1xMnTbFFedpOoOPM')
    
    deleted  = []
    
    [tasks, tasklist] = get_all_tasks()
    
    #delete the ones that are synced
    print deletions
    for x in deletions:
        print "This ARRAY ", x
        print "DELETED " + x["deletion_id"]
        delete_task(x["deletion_id"])
    
    #ii. If a task is local but not in the cloud, write it back to the cloud. If a task is updated, write it back to the cloud
    for task_b in current_tasks:
        found = False
        updated = False
        
        print task_b["id"]
        
        for task in tasks: 
            
            if task['id'] == task_b["id"]:
                found = True
                
                #check both timestamp for local and cloud is there
                if task_b.has_key("time") and task.has_key('updated'):
                    local_time = datetime.datetime.fromtimestamp( int( task_b["time"] )/1000 )
                    parsed = task['updated'][0:task['updated'].find(".")]
                    cloud_time = datetime.datetime.strptime(parsed, '%Y-%m-%dT%H:%M:%S') - datetime.timedelta(hours=4)
                    
                    print "time comparison ", (local_time > cloud_time)
                    
                    #if the local update stamp 
                    if (local_time > cloud_time):
                        
                        print local_time, " local and cloud ", cloud_time, " ", task_b["name"]
                        
                        print "NEED TO UPDATE " + task["title"]
                        
                        print "task done ", task_b["done"] 
                        
                        entry = { 'title': task_b["name"] }
                        
                        if task_b["done"]:
                            entry["status"] = "completed"
                        else:
                            entry["status"] = "needsAction"
                        
                        if task_b.has_key("note"):
                            entry["notes"] = task_b["note"]
                        
                        if task_b.has_key("duedate"):
                            entry['due'] = datetime.datetime.strptime('06/17/2011', '%m/%d/%Y').isoformat()+".000Z"
                        
                        print entry
                        
                        update_task ( task['id'], entry )

    
        if not found or updated:
            #check the sync flag, if the sync flag is yes, that means it should be deleted, else it should be added
            if task_b["synced"]: #this is a local task that needs to be deleted
                pass 
            else: #this is a local task that needs to be added
                print "ADDED" + task_b["name"]
                
                a = create_task( { 'title': task_b["name"] } )
                print a
    
            deleted.append(task_b["id"])
    
    [tasks, tasklist] = get_all_tasks()
    
    for task in tasks:
        if task.has_key('due'):
            task['due'] = task['due'][0:10].replace("-", "/")
            print task['due']
        print task
    
    print tasklist
    
    return { 'current': tasks, 'deletion': deleted, 'tasklist':tasklist }

#login with the latest stored data
def test_login():
    a = open_storage()
    print a[0]
    print a[1]

    a = initial_login(a[0], a[1])
    print a