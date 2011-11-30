from gtask import *
import unittest
import time
import calendar

created_id = ""

class TestSyncFunctions(unittest.TestCase):
    
    def setUp(self):
        pass

    #test for creating a task
    #Input: a new local task json
    #Output: a new task from the cloud being passed back
    def test_create(self):
        global created_id
        
        timestamp = int(time.time())
        
        current_tasks = '[{"name":"Test One two three","done":false,"time":"'+str(timestamp)+'","duedate":"","note":"note one two three four FIVER","order":2,"synced":false,"listid":"@default","id":"test1"}]' 
        deletions = "[]"
        list = "[]"
        deletedlist = "[]"
        fileloc = '/Users/raywang/Library/Gtasktic'
        
        initial_login( current_tasks, deletions, list, deletedlist, fileloc)
        
        [tasks, tasklists] = get_all_tasks()
        
        found = False
        for task in tasks:
            if task['title'] == "Test One two three":
                found = True
                created_id = task['id']
        
        self.assertEqual(found, True)
    
        print "CURRENT ID", created_id
    
    #test for editing a existing task
    #Input: a new local tasks with a higher timestamp that has a changed value
    #Output: The cloud task with the same id should be changed
    def test_edit(self):
        global created_id
        
        timestamp = int(time.time())
        
        print "2 CURRENT ID", created_id
        
        current_tasks = '[{"name":"Test One two three edit","done":false,"time":"'+str(timestamp)+'","duedate":"","note":"note one two three four FIVER","order":2,"synced":false,"listid":"@default","id":"'+ str(created_id) +'"}]' 
        deletions = '[]'
        list = "[]"
        deletedlist = "[]"
        fileloc = '/Users/raywang/Library/Gtasktic'
    
        print "#CURRENT TASKS ", current_tasks
    
        initial_login( current_tasks, deletions, list, deletedlist, fileloc)
        
        [tasks, tasklists] = get_all_tasks()
        
        found = False
        for task in tasks:
            if task['title'] == "Test One two three edit":
                found = True
        
        self.assertEqual(found, True)        
    
    #test for deleting a task
    #Input: a task id to be deleted in the deleted variable
    #Output: The task should be deleted from the cloud
#    def test_delete(self):
#        current_tasks = '[]' 
#        deletions = '[{"deletion_id":"'+self.created_id+'"}]'
#        list = "[]"
#        deletedlist = "[]"
#        fileloc = '/Users/raywang/Library/Gtasktic'
#
#        initial_login( current_tasks, deletions, list, deletedlist, fileloc)

if __name__ == '__main__':
    unittest.main()




