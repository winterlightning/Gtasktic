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
def create_task ( task ):
    global service
    
    tasklist = task["listid"]
    del task["listid"]
    
    result = service.tasks().insert(tasklist=tasklist, body=task).execute()
    print result['id']
    
    return result

#delete a task
def delete_task ( task, tasklist='@default' ):
    global service
    global task_dict
    
    try:
        tasklist = task_dict[task]
        print "tasklist: ", tasklist
        service.tasks().delete(tasklist=tasklist, task=task).execute()
    except:
        print "task ", task, " does not exist"
    
#update a task
def update_task ( task, updating, tasklist='@default' ):
    global service
    global task_dict
    
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

def create_tasklist(list):
    global service
    
    result = service.tasklists().insert(body=list).execute()
    print result['id'], " created"

def update_tasklist( listid, updating ):
    global service
    
    tasklist = service.tasklists().get(tasklist=listid).execute()
    tasklist['title'] = updating["title"];
    
    result = service.tasklists().update(tasklist=tasklist['id'], body=tasklist).execute()
    print result['title'], " updated"

def delete_tasklist(listid):
    global service
    
    print "deleted ", listid
    
    service.tasklists().delete(tasklist=listid).execute()

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
    
    print service
    
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

#transform a task form the local to the cloud version for updates
def local_to_cloud_trans_task(local_unit, entry):
    print local_unit
    
    entry['title']= local_unit["name"]
    
    if local_unit.has_key("done") and local_unit["done"]:
        entry["status"] = "completed"
    else:
        entry["status"] = "needsAction"
    
    if local_unit.has_key("note") and local_unit["note"]:
        entry["notes"] = local_unit["note"]
    
    if local_unit.has_key("duedate") and local_unit["duedate"]:
        entry['due'] = datetime.datetime.strptime(local_unit["duedate"], '%m/%d/%Y').isoformat()+".000Z"
    
    print local_unit
    
    entry["listid"] = local_unit["listid"]
    
    print entry
    
    return entry

#transform a task list from the local to the cloud version
def local_to_cloud_trans_tasklist(local_unit, entry):
    entry["title"] = local_unit["name"]
    
    print entry
    return entry

#Sync the model given a local data set, and a cloud data set
#1. Both model must have a timestamp
#2. Local model must have a synced flag
def sync_model(local, cloud, deleted, create_function, update_function, local_to_cloud_trans):
    
    #1. If a task is local but not in the cloud, write it back to the cloud. If a task is updated, write it back to the cloud
    for local_unit in local:
        found = False
        updated = False
        
        print local_unit
        
        for cloud_unit in cloud: 
            
            if cloud_unit['id'] == local_unit["id"]:
                found = True
                
                #check both timestamp for local and cloud is there
                if local_unit.has_key("time") and cloud_unit.has_key('updated'):
                    #parsing the time out for comparison
                    local_time = datetime.datetime.fromtimestamp( int( local_unit["time"] )/1000 )
                    parsed = cloud_unit['updated'][0:cloud_unit['updated'].find(".")]
                    cloud_time = datetime.datetime.strptime(parsed, '%Y-%m-%dT%H:%M:%S') - datetime.timedelta(hours=4)
                    
                    print "time comparison ", (local_time > cloud_time)
                    
                    #if the local update stamp 
                    if (local_time > cloud_time):
                        
                        print local_time, " local and cloud ", cloud_time, " ", local_unit["name"]
                    
                        entry = local_to_cloud_trans(local_unit, {})
                        
                        update_function ( local_unit['id'], entry )
    
        if not found or updated:
            #check the sync flag, if the sync flag is yes, that means it should be deleted, else it should be added
            if local_unit.has_key("synced") and local_unit["synced"]: #this is a local task that needs to be deleted
                pass 
            else: #this is a local task that needs to be added
                print "ADDED" + local_unit["name"]
                                
                entry = local_to_cloud_trans(local_unit, {})
                
                a = create_function( entry )
                print a
    
            deleted.append(local_unit["id"])


#1. Initial login
#a. check for all spreadsheet starts with taskstrike_
#b. for each of them, read all the task out
#c. return the tasks in a array
#d. Initialize into the first one as the one being written to
def initial_login( current_tasks, deletions, list, deletedlist ):
    global service

    print current_tasks
    print deletions

    store_input( [current_tasks, deletions, list, deletedlist] ) # this is for debugging, you can pickle the inputs and put them out again
    
    current_tasks = json.loads(current_tasks)
    deletions = json.loads( deletions )
    list = json.loads(list)
    deletedlist = json.loads(deletedlist)
    
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
    
    deleted_tasks  = []
    deleted_list = []
    
    [tasks, tasklist] = get_all_tasks()
    
    #delete the ones that are synced
    print deletions
    for x in deletions:
        print "This ARRAY ", x
        print "DELETED " + x["deletion_id"]
        delete_task(x["deletion_id"])
        
    #delete the lists that are deleted
    print deletedlist
    for x in deletedlist:
        delete_tasklist(x["deletion_id"])

    sync_model(list, tasklist, deleted_list, create_tasklist, update_tasklist, local_to_cloud_trans_tasklist)
    sync_model(current_tasks, tasks, deleted_tasks, create_task, update_task, local_to_cloud_trans_task)
    
    [tasks, tasklist] = get_all_tasks()
    
    for task in tasks:
        if task.has_key('due'):
            task['due'] = task['due'][0:10].replace("-", "/")
            print task['due']
        print task
    
    print tasklist
    
    return { 'current': tasks, 'deletion': deleted_tasks, 'tasklist':tasklist, 'list_deletions': deleted_list }

#login with the latest stored data
def test_login():
    a = open_storage()
    print a[0]
    print a[1]

    a = initial_login(a[0], a[1], a[2], a[3])
    print a