#import gflags.gflags as gflags
import sys
print "version", sys.version
import gapi.httplib2 as httplib2

from gapi.apiclient.discovery import build
from gapi.oauth2client.file import Storage
from gapi.oauth2client.client import OAuth2WebServerFlow
from gapi.oauth2client.tools import run, create_url

import datetime
import time
import pickle
import gapi.simplejson as json

import os
import getpass
import pytz
from pytz import reference
import dateutil
from dateutil.tz import *

from threading import Thread
import httplib, urllib

import traceback

service = None
task_dict= {}
list_old_dict= {} #when a old list gets overwritten by a google id, this one has to be used with the creation
fileloc = "/"

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

#create a task
def create_task ( task ):
    global service
    global list_old_dict
    
    tasklist = task["listid"]
    del task["listid"]
    
    if list_old_dict.has_key(tasklist):
        tasklist = list_old_dict[tasklist]

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
def update_task ( task, updating, deleted, tasklist='@default'  ):
    global service
    global task_dict
    
    print "=========== updating task ==============" + " " +task
    
    tasklist = task_dict[task]
    
    # First retrieve the task to update.
    task = service.tasks().get(tasklist=tasklist, task=task).execute()
    
    if task['status'] == "completed" and updating['status'] == "needsAction":
        print task
        del task['completed']
    
    for k, v in updating.iteritems():
        print "updating", k, v, "\n"
        task[k] = v
    
    #If the tasklist is the same tasklist it's ok, else you need to delete it from one and move to the other
    if tasklist == task['listid']:
        result = service.tasks().update(tasklist=tasklist, task=task['id'], body=task).execute()
        
        # Print the completed date.
        print result
    else:
        #delete it from original list
        result1 = delete_task ( task['id'], tasklist=tasklist )
        
        #add it to the second list
        result2 = create_task ( updating )
        
        deleted.append(task['id'])
    
        print result1, result2

def create_tasklist(list):
    global service
    global list_old_dict
    
    old_list_id = list["id"]
    
    del list["id"]
    
    #special case of the initial sync
    if old_list_id == "@default":
        return
    
    result = service.tasklists().insert(body=list).execute()
    print result['id'], " created"
    
    #update the lookup dictionary with the correct entries
    list_old_dict[old_list_id] = result['id']

def update_tasklist( listid, updating, deleted ):
    global service
    
    del updating["id"]
    
    tasklist = service.tasklists().get(tasklist=listid).execute()
    tasklist['title'] = updating["title"];
    
    result = service.tasklists().update(tasklist=tasklist['id'], body=tasklist).execute()
    print result['title'], " updated"

def delete_tasklist(listid):
    global service
    
    print "deleted ", listid
    
    service.tasklists().delete(tasklist=listid).execute()

def create_link():
    global FLOW
    
    # Set up a Flow object to be used if we need to authenticate. This
    # sample uses OAuth 2.0, and we set up the OAuth2WebServerFlow with
    # the information it needs to authenticate. Note that it is called
    # the Web Server Flow, but it can also handle the flow for native
    # applications
    # The client_id and client_secret are copied from the API Access tab on
    # the Google APIs Console
    
    return create_url(FLOW)

def validate_code(code, fileloc):
    global FLOW
    #FLOW = OAuth2WebServerFlow(
    #client_id='784374432524.apps.googleusercontent.com',
    #client_secret='u4K1AZXSj8P9hIlEddLsMi6d',
    #scope='https://www.googleapis.com/auth/tasks',
    #user_agent='YOUR_APPLICATION_NAME/YOUR_APPLICATION_VERSION')
    
    print code
    print fileloc
    print getpass.getuser()
    
    try:
        storage = Storage( str(fileloc)+'/tasks.dat' )
    except:
        print "Unexpected error:", sys.exc_info()
        print "validation failed due to can't create file"
        flag = False
        return { "creds": None, "flag": flag }
    
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
    entry["id"] = local_unit["id"]
    
    print entry
    return entry

