import React, { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

// Budget categories
const EXPENSE_CATEGORIES = [
  { id: 'accommodation', name: 'Accommodation' },
  { id: 'transportation', name: 'Transportation' },
  { id: 'food', name: 'Food & Drinks' },
  { id: 'activities', name: 'Activities & Entertainment' },
  { id: 'shopping', name: 'Shopping' },
  { id: 'misc', name: 'Miscellaneous' }
];

const TripBudget = ({ trip, setTrip, isOrganizer, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [budgetData, setBudgetData] = useState({});
  const [expenseData, setExpenseData] = useState({
    amount: '',
    description: '',
    category: EXPENSE_CATEGORIES[0].id,
    paidBy: currentUser?._id,
    date: new Date().toISOString().split('T')[0]
  });
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const budget = trip.budget || {};
  const expenses = trip.expenses || [];
  const participants = trip.participants || [];

  // Initialize budget data from trip or with empty values
  useEffect(() => {
    const initialData = {};
    EXPENSE_CATEGORIES.forEach(category => {
      initialData[category.id] = budget[category.id] || '';
    });
    setBudgetData(initialData);
  }, [trip]);

  // Function to handle budget form changes
  const handleBudgetChange = (e) => {
    const { name, value } = e.target;
    setBudgetData({
      ...budgetData,
      [name]: value
    });
  };

  // Function to handle expense form changes
  const handleExpenseChange = (e) => {
    const { name, value } = e.target;
    setExpenseData({
      ...expenseData,
      [name]: value
    });
  };

  // Function to save budget
  const handleSaveBudget = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.put(`/api/trips/${trip._id}/budget`, budgetData);
      setTrip(response.data);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving budget:', err);
      setError(err.response?.data?.msg || 'Failed to save budget');
    } finally {
      setLoading(false);
    }
  };

  // Function to add a new expense
  const handleAddExpense = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Convert amount to number
      const formData = {
        ...expenseData,
        amount: parseFloat(expenseData.amount)
      };

      let response;
      if (selectedExpense) {
        // Update existing expense
        response = await axios.put(`/api/trips/${trip._id}/expenses/${selectedExpense._id}`, formData);
      } else {
        // Add new expense
        response = await axios.post(`/api/trips/${trip._id}/expenses`, formData);
      }
      
      setTrip(response.data);
      setIsExpenseModalOpen(false);
      setSelectedExpense(null);
      setExpenseData({
        amount: '',
        description: '',
        category: EXPENSE_CATEGORIES[0].id,
        paidBy: currentUser?._id,
        date: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.error('Error adding expense:', err);
      setError(err.response?.data?.msg || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle editing an expense
  const handleEditExpense = (expense) => {
    setSelectedExpense(expense);
    setExpenseData({
      amount: expense.amount.toString(),
      description: expense.description,
      category: expense.category,
      paidBy: expense.paidBy?._id || expense.paidBy,
      date: new Date(expense.date).toISOString().split('T')[0]
    });
    setIsExpenseModalOpen(true);
  };

  // Function to handle deleting an expense
  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;
    
    setLoading(true);
    try {
      const response = await axios.delete(`/api/trips/${trip._id}/expenses/${selectedExpense._id}`);
      setTrip(response.data);
      setShowDeleteConfirmation(false);
      setSelectedExpense(null);
    } catch (err) {
      console.error('Error deleting expense:', err);
      setError(err.response?.data?.msg || 'Failed to delete expense');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total budget, expenses and remaining
  const totalBudget = Object.values(budget).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remainingBudget = totalBudget - totalExpenses;

  // Calculate expenses by category
  const expensesByCategory = EXPENSE_CATEGORIES.reduce((acc, category) => {
    acc[category.id] = expenses
      .filter(expense => expense.category === category.id)
      .reduce((sum, expense) => sum + expense.amount, 0);
    return acc;
  }, {});

  // Find a participant by ID
  const findParticipantName = (id) => {
    const participant = participants.find(p => (p.user?._id === id) || (p._id === id));
    return participant?.user?.name || participant?.name || 'Unknown';
  };

  // Function to check if participant is current user
  const isCurrentUser = (participant) => {
    return (participant.user?._id === currentUser?._id) || (participant._id === currentUser?._id);
  };

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Trip Budget</h2>
        <div className="flex space-x-2">
          {isOrganizer && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <CurrencyDollarIcon className="h-5 w-5 mr-2" />
              Set Budget
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSelectedExpense(null);
              setExpenseData({
                amount: '',
                description: '',
                category: EXPENSE_CATEGORIES[0].id,
                paidBy: currentUser?._id,
                date: new Date().toISOString().split('T')[0]
              });
              setIsExpenseModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Expense
          </button>
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      {/* Budget Summary */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Budget Summary</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Budget</p>
              <p className="text-2xl font-semibold text-gray-900">${totalBudget.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="text-2xl font-semibold text-red-600">${totalExpenses.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Remaining</p>
              <p className={`text-2xl font-semibold ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${remainingBudget.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Budget by Category */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Budget by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EXPENSE_CATEGORIES.map(category => {
            const categoryBudget = parseFloat(budget[category.id]) || 0;
            const categoryExpenses = expensesByCategory[category.id] || 0;
            const remaining = categoryBudget - categoryExpenses;
            const percentSpent = categoryBudget ? (categoryExpenses / categoryBudget) * 100 : 0;
            
            return (
              <div key={category.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{category.name}</h4>
                  <span className={`text-sm font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${remaining.toFixed(2)} remaining
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                  <span>${categoryExpenses.toFixed(2)} spent</span>
                  <span>${categoryBudget.toFixed(2)} budgeted</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${percentSpent > 100 ? 'bg-red-600' : 'bg-blue-600'}`} 
                    style={{ width: `${Math.min(percentSpent, 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expenses List */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Expenses</h3>
        {expenses.length > 0 ? (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Description</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Category</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Amount</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Paid By</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {expenses.map(expense => {
                  const categoryName = EXPENSE_CATEGORIES.find(c => c.id === expense.category)?.name || 'Other';
                  return (
                    <tr key={expense._id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {expense.description}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{categoryName}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">${expense.amount.toFixed(2)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {findParticipantName(expense.paidBy?._id || expense.paidBy)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button
                          type="button"
                          onClick={() => handleEditExpense(expense)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          Edit
                        </button>
                        {(isOrganizer || expense.paidBy?._id === currentUser?._id || expense.paidBy === currentUser?._id) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedExpense(expense);
                              setShowDeleteConfirmation(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">No expenses added yet.</p>
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(true)}
              className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Expense
            </button>
          </div>
        )}
      </div>

      {/* Budget Modal */}
      <Transition.Root show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="fixed z-10 inset-0 overflow-y-auto" onClose={setIsModalOpen}>
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            </Transition.Child>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    type="button"
                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    onClick={() => setIsModalOpen(false)}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100">
                    <CurrencyDollarIcon className="h-6 w-6 text-primary-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                      Set Trip Budget
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Define your budget for each category. This will help you track expenses during your trip.
                      </p>
                    </div>
                  </div>
                </div>
                <form onSubmit={handleSaveBudget} className="mt-5 sm:mt-6">
                  <div className="space-y-4">
                    {EXPENSE_CATEGORIES.map(category => (
                      <div key={category.id}>
                        <label htmlFor={category.id} className="block text-sm font-medium text-gray-700">
                          {category.name}
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">$</span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            name={category.id}
                            id={category.id}
                            className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                            placeholder="0.00"
                            value={budgetData[category.id]}
                            onChange={handleBudgetChange}
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">USD</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
                  
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:col-start-2 sm:text-sm"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Budget'}
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Expense Modal */}
      <Transition.Root show={isExpenseModalOpen} as={Fragment}>
        <Dialog as="div" className="fixed z-10 inset-0 overflow-y-auto" onClose={setIsExpenseModalOpen}>
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            </Transition.Child>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    type="button"
                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    onClick={() => setIsExpenseModalOpen(false)}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <PlusIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                      {selectedExpense ? 'Edit Expense' : 'Add Expense'}
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {selectedExpense 
                          ? 'Update the details of this expense.' 
                          : 'Record a new expense for this trip.'}
                      </p>
                    </div>
                  </div>
                </div>
                <form onSubmit={handleAddExpense} className="mt-5 sm:mt-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description*
                      </label>
                      <input
                        type="text"
                        name="description"
                        id="description"
                        required
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        placeholder="Hotel reservation, lunch, taxi, etc."
                        value={expenseData.description}
                        onChange={handleExpenseChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                        Amount*
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          name="amount"
                          id="amount"
                          required
                          className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                          placeholder="0.00"
                          value={expenseData.amount}
                          onChange={handleExpenseChange}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">USD</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                        Category*
                      </label>
                      <select
                        id="category"
                        name="category"
                        required
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        value={expenseData.category}
                        onChange={handleExpenseChange}
                      >
                        {EXPENSE_CATEGORIES.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="paidBy" className="block text-sm font-medium text-gray-700">
                        Paid By*
                      </label>
                      <select
                        id="paidBy"
                        name="paidBy"
                        required
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        value={expenseData.paidBy}
                        onChange={handleExpenseChange}
                      >
                        {participants.map(participant => (
                          <option 
                            key={participant.user?._id || participant._id} 
                            value={participant.user?._id || participant._id}
                          >
                            {participant.user?.name || participant.name}
                            {isCurrentUser(participant) ? ' (You)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                        Date*
                      </label>
                      <input
                        type="date"
                        name="date"
                        id="date"
                        required
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        value={expenseData.date}
                        onChange={handleExpenseChange}
                      />
                    </div>
                  </div>
                  
                  {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
                  
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:col-start-2 sm:text-sm"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : (selectedExpense ? 'Update Expense' : 'Add Expense')}
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                      onClick={() => setIsExpenseModalOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Delete Confirmation Modal */}
      <Transition.Root show={showDeleteConfirmation} as={Fragment}>
        <Dialog as="div" className="fixed z-10 inset-0 overflow-y-auto" onClose={setShowDeleteConfirmation}>
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            </Transition.Child>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                      Delete Expense
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this expense?
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={handleDeleteExpense}
                    disabled={loading}
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={() => {
                      setShowDeleteConfirmation(false);
                      setSelectedExpense(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
};

export default TripBudget; 