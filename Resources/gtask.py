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
time_difference = None

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
def create_task ( task, tasklist='@default' ):
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
        if task_dict.has_key(task):
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
        #print "updating", k, v, "\n"
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
    #print result['title'], " updated"

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

#compare the two
def compare_difference (cloud_unit, local_translated):
    
    for k, v in cloud_unit.iteritems():
        print v, cloud_unit[k]
        if v != cloud_unit[k]:
            return false
    return True


def item_to_dictionary( items ):
    dict = {}
    
    for value in items:
        print "value:", value
        
        key = value['id']
        dict[key] = value
    
    return dict

#sync with the set based algorithm
def sync_model_set(local, cloud, deleted, create_function, update_function, local_to_cloud_trans):
    
    current_dict = item_to_dictionary( local )
    cloud_dict = item_to_dictionary( cloud )
    
    print current_dict.keys()
    print cloud_dict.keys()
    
    #process the set of ids that are there locally but not there on the cloud
    #If their synced flag is False, add them, else delete them
    print "items that are there locally but not there on the cloud"
    for id in ( set( current_dict.keys() ) - set( cloud_dict.keys() ) ):
        print id
        if current_dict[id]['synced'] == False:
            entry = local_to_cloud_trans(local_unit, {})
            create_function( current_dict[id] )
            print "created"
        else:
            deleted.append(id)
            print "passed back for deletion"    
            
    #process the set of ids that are there on the cloud but not there locally
    #Add them back locally since everything deleted should be on the deleted list and taken care of first
    print "items that are there in the cloud but not there locally"
    for id in ( set( cloud_dict.keys() ) - set( current_dict.keys() ) ):
        print id
        pass_back.append( cloud_dict[id] )
        print "append to pass back for local creation"
    
    #process the set of ids that are there in the cloud and locally
    #check their timestamps, if local > cloud, write local to cloud, if cloud > local, put it in passback to overwrite local,
    #if cloud == local, do nothing
    print "items that are there in the cloud and there locally"
    for id in ( set( cloud_dict.keys() ) & set( current_dict.keys() ) ):
        print id
        
        
        if current_dict[id]['time'] == cloud_dict[id]['time']:
            print "timestamp the same do nothing"
        elif current_dict[id]['time'] > cloud_dict[id]['time']:
            edit_task(id, current_dict[id])
            print "update the current task in the cloud"
        else:
            pass_back.append( cloud_dict[id] )
            print "append to pass back for local update"

#Sync the model given a local data set, and a cloud data set
#1. Both model must have a timestamp
#2. Local model must have a synced flag
def sync_model(local, cloud, deleted, create_function, update_function, local_to_cloud_trans):
    global time_difference
    
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
                        
                        print "TIME AND UPDATED IS PRESENT AND ID MATCHES"
                        
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
                        cloud_time = datetime.datetime.strptime(parsed, '%Y-%m-%dT%H:%M:%S') - time_difference
                        #cloud_time = western.localize(cloud_time)
                        
                        #print "cloud unit", cloud_unit
                        #print "parsed: ", parsed, cloud_unit['updated']
                        #print "timezone: ", time.tzname[0]
                        #print "time comparison = local: ", local_time, " cloud: ", cloud_time
                        #print "time comparison utc = local: ", local_time.utcoffset(), " cloud: ", cloud_time.utcoffset()
                        #print "time comparison utc = local: ", ( local_time.replace(tzinfo=None) - local_time.utcoffset() ), " cloud: ", ( cloud_time.replace(tzinfo=None) - cloud_time.utcoffset() )
                        #print "time comparison utc adjusted: ", (( local_time.replace(tzinfo=None) - local_time.utcoffset() ) > ( cloud_time.replace(tzinfo=None) - cloud_time.utcoffset() ))
                        #print "time comparison = local: ", local_time.tzinfo, " cloud: ", cloud_time.tzinfo
                        #print "time comparison ", (local_time > cloud_time)
                        #print "time comparison ", (local_time - cloud_time)
                        
                        entry = local_to_cloud_trans(local_unit, {})
                        