#Sync the model given a local data set, and a cloud data set
#1. Both model must have a timestamp
#2. Local model must have a synced flag
def sync_model(local, cloud, deleted, create_function, update_function, local_to_cloud_trans):
    
    print "*************************"
    print "SYNCING"
    print "*************************"
    
    #1. If a task is local but not in the cloud, write it back to the cloud. If a task is updated, write it back to the cloud
    for local_unit in local:
        found = False
        updated = False
        
        print local_unit
        
        for cloud_unit in cloud: 
            
            if cloud_unit['id'] == local_unit["id"]:
                found = True
                
                #check both timestamp for local and cloud is there
                if local_unit.has_key("time"):
                
                    if cloud_unit.has_key('updated'):
                    
                        #create the western timezone
                        #western = pytz.timezone('US/Pacificsdf')
                    
                        #parsing the time out for comparison
                        local_time = datetime.datetime.fromtimestamp( int( local_unit["time"] )/1000 )
                        #local_time = local_time.replace(tzinfo=tzlocal())
                        
                        #convert localtime to calitime
                        #tz = pytz.timezone('US/Pacific-New')
                        #local_time = tz.normalize(tz.localize(local_time)).astimezone(tz)
                        
                        parsed = cloud_unit['updated'][0:cloud_unit['updated'].find(".")]
                        
                        #create a datetime offset of 4 hours for EST and pacific difference
                        if (time.tzname[0] == 'EST'):
                            cloud_time = datetime.datetime.strptime(parsed, '%Y-%m-%dT%H:%M:%S') - datetime.timedelta(hours=4)
                        else:
                            cloud_time = datetime.datetime.strptime(parsed, '%Y-%m-%dT%H:%M:%S')
                        #cloud_time = western.localize(cloud_time)
                        
                        #print "cloud unit", cloud_unit
                        #print "parsed: ", parsed, cloud_unit['updated']
                        #print "time comparison = local: ", local_time, " cloud: ", cloud_time
                        #print "time comparison utc = local: ", local_time.utcoffset(), " cloud: ", cloud_time.utcoffset()
                        #print "time comparison utc = local: ", ( local_time.replace(tzinfo=None) - local_time.utcoffset() ), " cloud: ", ( cloud_time.replace(tzinfo=None) - cloud_time.utcoffset() )
                        #print "time comparison utc adjusted: ", (( local_time.replace(tzinfo=None) - local_time.utcoffset() ) > ( cloud_time.replace(tzinfo=None) - cloud_time.utcoffset() ))
                        #print "time comparison = local: ", local_time.tzinfo, " cloud: ", cloud_time.tzinfo
                        #print "time comparison ", (local_time > cloud_time)
                        #print "time comparison ", (local_time - cloud_time)
                        
                        #if the local update stamp 
                        if (local_time > cloud_time):
                            
                            print local_time, " local and cloud ", cloud_time, " ", local_unit["name"]
                        
                            entry = local_to_cloud_trans(local_unit, {})
                            update_function ( local_unit['id'], entry, deleted )
                    
                    else: # no updated field in the cloud
                        #assume that you can overwrite cloud with local
                        entry = local_to_cloud_trans(local_unit, {})
                        update_function ( local_unit['id'], entry, deleted )
    
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
def initial_login( current_tasks, deletions, list, deletedlist, fileloc):
    global service
    global FLOW

    try:
        print current_tasks
        print deletions
    
        #store_input( [current_tasks, deletions, list, deletedlist, fileloc] ) # this is for debugging, you can pickle the inputs and put them out again, not working
    
        print [current_tasks, deletions, list, deletedlist, str(fileloc)]
        
        current_tasks = json.loads(current_tasks)
        deletions = json.loads( deletions )
        list = json.loads(list)
        deletedlist = json.loads(deletedlist)
        
        # To disable the local server feature, uncomment the following line:
        # FLAGS.auth_local_webserver = False
        
        # If the Credentials don't exist or are invalid, run through the native client
        # flow. The Storage object will ensure that if successful the good
        # Credentials will get written back to a file.
        storage = Storage( str(fileloc)+'/tasks.dat' )
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
            if x.has_key("deletion_id"):
                print "DELETED " + x["deletion_id"]
                delete_task(x["deletion_id"])
            
        #delete the lists that are deleted
        print deletedlist
        for x in deletedlist:
            if x.has_key("deletion_id"):
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
        
        b = { 'current': tasks, 'deletion': deleted_tasks, 'tasklist':tasklist, 'list_deletions': deleted_list }
        
        Titanium.API.runOnMainThread(window.Sync_after, b)
    
    except:
        e = sys.exc_info()[1]
        write_string = ""
        print "Exception: ", e, sys.exc_traceback.tb_lineno
        write_string = write_string + "Exception: " + str(e)+ str(sys.exc_traceback.tb_lineno)
        for frame in traceback.extract_tb(sys.exc_info()[2]):
            fname,lineno,fn,text = frame
            print "Error in %s on line %d" % (fname, lineno)
            write_string = write_string + ( "Error in %s on line %d \n" % (fname, lineno) )
        submit_error_form (write_string)
        Titanium.API.runOnMainThread(window.Sync_failed)

