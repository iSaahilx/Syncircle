import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Todo = ({ eventId }) => {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch todos when component mounts or eventId changes
  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    
    const fetchTodos = async () => {
      try {
        setLoading(true);
        
        // Set a timeout to prevent hanging requests
        const timeoutId = setTimeout(() => {
          setLoading(false);
          setError('Request timed out. The server took too long to respond.');
        }, 10000); // 10 seconds timeout
        
        console.log(`Fetching todos for event: ${eventId}`);
        
        // Make request to the regular endpoint
        const response = await axios.get(`/api/todos/${eventId}/todos`);
        clearTimeout(timeoutId);
        
        console.log('Todos data received:', response.data);
        setTodos(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (err) {
        console.error('Error fetching todos:', err);
        const errorDetails = err.response?.data?.msg || err.response?.data?.error || err.message || 'Unknown error';
        console.error('Error details:', errorDetails);
        console.error('Error status:', err.response?.status);
        console.error('Full error response:', err.response?.data);
        
        setError(
          err.response 
            ? `Error: ${err.response.status} - ${errorDetails}`
            : 'Failed to fetch todos. Please try again later.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTodos();
    
    return () => {
      // Cleanup function
      setTodos([]);
      setLoading(false);
      setError(null);
    };
  }, [eventId]);

  // Add new todo
  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    
    try {
      const response = await axios.post(`/api/todos/${eventId}/todos`, { 
        text: newTodo,
        completed: false
      });
      
      setTodos([...todos, response.data]);
      setNewTodo('');
      setError(null);
    } catch (err) {
      console.error('Error adding todo:', err);
      setError('Failed to add todo. Please try again.');
    }
  };

  // Toggle todo completion status
  const handleToggleTodo = async (todoId, completed) => {
    try {
      await axios.put(`/api/todos/${eventId}/todos/${todoId}`, {
        completed: !completed
      });
      
      setTodos(todos.map(todo => 
        todo._id === todoId ? { ...todo, completed: !completed } : todo
      ));
      setError(null);
    } catch (err) {
      console.error('Error updating todo:', err);
      setError('Failed to update todo. Please try again.');
    }
  };

  // Delete todo
  const handleDeleteTodo = async (todoId) => {
    try {
      await axios.delete(`/api/todos/${eventId}/todos/${todoId}`);
      setTodos(todos.filter(todo => todo._id !== todoId));
      setError(null);
    } catch (err) {
      console.error('Error deleting todo:', err);
      setError('Failed to delete todo. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-4 bg-white shadow">
        <h3 className="text-xl font-semibold mb-4">Todo List</h3>
        <div className="text-center p-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-3"></div>
          <span>Loading todos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow">
      <h3 className="text-xl font-semibold mb-4">Todo List</h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleAddTodo} className="flex mb-4">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new todo..."
          className="flex-1 border rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button 
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Add
        </button>
      </form>

      {todos.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No todos yet. Add one to get started!</p>
      ) : (
        <ul className="space-y-2">
          {todos.map((todo) => (
            <li 
              key={todo._id} 
              className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => handleToggleTodo(todo._id, todo.completed)}
                  className="mr-3 h-5 w-5 text-blue-500 focus:ring-blue-400"
                />
                <span className={todo.completed ? 'line-through text-gray-500' : ''}>
                  {todo.text}
                </span>
              </div>
              <button
                onClick={() => handleDeleteTodo(todo._id)}
                className="text-red-500 hover:text-red-700 focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Todo; 