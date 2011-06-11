import gapi.gflags.gflags as gflags
import gapi.httplib2 as httplib2

from gapi.apiclient.discovery import build
from gapi.oauth2client.file import Storage
from gapi.oauth2client.client import OAuth2WebServerFlow
from gapi.oauth2client.tools import run

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
  credentials = run(FLOW, storage)

# Create an httplib2.Http object to handle our HTTP requests and authorize it
# with our good Credentials.
http = httplib2.Http()
http = credentials.authorize(http)

# Build a service object for interacting with the API. Visit
# the Google APIs Console
# to get a developerKey for your own application.
service = build(serviceName='tasks', version='v1', http=http,
       developerKey='AIzaSyDjOuKvvMRHiTYJsOu1xMnTbFFedpOoOPM')

#1. Initial login
#a. check for all spreadsheet starts with taskstrike_
#b. for each of them, read all the task out
#c. return the tasks in a array
#d. Initialize into the first one as the one being written to
def initial_login( current_tasks ):
    global service
    tasks = service.tasks().list(tasklist='@default').execute()
    
    return tasks
  