def initial_login_entry( current_tasks, deletions, list, deletedlist, fileloc):
    t = Thread(target=initial_login, args=( current_tasks, deletions, list, deletedlist, fileloc))
    t.start()

#login with the latest stored data
def test_login():
    a = ['[{"name":"a-hole","done":false,"time":"1317304795702","duedate":"","note":"","order":0,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDo3ODAwNzYxMDQ"},{"name":"Poker game with cards","done":false,"time":"1317298926292","duedate":null,"order":1,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDo4Mzg5ODc2NjM"},{"name":"Educational programming app","done":false,"time":"1317298926299","duedate":null,"note":"You have a robot which outputs whatever you print in a bubble form. And a monster telling what it does in for input\\n","order":2,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxNjQzODQ1ODg5"},{"name":"aesop fables","done":false,"time":"1317298926306","duedate":null,"note":"http://www.gutenberg.org/files/19994/19994-h/19994-h.htm#Page_11","order":3,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDo1OTY0MDMyMjQ"},{"name":"Cliff notes with annotation refering back to the original","done":false,"time":"1317298926314","duedate":null,"order":4,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDozNzEwODUwMg"},{"name":"Chess opening app","done":false,"time":"1317298926322","duedate":null,"order":5,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxODQ1NTcwMzUx"},{"name":"Tarot app","done":false,"time":"1317298926337","duedate":null,"order":6,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxNzUzNDI2ODYw"},{"name":"start on five tibetan app","done":false,"time":"1317298926350","duedate":null,"note":"should do it on appcelerator","order":7,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDo3"},{"name":"choose your own adventure app","done":false,"time":"1317298926356","duedate":null,"order":8,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDo5"},{"name":"techramen testing six","done":false,"time":"1317298926363","duedate":"06/17/2011","order":9,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxMA"},{"name":"webflyerz","done":false,"time":"1317298926370","duedate":null,"order":10,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxMQ"},{"name":"destjil algorithm and printing. Art as a formula","done":false,"time":"1317298926400","duedate":null,"order":11,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxMw"},{"name":"unopager","done":false,"time":"1317298926408","duedate":"06/17/2011","order":12,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxNQ"},{"name":"staticlightning, a static node.js server","done":false,"time":"1317298926414","duedate":"06/17/2011","order":13,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxNg"},{"name":"facebook recruiting","done":false,"time":"1317298926421","duedate":null,"order":14,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxNw"},{"name":"todo list + sqlite + dropbox for teamwork stuff","done":false,"time":"1317298926427","duedate":null,"order":15,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxOA"},{"name":"today I learned website with coding knowledge gems","done":false,"time":"1317298926434","duedate":null,"order":16,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoyMQ"},{"name":"hivemind, a group coding thing with search, git, and key store data access","done":false,"time":"1317298926457","duedate":null,"order":17,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoyMw"},{"name":"Storywall: wood grain background","done":false,"time":"1317298926464","duedate":"06/17/2011","order":18,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoyMg"},{"name":"Storysquare.com","done":false,"time":"1317298926471","duedate":null,"order":19,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoyNQ"},{"name":"bottle groupon site","done":false,"time":"1317298926478","duedate":null,"order":20,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoyNg"},{"name":"game playing with google backend","done":false,"time":"1317298926484","duedate":null,"order":21,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoyOA"},{"name":"hobo board, nude girl with messages with twitter messaging","done":false,"time":"1317298926490","duedate":"06/15/2011","order":22,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoyNw"},{"name":"Reddit for woman\'s clothing","done":false,"time":"1317298926513","duedate":null,"order":23,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDo4MQ"},{"name":"Create a yearbook from facebook test","done":false,"time":"1317298926520","duedate":null,"order":24,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDo4Mg"},{"name":"Fix sync algorithm where switching list doesn\'t work","done":false,"time":"1317298926527","duedate":null,"order":0,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6Mjc3NzIzNjQ5"},{"name":"Subtasks","done":false,"time":"1317298926540","duedate":"09/18/2011","note":"Tabled for now\\n","order":2,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6NDc1MDQzNDA4"},{"name":"Change sync algorithm to be better","done":false,"time":"1317298926564","duedate":null,"order":3,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTk3Mzg2NzA3Mw"},{"name":"Window version","done":false,"time":"1317298926573","duedate":null,"order":4,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MjExOTc5NjE1OQ"},{"name":"Reorder lists","done":false,"time":"1317298926579","duedate":null,"order":5,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6NDE0MjMwOTQw"},{"name":"Video showing this shit","done":false,"time":"1317298926586","duedate":null,"note":"","order":6,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTc3NTcxMjYxMA"},{"name":"help that is a additional layer with arrows","done":false,"time":"1317298926593","duedate":null,"note":"","order":7,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTE5ODA0NjM4Mw"},{"name":"fade in new tasks","done":false,"time":"1317298926599","duedate":"08/19/2011","note":"","order":8,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTU"},{"name":"Added new list needs to dissapear if not selected after adding a new list in a single view mode","done":false,"time":"1317298926622","duedate":null,"order":9,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTA"},{"name":"Parent and child","done":false,"time":"1317298926629","duedate":null,"note":"","order":10,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6OQ"},{"name":"Multiple columns","done":false,"time":"1317298926534","duedate":null,"order":1,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6NQ"},{"name":"video or link back to site","done":false,"time":"1317298926636","duedate":null,"order":0,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjY6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjY6MTQ4OTI0OTkzMA"},{"name":"Change the screenshots on my mac app page to actually reflect the product more","done":false,"time":"1317298926649","duedate":null,"note":"","order":2,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjY6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjY6NzY4Mjk0Mg"}]', '[]', '[{"name":"Ray\'s list","synced":true,"time":"1315357556649","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow"},{"name":"Gtasktic","synced":true,"time":"1315357556722","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA"},{"name":"Urgent Shit I have to do again","synced":true,"time":"1315357556759","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjY6MA"}]', '[]', '/Users/raywang/Library/Gtasktic']    
    print a[0]
    print a[1]
    print a[4]

    a = initial_login(a[0], a[1], a[2], a[3], a[4])
    print a
    
#submit a form to google forms
def submit_error_form (error):
    params = urllib.urlencode({"formkey": "dExjNVkwM1JkQm1oYy1BMGRKVjlUaVE6MQ", 'entry.0.single': error, "hl":"en_US"})
    headers = {"Content-type": "application/x-www-form-urlencoded","Accept": "text/plain"}
    conn = httplib.HTTPSConnection('docs.google.com')
    f = urllib.urlopen("https://docs.google.com/spreadsheet/formResponse", params)
    print f.read()