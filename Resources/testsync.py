from gtask import *
import unittest

class TestSyncFunctions(unittest.TestCase):

    def setUp(self):
        set_up_client()

    #test for creating a task
    #Input: a new local task json
    #Output: a new task from the cloud being passed back
    def test_create(self):
        pass
    
    #test for editing a existing task
    #Input: a new local tasks with a higher timestamp that has a changed value
    #Output: The cloud task with the same id should be changed
    
    
    #test for deleting a task
    #Input: a task id to be deleted in the deleted variable
    #Output: The task should be deleted from the cloud


if __name__ == '__main__':
    unittest.main()




