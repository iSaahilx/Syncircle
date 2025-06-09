import React, { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon, CurrencyDollarIcon, ChartPieIcon, ClipboardDocumentListIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

const defaultCategories = [
  { name: 'Accommodation', allocated: 0, spent: 0 },
  { name: 'Transportation', allocated: 0, spent: 0 },
  { name: 'Food & Drinks', allocated: 0, spent: 0 },
  { name: 'Activities', allocated: 0, spent: 0 },
  { name: 'Shopping', allocated: 0, spent: 0 },
  { name: 'Miscellaneous', allocated: 0, spent: 0 }
];

const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'];

const BudgetPlanner = ({ trip, setTrip, isOrganizer }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryAmount, setNewCategoryAmount] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalBudget, setTotalBudget] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [categories, setCategories] = useState([]);
  const [categoriesUpdated, setCategoriesUpdated] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  // Initialize budget data from trip
  useEffect(() => {
    if (trip?.tripDetails?.budget) {
      const { currency, total, categories: budgetCategories } = trip.tripDetails.budget;
      setSelectedCurrency(currency || 'USD');
      setTotalBudget(total?.toString() || '');
      setCategories(budgetCategories?.length ? [...budgetCategories] : [...defaultCategories]);
    } else {
      setSelectedCurrency('USD');
      setTotalBudget('');
      setCategories([...defaultCategories]);
    }
  }, [trip?.tripDetails?.budget]);

  // Calculate totals and percentages
  const totalAllocated = categories.reduce((sum, category) => sum + (parseFloat(category.allocated) || 0), 0);
  const totalSpent = categories.reduce((sum, category) => sum + (parseFloat(category.spent) || 0), 0);
  const totalBudgetValue = parseFloat(totalBudget) || 0;
  const unallocated = totalBudgetValue - totalAllocated;
  const remainingOverall = totalBudgetValue - totalSpent;

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCategoriesUpdated(false);
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    
    const updatedCategories = [
      ...categories, 
      { 
        name: newCategory, 
        allocated: parseFloat(newCategoryAmount) || 0, 
        spent: 0 
      }
    ];
    
    setCategories(updatedCategories);
    setNewCategory('');
    setNewCategoryAmount('');
    setShowAddCategory(false);
    setCategoriesUpdated(true);
  };

  const handleRemoveCategory = (index) => {
    const updatedCategories = [...categories];
    updatedCategories.splice(index, 1);
    setCategories(updatedCategories);
    setCategoriesUpdated(true);
  };

  const handleCategoryChange = (index, field, value) => {
    const updatedCategories = [...categories];
    updatedCategories[index][field] = field === 'name' ? value : parseFloat(value) || 0;
    setCategories(updatedCategories);
    setCategoriesUpdated(true);
  };

  const handleSaveBudget = async () => {
    setLoading(true);
    setError(null);

    try {
      const budgetData = {
        currency: selectedCurrency,
        total: parseFloat(totalBudget) || 0,
        categories: categories
      };

      const response = await axios.put(`/api/trips/${trip._id}/budget`, {
        budget: budgetData
      });

      setTrip(response.data);
      handleCloseModal();
    } catch (err) {
      console.error('Error saving budget:', err);
      setError(err.response?.data?.msg || 'Failed to save budget');
    } finally {
      setLoading(false);
    }
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortedCategories = () => {
    const sortableCategories = [...categories];
    if (sortConfig.key !== null) {
      sortableCategories.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableCategories;
  };

  const getSortIcon = (name) => {
    if (sortConfig.key !== name) {
      return null;
    }
    return sortConfig.direction === 'ascending' 
      ? <ArrowUpIcon className="h-4 w-4" /> 
      : <ArrowDownIcon className="h-4 w-4" />;
  };

  // Format currency values
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '-';
    return `${selectedCurrency} ${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate percentage of budget
  const calculatePercentage = (value, total) => {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Trip Budget</h3>
        {isOrganizer && (
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="-ml-0.5 mr-2 h-4 w-4" />
            Manage Budget
          </button>
        )}
      </div>

      {!trip.tripDetails?.budget?.total ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No budget set</h3>
          <p className="mt-1 text-sm text-gray-500">
            Set a budget to track your trip expenses.
          </p>
          {isOrganizer && (
            <div className="mt-6">
              <button
                type="button"
                onClick={handleOpenModal}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Set Budget
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Budget Overview */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-medium text-gray-900">Budget Overview</h4>
                {isOrganizer && (
                  <button
                    type="button"
                    onClick={handleOpenModal}
                    className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"
                  >
                    Edit
                  </button>
                )}
              </div>
              
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Budget</dt>
                  <dd className="mt-1 text-xl font-semibold text-gray-900">
                    {formatCurrency(totalBudgetValue)}
                  </dd>
                </div>
                <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Spent</dt>
                  <dd className="mt-1 text-xl font-semibold text-gray-900">
                    {formatCurrency(totalSpent)}
                  </dd>
                </div>
                <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">Remaining</dt>
                  <dd className={`mt-1 text-xl font-semibold ${
                    remainingOverall >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(remainingOverall)}
                  </dd>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Budget spent</p>
                  <p className="text-sm font-medium text-gray-700">
                    {calculatePercentage(totalSpent, totalBudgetValue)}%
                  </p>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${
                      totalSpent > totalBudgetValue ? 'bg-red-600' : 'bg-primary-600'
                    }`}
                    style={{ width: `${Math.min(calculatePercentage(totalSpent, totalBudgetValue), 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Categories Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Budget Categories</h4>
              
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('name')}
                      >
                        <div className="flex items-center">
                          Category {getSortIcon('name')}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('allocated')}
                      >
                        <div className="flex items-center">
                          Allocated {getSortIcon('allocated')}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('spent')}
                      >
                        <div className="flex items-center">
                          Spent {getSortIcon('spent')}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Remaining
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getSortedCategories().map((category, index) => {
                      const remaining = (parseFloat(category.allocated) || 0) - (parseFloat(category.spent) || 0);
                      const percentage = calculatePercentage(category.spent, category.allocated);
                      
                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{category.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatCurrency(category.allocated)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatCurrency(category.spent)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${
                              remaining >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(remaining)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div 
                                className={`h-2.5 rounded-full ${
                                  category.spent > category.allocated ? 'bg-red-600' : 'bg-primary-600'
                                }`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Budget Distribution Chart */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Budget Distribution</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Allocation</h5>
                  <div className="space-y-4">
                    {categories.map((category, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{category.name}</span>
                          <span className="text-xs font-medium">
                            {formatCurrency(category.allocated)} 
                            ({calculatePercentage(category.allocated, totalBudgetValue)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className="h-1.5 rounded-full bg-primary-600"
                            style={{ width: `${calculatePercentage(category.allocated, totalBudgetValue)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                    {unallocated > 0 && (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">Unallocated</span>
                          <span className="text-xs font-medium">
                            {formatCurrency(unallocated)} 
                            ({calculatePercentage(unallocated, totalBudgetValue)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className="h-1.5 rounded-full bg-gray-400"
                            style={{ width: `${calculatePercentage(unallocated, totalBudgetValue)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Spending</h5>
                  <div className="space-y-4">
                    {categories
                      .filter(category => category.spent > 0)
                      .map((category, index) => (
                        <div key={index}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">{category.name}</span>
                            <span className="text-xs font-medium">
                              {formatCurrency(category.spent)} 
                              ({calculatePercentage(category.spent, totalSpent)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div 
                              className="h-1.5 rounded-full bg-primary-600"
                              style={{ width: `${calculatePercentage(category.spent, totalSpent)}%` }}
                            ></div>
                          </div>
                        </div>
                    ))}
                    
                    {!categories.some(category => category.spent > 0) && (
                      <p className="text-sm text-gray-500">No expenses recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Management Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={handleCloseModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                  >
                    Manage Trip Budget
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500"
                      onClick={handleCloseModal}
                    >
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </Dialog.Title>
                  
                  {error && (
                    <div className="mt-4 bg-red-50 p-3 rounded-md">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}
                  
                  <div className="mt-4 space-y-6">
                    {/* Total Budget Section */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <CurrencyDollarIcon className="h-5 w-5 mr-2 text-primary-500" />
                        Total Budget
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label htmlFor="totalBudget" className="block text-sm font-medium text-gray-700">
                            Amount
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500">{selectedCurrency}</span>
                            </div>
                            <input
                              type="number"
                              name="totalBudget"
                              id="totalBudget"
                              className="block w-full pl-16 pr-12 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              value={totalBudget}
                              onChange={(e) => setTotalBudget(e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                            Currency
                          </label>
                          <select
                            id="currency"
                            name="currency"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            value={selectedCurrency}
                            onChange={(e) => setSelectedCurrency(e.target.value)}
                          >
                            {currencies.map(currency => (
                              <option key={currency} value={currency}>
                                {currency}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    {/* Budget Categories Section */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <ChartPieIcon className="h-5 w-5 mr-2 text-primary-500" />
                        Budget Categories
                      </h4>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="mb-3 overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                              <tr>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Category
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Allocated
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Spent
                                </th>
                                <th scope="col" className="w-12 px-4 py-2"></th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {categories.map((category, index) => (
                                <tr key={index}>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    {editingCategory === index ? (
                                      <input
                                        type="text"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                        value={category.name}
                                        onChange={(e) => handleCategoryChange(index, 'name', e.target.value)}
                                        onBlur={() => setEditingCategory(null)}
                                        autoFocus
                                      />
                                    ) : (
                                      <div 
                                        className="text-sm text-gray-900 cursor-pointer hover:text-primary-600"
                                        onClick={() => setEditingCategory(index)}
                                      >
                                        {category.name}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <span className="text-gray-500 mr-2">{selectedCurrency}</span>
                                      <input
                                        type="number"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                        value={category.allocated}
                                        onChange={(e) => handleCategoryChange(index, 'allocated', e.target.value)}
                                        min="0"
                                        step="0.01"
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <span className="text-gray-500 mr-2">{selectedCurrency}</span>
                                      <input
                                        type="number"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                        value={category.spent}
                                        onChange={(e) => handleCategoryChange(index, 'spent', e.target.value)}
                                        min="0"
                                        step="0.01"
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCategory(index)}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      <TrashIcon className="h-5 w-5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              
                              {showAddCategory ? (
                                <tr>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <input
                                      type="text"
                                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                      value={newCategory}
                                      onChange={(e) => setNewCategory(e.target.value)}
                                      placeholder="Category name"
                                      autoFocus
                                    />
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <span className="text-gray-500 mr-2">{selectedCurrency}</span>
                                      <input
                                        type="number"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                        value={newCategoryAmount}
                                        onChange={(e) => setNewCategoryAmount(e.target.value)}
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                      />
                                    </div>
                                  </td>
                                  <td colSpan={2} className="px-4 py-2 whitespace-nowrap text-right">
                                    <div className="flex space-x-2 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => setShowAddCategory(false)}
                                        className="text-gray-600 hover:text-gray-900"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleAddCategory}
                                        className="text-primary-600 hover:text-primary-900"
                                        disabled={!newCategory.trim()}
                                      >
                                        Add
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                <tr>
                                  <td colSpan={4} className="px-4 py-2">
                                    <button
                                      type="button"
                                      onClick={() => setShowAddCategory(true)}
                                      className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"
                                    >
                                      <PlusIcon className="h-4 w-4 mr-1" />
                                      Add Category
                                    </button>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Total Allocated:</span>
                            <span className="font-medium">{formatCurrency(totalAllocated)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="font-medium">Unallocated:</span>
                            <span className={`font-medium ${unallocated >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                              {formatCurrency(unallocated)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Summary Section */}
                    <div className="bg-primary-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <ClipboardDocumentListIcon className="h-5 w-5 mr-2 text-primary-500" />
                        Budget Summary
                      </h4>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Total Budget:</span>
                          <span className="text-sm font-medium">{formatCurrency(totalBudgetValue)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Total Allocated:</span>
                          <span className="text-sm font-medium">{formatCurrency(totalAllocated)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Total Spent:</span>
                          <span className="text-sm font-medium">{formatCurrency(totalSpent)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-primary-100">
                          <span className="text-sm font-medium">Remaining Budget:</span>
                          <span className={`text-sm font-medium ${
                            remainingOverall >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(remainingOverall)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Save Button */}
                    <div className="pt-5 border-t border-gray-200 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        Cancel {categoriesUpdated && '(Discard Changes)'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveBudget}
                        disabled={loading}
                        className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
                      >
                        {loading ? 'Saving...' : 'Save Budget'}
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default BudgetPlanner; 