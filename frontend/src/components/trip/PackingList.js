import React, { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  PlusIcon, 
  TrashIcon, 
  CheckIcon, 
  ClipboardDocumentListIcon, 
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

// Predefined categories for packing items
const categories = [
  { id: 'essentials', name: 'Essentials' },
  { id: 'clothing', name: 'Clothing' },
  { id: 'toiletries', name: 'Toiletries' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'documents', name: 'Documents' },
  { id: 'other', name: 'Other' }
];

// Sample packing list templates
const packingTemplates = {
  beach: [
    { item: 'Swimsuit', category: 'clothing', quantity: 2 },
    { item: 'Beach towel', category: 'essentials', quantity: 1 },
    { item: 'Sunscreen', category: 'toiletries', quantity: 1 },
    { item: 'Sunglasses', category: 'essentials', quantity: 1 },
    { item: 'Flip flops', category: 'clothing', quantity: 1 },
    { item: 'Hat', category: 'clothing', quantity: 1 }
  ],
  winter: [
    { item: 'Winter coat', category: 'clothing', quantity: 1 },
    { item: 'Gloves', category: 'clothing', quantity: 1 },
    { item: 'Scarf', category: 'clothing', quantity: 1 },
    { item: 'Winter boots', category: 'clothing', quantity: 1 },
    { item: 'Thermal underwear', category: 'clothing', quantity: 2 },
    { item: 'Warm socks', category: 'clothing', quantity: 5 }
  ],
  business: [
    { item: 'Business suits', category: 'clothing', quantity: 2 },
    { item: 'Dress shirts', category: 'clothing', quantity: 4 },
    { item: 'Dress shoes', category: 'clothing', quantity: 1 },
    { item: 'Business cards', category: 'documents', quantity: 1 },
    { item: 'Laptop', category: 'electronics', quantity: 1 },
    { item: 'Chargers', category: 'electronics', quantity: 1 }
  ],
  international: [
    { item: 'Passport', category: 'documents', quantity: 1 },
    { item: 'Travel insurance', category: 'documents', quantity: 1 },
    { item: 'Power adapter', category: 'electronics', quantity: 1 },
    { item: 'Foreign currency', category: 'essentials', quantity: 1 },
    { item: 'Medication', category: 'toiletries', quantity: 1 },
    { item: 'Travel pillow', category: 'essentials', quantity: 1 }
  ]
};

const PackingList = ({ trip, setTrip, isOrganizer }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [packingList, setPackingList] = useState([]);
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('beach');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterPacked, setFilterPacked] = useState('all'); // 'all', 'packed', 'unpacked'
  const [newItemData, setNewItemData] = useState({ item: '', category: 'essentials', quantity: 1 });

  // Initialize packing list from trip data
  useEffect(() => {
    if (trip?.tripDetails?.packingList) {
      setPackingList(trip.tripDetails.packingList);
    } else {
      setPackingList([]);
    }
  }, [trip?.tripDetails?.packingList]);

  // Progress calculation
  const totalItems = packingList.length;
  const packedItems = packingList.filter(item => item.packed).length;
  const progress = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;

  const handleOpenAddModal = () => {
    setNewItemData({ item: '', category: 'essentials', quantity: 1 });
    setAddItemModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setAddItemModalOpen(false);
  };

  const handleOpenTemplateModal = () => {
    setTemplateModalOpen(true);
  };

  const handleCloseTemplateModal = () => {
    setTemplateModalOpen(false);
  };

  const handleNewItemChange = (e) => {
    const { name, value } = e.target;
    setNewItemData({
      ...newItemData,
      [name]: name === 'quantity' ? parseInt(value, 10) || 1 : value
    });
  };

  const handleAddItem = async () => {
    if (!newItemData.item.trim()) return;
    
    setLoading(true);
    try {
      const newList = [...packingList, { ...newItemData, packed: false }];
      await savePackingList(newList);
      setPackingList(newList);
      handleCloseAddModal();
    } catch (err) {
      setError('Failed to add item');
      console.error('Error adding item:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItemPacked = async (index) => {
    const updatedList = [...packingList];
    updatedList[index].packed = !updatedList[index].packed;
    
    try {
      await savePackingList(updatedList);
      setPackingList(updatedList);
    } catch (err) {
      setError('Failed to update item');
      console.error('Error updating item:', err);
    }
  };

  const handleRemoveItem = async (index) => {
    const updatedList = [...packingList];
    updatedList.splice(index, 1);
    
    try {
      await savePackingList(updatedList);
      setPackingList(updatedList);
    } catch (err) {
      setError('Failed to remove item');
      console.error('Error removing item:', err);
    }
  };

  const handleApplyTemplate = async () => {
    try {
      setLoading(true);
      
      // Merge template with existing items (avoid duplicates)
      const templateItems = packingTemplates[selectedTemplate];
      const existingItems = new Set(packingList.map(item => item.item.toLowerCase()));
      
      const newItems = templateItems.filter(
        item => !existingItems.has(item.item.toLowerCase())
      );
      
      if (newItems.length === 0) {
        setError('No new items to add from this template');
        setLoading(false);
        return;
      }
      
      const updatedList = [
        ...packingList,
        ...newItems.map(item => ({ ...item, packed: false }))
      ];
      
      await savePackingList(updatedList);
      setPackingList(updatedList);
      handleCloseTemplateModal();
      
    } catch (err) {
      setError('Failed to apply template');
      console.error('Error applying template:', err);
    } finally {
      setLoading(false);
    }
  };

  const savePackingList = async (list) => {
    const response = await axios.put(`/api/trips/${trip._id}/packing-list`, {
      packingList: list
    });
    setTrip(response.data);
    return response.data;
  };

  const getFilteredList = () => {
    return packingList.filter(item => {
      // Filter by category
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      
      // Filter by packed status
      if (filterPacked === 'packed' && !item.packed) {
        return false;
      }
      if (filterPacked === 'unpacked' && item.packed) {
        return false;
      }
      
      return true;
    });
  };

  const groupedItems = getFilteredList().reduce((acc, item) => {
    const categoryName = categories.find(c => c.id === item.category)?.name || 'Other';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(item);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Packing List</h3>
        <div className="flex space-x-2">
          {isOrganizer && (
            <button
              type="button"
              onClick={handleOpenTemplateModal}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ArrowDownTrayIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Templates
            </button>
          )}
          {isOrganizer && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PlusIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Add Item
            </button>
          )}
        </div>
      </div>

      {packingList.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items in your packing list</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create a packing list to keep track of what you need to bring.
          </p>
          {isOrganizer && (
            <div className="mt-6 space-x-3">
              <button
                type="button"
                onClick={handleOpenTemplateModal}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" />
                Use Template
              </button>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Add Item
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-medium text-gray-900">Packing Progress</h4>
              <span className="text-sm font-medium text-gray-700">
                {packedItems} of {totalItems} items packed ({progress}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="h-2.5 rounded-full bg-primary-600"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          
          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
              <div>
                <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Category
                </label>
                <select
                  id="category-filter"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="packed-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Status
                </label>
                <select
                  id="packed-filter"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  value={filterPacked}
                  onChange={(e) => setFilterPacked(e.target.value)}
                >
                  <option value="all">All Items</option>
                  <option value="packed">Packed</option>
                  <option value="unpacked">Not Packed</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Packing List */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              {Object.keys(groupedItems).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No items match the selected filters</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedItems).map(([category, items]) => (
                    <div key={category}>
                      <h4 className="text-base font-medium text-gray-900 mb-3">{category}</h4>
                      <ul className="divide-y divide-gray-200">
                        {items.map((item, index) => {
                          // Find the original index in the full packingList array
                          const originalIndex = packingList.findIndex(
                            i => i.item === item.item && i.category === item.category
                          );
                          
                          return (
                            <li 
                              key={`${item.category}-${item.item}-${index}`}
                              className="py-3 flex items-center justify-between"
                            >
                              <div className="flex items-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleItemPacked(originalIndex)}
                                  className={`flex-shrink-0 h-5 w-5 rounded-full border ${
                                    item.packed 
                                      ? 'bg-primary-600 border-transparent' 
                                      : 'border-gray-300'
                                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
                                >
                                  {item.packed && (
                                    <CheckIcon className="h-5 w-5 text-white" />
                                  )}
                                </button>
                                <div className="ml-3">
                                  <p className={`text-sm font-medium ${
                                    item.packed ? 'text-gray-400 line-through' : 'text-gray-900'
                                  }`}>
                                    {item.item}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Quantity: {item.quantity}
                                  </p>
                                </div>
                              </div>
                              
                              {isOrganizer && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(originalIndex)}
                                  className="ml-2 text-red-600 hover:text-red-900"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      <Transition appear show={addItemModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={handleCloseAddModal}>
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                  >
                    Add Packing Item
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500"
                      onClick={handleCloseAddModal}
                    >
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </Dialog.Title>
                  
                  {error && (
                    <div className="mt-2 bg-red-50 p-3 rounded-md">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}
                  
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="item" className="block text-sm font-medium text-gray-700">
                        Item Name*
                      </label>
                      <input
                        type="text"
                        name="item"
                        id="item"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="e.g. Toothbrush"
                        value={newItemData.item}
                        onChange={handleNewItemChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                        Category
                      </label>
                      <select
                        id="category"
                        name="category"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        value={newItemData.category}
                        onChange={handleNewItemChange}
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                        Quantity
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        id="quantity"
                        min="1"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        value={newItemData.quantity}
                        onChange={handleNewItemChange}
                      />
                    </div>
                    
                    <div className="pt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={handleCloseAddModal}
                        className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        disabled={loading || !newItemData.item.trim()}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
                      >
                        {loading ? 'Adding...' : 'Add Item'}
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Templates Modal */}
      <Transition appear show={templateModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={handleCloseTemplateModal}>
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                  >
                    Choose a Packing Template
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500"
                      onClick={handleCloseTemplateModal}
                    >
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </Dialog.Title>
                  
                  {error && (
                    <div className="mt-2 bg-red-50 p-3 rounded-md">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}
                  
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="template" className="block text-sm font-medium text-gray-700">
                        Template Type
                      </label>
                      <select
                        id="template"
                        name="template"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                      >
                        <option value="beach">Beach Vacation</option>
                        <option value="winter">Winter Vacation</option>
                        <option value="business">Business Trip</option>
                        <option value="international">International Travel</option>
                      </select>
                    </div>
                    
                    <div className="mt-2 bg-gray-50 p-3 rounded-md">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
                      <ul className="space-y-1 max-h-48 overflow-y-auto">
                        {packingTemplates[selectedTemplate].map((item, index) => (
                          <li key={index} className="text-sm text-gray-600">
                            • {item.item} ({item.quantity})
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="pt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={handleCloseTemplateModal}
                        className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyTemplate}
                        disabled={loading}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
                      >
                        {loading ? 'Applying...' : 'Apply Template'}
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

export default PackingList; 