#                        any_difference = compare_difference (cloud_unit, entry)
#                        
#                        if not any_difference:
#                            print "###########################"
#                            print "# There is a difference    #"
#                            print "###########################"
                        
                        print local_time, " local and cloud ", cloud_time
                        
                        #if the local update stamp 
                        if (local_time > cloud_time): #and not any_difference:
                            
                            #print local_time, " local and cloud ", cloud_time, " ", local_unit["name"], " GOING TO UPDATE "
                            
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
                #print u"ADDED" + local_unit["name"]
                                
                entry = local_to_cloud_trans(local_unit, {})
                
                a = create_function( entry )
                print a
    
            deleted.append(local_unit["id"])

#set up the globals for the client
def set_up_client(fileloc):
    global service
    global FLOW
    global time_difference
    
    # If the Credentials don't exist or are invalid, run through the native client
    # flow. The Storage object will ensure that if successful the good
    # Credentials will get written back to a file.
    storage = Storage( str(fileloc)+'/tasks.dat' )
    credentials = storage.get()
    if credentials is None or credentials.invalid == True:
        print "NO CREDENTIALS"
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
    
    #set the time difference
    time_difference = get_time_difference_brute_force()

#1. Initial login
#a. check for all spreadsheet starts with taskstrike_
#b. for each of them, read all the task out
#c. return the tasks in a array
#d. Initialize into the first one as the one being written to
def initial_login( current_tasks, deletions, list, deletedlist, fileloc):
    global service
    global FLOW
    global time_difference

    try:
        #print current_tasks
        #print deletions
    
        #store_input( [current_tasks, deletions, list, deletedlist, fileloc] ) # this is for debugging, you can pickle the inputs and put them out again, not working
    
        print [current_tasks, deletions, list, deletedlist, str(fileloc)]
        
        current_tasks = json.loads(current_tasks)
        deletions = json.loads( deletions )
        list = json.loads(list)
        deletedlist = json.loads(deletedlist)
        
        set_up_client(fileloc)
        
        deleted_tasks  = []
        deleted_list = []
        
        [tasks, tasklist] = get_all_tasks()
        
        #delete the ones that are synced
        #print deletions
        for x in deletions:
            #print "This ARRAY ", x
            if x.has_key("deletion_id"):
                print "DELETED " + x["deletion_id"]
                delete_task(x["deletion_id"])
            
        #delete the lists that are deleted
        #print deletedlist
        for x in deletedlist:
            if x.has_key("deletion_id"):
                delete_tasklist(x["deletion_id"])
    
        sync_model(list, tasklist, deleted_list, create_tasklist, update_tasklist, local_to_cloud_trans_tasklist)
        sync_model(current_tasks, tasks, deleted_tasks, create_task, update_task, local_to_cloud_trans_task)
        
        [tasks, tasklist] = get_all_tasks()
        
        for task in tasks:
            if task.has_key('due'):
                task['due'] = task['due'][0:10].replace("-", "/")
                #print task['due']
            #print task
        
        #print tasklist
        
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
    a = ['[{"name":"Poker game with cards","done":false,"time":"1322077207554","duedate":"","note":"note one two three four FIVER","order":2,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDo4Mzg5ODc2NjM"},{"name":"Educational programming app","done":false,"time":"1321903427834","duedate":null,"note":"You have a robot which outputs whatever you print in a bubble form. And a monster telling what it does in for input\\n","order":3,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxNjQzODQ1ODg5"},{"name":"aesop fables","done":false,"time":"1321903427810","duedate":null,"note":"http://www.gutenberg.org/files/19994/19994-h/19994-h.htm#Page_11","order":2,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDo1OTY0MDMyMjQ"},{"name":"Cliff notes with annotation refering back to the original","done":false,"time":"1321903427871","duedate":null,"note":"","order":4,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDozNzEwODUwMg"},{"name":"Chess opening app","done":false,"time":"1321903427903","duedate":null,"note":"","order":5,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxODQ1NTcwMzUx"},{"name":"Tarot app","done":false,"time":"1321903427937","duedate":null,"note":"","order":6,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxNzUzNDI2ODYw"},{"name":"start on five tibetan app","done":false,"time":"1321903427965","duedate":null,"note":"should do it on appcelerator","order":7,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDo3"},{"name":"choose your own adventure app","done":false,"time":"1321903428000","duedate":null,"note":"","order":8,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDo5"},{"name":"techramen testing six","done":false,"time":"1321903428027","duedate":"06/17/2011","order":9,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxMA"},{"name":"webflyerz","done":false,"time":"1321903428059","duedate":null,"note":"","order":10,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxMQ"},{"name":"destjil algorithm and printing. Art as a formula","done":false,"time":"1321903428088","duedate":null,"order":11,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxMw"},{"name":"unopager","done":false,"time":"1321903428117","duedate":"06/17/2011","note":"","order":12,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxNQ"},{"name":"staticlightning, a static node.js server","done":false,"time":"1321903428145","duedate":"06/17/2011","note":"","order":13,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxNg"},{"name":"facebook recruiting","done":false,"time":"1321903428174","duedate":null,"order":14,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxNw"},{"name":"todo list + sqlite + dropbox for teamwork stuff","done":false,"time":"1321903428216","duedate":null,"order":15,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxOA"},{"name":"today I learned website with coding knowledge gems","done":false,"time":"1321903428250","duedate":null,"order":16,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoyMQ"},{"name":"hivemind, a group coding thing with search, git, and key store data access","done":false,"time":"1321903428283","duedate":null,"order":17,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoyMw"},{"name":"Storywall: wood grain background","done":false,"time":"1321903428312","duedate":"06/17/2011","order":18,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoyMg"},{"name":"Storysquare.com","done":false,"time":"1321903428338","duedate":null,"order":19,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoyNQ"},{"name":"bottle groupon site","done":false,"time":"1321903428371","duedate":null,"order":20,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoyNg"},{"name":"game playing with google backend","done":false,"time":"1321903428399","duedate":null,"order":21,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoyOA"},{"name":"hobo board, nude girl with messages with twitter messaging","done":false,"time":"1321903428451","duedate":"06/15/2011","order":22,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoyNw"},{"name":"Reddit for woman\'s clothing","done":false,"time":"1321903428477","duedate":null,"order":23,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDo4MQ"},{"name":"Create a yearbook from facebook test","done":false,"time":"1321903427764","duedate":null,"note":"","order":0,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDo4Mg"},{"name":"Fix sync algorithm where switching list doesn\'t work","done":false,"time":"1321903429140","duedate":null,"order":13,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6Mjc3NzIzNjQ5"},{"name":"Subtasks","done":false,"time":"1321903428871","duedate":"09/18/2011","note":"Tabled for now\\n","order":5,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6NDc1MDQzNDA4"},{"name":"Change sync algorithm to be better","done":false,"time":"1321903428812","duedate":null,"note":"","order":3,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTk3Mzg2NzA3Mw"},{"name":"Window version","done":false,"time":"1321903428901","duedate":null,"note":"","order":6,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MjExOTc5NjE1OQ"},{"name":"Reorder lists","done":false,"time":"1321903428928","duedate":null,"order":7,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6NDE0MjMwOTQw"},{"name":"Video showing this shit","done":false,"time":"1321903428952","duedate":null,"note":"","order":8,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTc3NTcxMjYxMA"},{"name":"help that is a additional layer with arrows","done":false,"time":"1321903428840","duedate":null,"note":"","order":4,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTE5ODA0NjM4Mw"},{"name":"fade in new tasks","done":false,"time":"1321903429062","duedate":"08/19/2011","note":"","order":10,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTU"},{"name":"Multiple columns","done":false,"time":"1321903429199","duedate":null,"order":15,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6NQ"},{"name":"Change the screenshots on my mac app page to actually reflect the product more","done":false,"time":"1321903429658","duedate":null,"note":"","order":0,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjY6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjY6NzY4Mjk0Mg"},{"name":"Added new list needs to dissapear if not selected after adding a new list in a single view mode","done":false,"time":"1321903428984","duedate":null,"order":9,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6NzUwOTg5MjI1"},{"name":"Parent and child edited II","done":false,"time":"1321903429088","duedate":null,"order":11,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6NzkwMjMzMzE5"},{"name":"Weekly, like teudeux but for the desktop","done":false,"time":"1321903428515","duedate":null,"order":24,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoyMTQyMTA3Mjc1"},{"name":"dragging into a new list is impossible","done":false,"time":"1321903429114","duedate":null,"order":12,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTAzMjIxNzA5"},{"name":"Book hotel xi\'\'an beijing","done":true,"time":"1321903429694","duedate":null,"order":1,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjY6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjY6MzgyMDA4OTI"},{"name":"start on weekly edit","done":false,"time":"1321903429723","duedate":null,"note":"","order":2,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjY6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjY6MTE5MzYwNzA3Mg"},{"name":"upgrade appcelerator","done":false,"time":"1321903429813","duedate":null,"note":"","order":3,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjY6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjY6MTY2NTU1MDc3Mg"},{"name":"Plan my travel starting on the 17th","done":true,"time":"1321903429837","duedate":null,"order":4,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjY6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjY6MTQ2OTkzNjQyMw"},{"name":"Redo template to have a sidebar for team members","done":true,"time":"1321903429866","duedate":null,"order":0,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjE0MDEzNjUxNjQ"},{"name":"Inventory system that is social so you can see what is selling well by other small stores","done":false,"time":"1321903428546","duedate":null,"note":"Order with me","order":25,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxMjQ2NTQ5MjI4"},{"name":"Script reading app","done":false,"time":"1321903428582","duedate":null,"order":26,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoyMDQwMzE0NDU3"},{"name":"Write a javascript api to google tasks","done":false,"time":"1321903429232","duedate":null,"order":16,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTE3MTU2NjcyNw"},{"name":"Associate the task user model with user","done":true,"time":"1321903429892","duedate":null,"order":1,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjE3NDI3NjUyNjY"},{"name":"Complete user ediiting and color","done":false,"time":"1321903429919","duedate":null,"order":2,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjEzNjc3MTk4OTk"},{"name":"Tai chi with victoria 5","done":false,"time":"1321903428617","duedate":null,"order":27,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxNjU5MTg0MzM4"},{"name":"Pull down stuff!!!","done":false,"time":"1321903429945","duedate":null,"order":3,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjE2MjcyODE5NTc"},{"name":"Users should be directly linked to ACL?","done":false,"time":"1321903429968","duedate":null,"order":4,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjE1NjA5NjU1NA"},{"name":"Sync Users","done":false,"time":"1321903430000","duedate":null,"order":5,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjE5ODQyMTc1Mg"},{"name":"Write a function that get\'\'s the id of both set of tasks","done":true,"time":"1321903430030","duedate":null,"order":6,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjQ1Njg4MDkyNQ"},{"name":"Suck down all the models once you upload it from another instance","done":true,"time":"1321903430065","duedate":null,"order":7,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjE4Nzg3MDc1Nzc"},{"name":"Write a single person all the models that you need to write","done":true,"time":"1321903430094","duedate":null,"order":8,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjEzNzQyNTY0NjI"},{"name":"Test the ACL","done":true,"time":"1321903430125","duedate":null,"order":9,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjg5MTQ4MDU4Nw"},{"name":"Test the python script for connecting to google spreadsheet","done":true,"time":"1321903430178","duedate":null,"order":11,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjM2MjUzNTIxOQ"},{"name":"try multi-threading python first","done":true,"time":"1321903429170","duedate":null,"order":14,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTMwMTgzMjQz"},{"name":"sharepoint clone with dropbox","done":false,"time":"1321903428646","duedate":null,"order":28,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDo2MjU1NTkxMTY"},{"name":"Take coffeescript changes from taskstrike and move them to gtaskstic","done":false,"time":"1321903429260","duedate":null,"order":17,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6ODM0NTU4MTUx"},{"name":"Help menu and intial setup","done":false,"time":"1321903429288","duedate":null,"order":18,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTA0MTI1NDUwNg"},{"name":"sync should not work if you do not validate","done":true,"time":"1321903428773","duedate":null,"order":2,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MzE3Mjk1OTcz"},{"name":"error message for sync","done":true,"time":"1321903428710","duedate":null,"note":"","order":0,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTU5ODE4MzM1Ng"},{"name":"Remote error loggin with http storing that stuff somewhere for you to see","done":false,"time":"1321903428679","duedate":null,"order":29,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDoxNDY1Mjc4NDk1"},{"name":"cannot sync if you are offline.","done":true,"time":"1321903428744","duedate":null,"order":1,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTYxMDM3MjQ5Ng"},{"name":"Build for distribution","done":false,"time":"1321903429329","duedate":null,"order":19,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6NTkwODg4ODQ4"},{"name":"Auto syncing every 5 minutes and at the start of the program if you have stuff to sync","done":false,"time":"1321903429360","duedate":null,"order":20,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTQ4MDc1NjIwOQ"},{"name":"Error handling so all errors are sent to a google form","done":true,"time":"1321903429392","duedate":null,"order":21,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6Mzk3MDY1NzQ3"},{"name":"Build for distribution","done":false,"time":"1321903429421","duedate":null,"order":22,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTUzMjE0MTc0MQ"},{"name":"Auto syncing every 5 minutes and at the start of the program if you have stuff to sync","done":false,"time":"1321903429486","duedate":null,"order":23,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTczNDUyMjcxMA"},{"name":"Error handling so all errors are sent to a google form","done":true,"time":"1321903429512","duedate":null,"order":24,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTg3NzU1MzA4MA"},{"name":"done does not sync","done":false,"time":"1321903429539","duedate":null,"note":"","order":25,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTY3MzY0NDY1OA"},{"name":"two test","done":false,"time":"1321903429571","duedate":null,"note":"","order":26,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MTIzNDA5MTMwNA"},{"name":"one test","done":false,"time":"1321903429597","duedate":null,"note":"","order":27,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6OTA1MDYwMTUx"},{"name":"arrow on small calendar does not show.","done":false,"time":"1321903429630","duedate":null,"order":28,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MjEzNjE1Mjg0MQ"},{"name":"test done","done":false,"time":"1321905529992","duedate":null,"note":"","order":10,"synced":true,"listid":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjA","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjIxMTgyODE3NjU"}]', '[]', '[{"name":"Ray\'s list","synced":true,"time":"1315357556649","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6MDow"},{"name":"Gtasktic","synced":true,"time":"1315357556722","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjQ6MA"},{"name":"Urgent Shit I have to do again","synced":true,"time":"1315357556759","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NjY6MA"},{"name":"Taskstrike","synced":true,"time":"1317565278783","id":"MTYyOTI3MDM5MTg1MTc4ODM0NzE6NTc1NDEyNTAzOjA"}]', '[]', '/Users/raywang/Library/Gtasktic']    

    a = initial_login(a[0], a[1], a[2], a[3], a[4])
    print a 
    
#submit a form to google forms
def submit_error_form (error):
    params = urllib.urlencode({"formkey": "dExjNVkwM1JkQm1oYy1BMGRKVjlUaVE6MQ", 'entry.0.single': error, "hl":"en_US"})
    headers = {"Content-type": "application/x-www-form-urlencoded","Accept": "text/plain"}
    conn = httplib.HTTPSConnection('docs.google.com')
    f = urllib.urlopen("https://docs.google.com/spreadsheet/formResponse", params)
    print f.read()

def get_time_difference_brute_force():
    current_time_check = datetime.datetime.now()
    a = create_task ( {"title": "testtime", "status":"needsAction", "listid":"@default" } )
    delete_task(a["id"])
    parsed = a['updated'][0:a['updated'].find(".")]
    cloud_time= datetime.datetime.strptime(parsed, '%Y-%m-%dT%H:%M:%S')
    return cloud_time - current_time_check