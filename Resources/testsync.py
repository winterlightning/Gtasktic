from gtask import *
import unittest

class TestSyncFunctions(unittest.TestCase):
    created_id = ""

    def setUp(self):
        pass

    #test for creating a task
    #Input: a new local task json
    #Output: a new task from the cloud being passed back
    def test_create(self):
        current_tasks = '[{"name":"Test One two three","done":false,"time":"1322077207554","duedate":"","note":"note one two three four FIVER","order":2,"synced":false,"listid":"@default","id":"test1"}]' 
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
    
    #test for editing a existing task
    #Input: a new local tasks with a higher timestamp that has a changed value
    #Output: The cloud task with the same id should be changed
    def test_edit(self):
        current_tasks = '[]' 
        deletions = '[{"deletion_id":"'+self.created_id+'"}]'
        list = "[]"
        deletedlist = "[]"
        fileloc = '/Users/raywang/Library/Gtasktic'
    
    #test for deleting a task
    #Input: a task id to be deleted in the deleted variable
    #Output: The task should be deleted from the cloud
    def test_delete(self):
        current_tasks = '[]' 
        deletions = '[{"deletion_id":"'+self.created_id+'"}]'
        list = "[]"
        deletedlist = "[]"
        fileloc = '/Users/raywang/Library/Gtasktic'

        initial_login( current_tasks, deletions, list, deletedlist, fileloc)

if __name__ == '__main__':
    unittest.main()




