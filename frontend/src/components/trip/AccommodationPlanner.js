import React, { useState, Fragment } from 'react';
import axios from 'axios';
import { Dialog, Transition, RadioGroup } from '@headlessui/react';
import { XMarkIcon, PlusIcon, BuildingOfficeIcon, MapPinIcon, CalendarIcon, CurrencyDollarIcon, LinkIcon, PhoneIcon, StarIcon, CheckCircleIcon, ArrowPathIcon, UsersIcon } from '@heroicons/react/24/outline';

const accommodationTypes = [
  { id: 'hotel', name: 'Hotel', icon: BuildingOfficeIcon },
  { id: 'hostel', name: 'Hostel', icon: BuildingOfficeIcon },
  { id: 'apartment', name: 'Apartment', icon: BuildingOfficeIcon },
  { id: 'house', name: 'House', icon: BuildingOfficeIcon },
  { id: 'campsite', name: 'Campsite', icon: BuildingOfficeIcon },
  { id: 'other', name: 'Other', icon: BuildingOfficeIcon },
];

// Templates for quick filling of common accommodation types
const accommodationTemplates = {
  hotel: {
    name: 'Hotel Name',
    address: 'Hotel Address, City, Country',
    price: '150',
    currency: 'USD',
    numPeople: 2,
    notes: 'Hotel amenities include WiFi, breakfast, and pool access.'
  },
  hostel: {
    name: 'Hostel Name',
    address: 'Hostel Address, City, Country',
    price: '30',
    currency: 'USD',
    numPeople: 1,
    notes: 'Shared dormitory, community kitchen available.'
  },
  apartment: {
    name: 'Vacation Apartment',
    address: 'Apartment Address, City, Country',
    price: '100',
    currency: 'USD',
    numPeople: 2,
    notes: 'Fully furnished with kitchen and laundry facilities.'
  },
  house: {
    name: 'Vacation Home',
    address: 'House Address, City, Country',
    price: '200',
    currency: 'USD',
    numPeople: 4,
    notes: 'Entire home with multiple bedrooms and amenities.'
  },
  campsite: {
    name: 'Campground Name',
    address: 'Campsite Location, Park, Country',
    price: '25',
    currency: 'USD',
    numPeople: 2,
    notes: 'Tent site with access to communal bathrooms and grills.'
  }
};

const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'];

const AccommodationPlanner = ({ trip, setTrip, isOrganizer }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAccommodation, setCurrentAccommodation] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);
  const [votedAccommodations, setVotedAccommodations] = useState({});
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [accommodationToDelete, setAccommodationToDelete] = useState(null);
  const [basePrice, setBasePrice] = useState('');
  const [showTemplateApplied, setShowTemplateApplied] = useState(false);

  const initialFormData = {
    name: '',
    type: 'hotel',
    address: '',
    checkIn: '',
    checkOut: '',
    confirmationNumber: '',
    contact: '',
    price: '',
    basePrice: '',
    currency: 'USD',
    numPeople: 2,
    notes: '',
    bookingLink: ''
  };

  const [formData, setFormData] = useState(initialFormData);

  const handleOpenModal = (accommodation = null) => {
    if (accommodation) {
      const basePrice = accommodation.basePrice || accommodation.price || '';
      const numPeople = accommodation.numPeople || 2;
      
      setFormData({
        name: accommodation.name || '',
        type: accommodation.type || 'hotel',
        address: accommodation.address || '',
        checkIn: accommodation.checkIn ? new Date(accommodation.checkIn).toISOString().substr(0, 10) : '',
        checkOut: accommodation.checkOut ? new Date(accommodation.checkOut).toISOString().substr(0, 10) : '',
        confirmationNumber: accommodation.confirmationNumber || '',
        contact: accommodation.contact || '',
        price: accommodation.price || '',
        basePrice: basePrice,
        currency: accommodation.currency || 'USD',
        numPeople: numPeople,
        notes: accommodation.notes || '',
        bookingLink: accommodation.bookingLink || ''
      });
      setBasePrice(basePrice);
      setCurrentAccommodation(accommodation);
      setIsEditing(true);
    } else {
      setFormData(initialFormData);
      setBasePrice('');
      setCurrentAccommodation(null);
      setIsEditing(false);
    }
    setIsModalOpen(true);
    setShowTemplateApplied(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle price and numPeople specially to calculate total price
    if (name === 'basePrice') {
      const newBasePrice = value === '' ? 0 : parseFloat(value);
      const numPeople = formData.numPeople || 2;
      setBasePrice(value);
      setFormData({
        ...formData,
        basePrice: value,
        price: (newBasePrice * numPeople).toString()
      });
    } else if (name === 'numPeople') {
      const basePrice = formData.basePrice === '' ? 0 : parseFloat(formData.basePrice);
      const newNumPeople = value === '' ? 2 : parseInt(value);
      setFormData({
        ...formData,
        numPeople: newNumPeople,
        price: (basePrice * newNumPeople).toString()
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleTypeChange = (type) => {
    setFormData({
      ...formData,
      type
    });
  };
  
  const applyTemplate = () => {
    const template = accommodationTemplates[formData.type] || {};
    const newFormData = {
      ...formData,
      ...template,
      // Keep existing values if set
      checkIn: formData.checkIn || '',
      checkOut: formData.checkOut || '',
    };
    
    // Calculate price based on numPeople
    const basePrice = template.price || '';
    setBasePrice(basePrice);
    newFormData.basePrice = basePrice;
    newFormData.price = (parseFloat(basePrice || 0) * newFormData.numPeople).toString();
    
    setFormData(newFormData);
    setShowTemplateApplied(true);
    
    // Hide template applied message after 3 seconds
    setTimeout(() => {
      setShowTemplateApplied(false);
    }, 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Format dates for backend
      const checkIn = formData.checkIn ? new Date(formData.checkIn) : null;
      const checkOut = formData.checkOut ? new Date(formData.checkOut) : null;
      
      // Prepare accommodation data
      const accommodationData = {
        ...formData,
        checkIn,
        checkOut,
        price: formData.price ? parseFloat(formData.price) : null,
        basePrice: formData.basePrice ? parseFloat(formData.basePrice) : null,
        numPeople: parseInt(formData.numPeople) || 2
      };

      // Get current accommodations
      const currentAccommodations = [...(trip.tripDetails?.accommodations || [])];
      
      if (isEditing && currentAccommodation) {
        // Update existing accommodation
        const index = currentAccommodations.findIndex(
          acc => acc._id === currentAccommodation._id
        );
        
        if (index !== -1) {
          currentAccommodations[index] = {
            ...currentAccommodations[index],
            ...accommodationData
          };
        }
      } else {
        // Add new accommodation
        currentAccommodations.push(accommodationData);
      }

      // Update trip on backend
      const response = await axios.put(`/api/trips/${trip._id}/accommodations`, {
        accommodations: currentAccommodations
      });

      // Update local trip state with response data
      setTrip(response.data);
      handleCloseModal();
    } catch (err) {
      console.error('Error saving accommodation:', err);
      setError(err.response?.data?.msg || 'Failed to save accommodation');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (accommodationId) => {
    setAccommodationToDelete(accommodationId);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!accommodationToDelete) return;
    
    setLoading(true);
    try {
      const updatedAccommodations = (trip.tripDetails?.accommodations || [])
        .filter(acc => acc._id !== accommodationToDelete);
      
      const response = await axios.put(`/api/trips/${trip._id}/accommodations`, {
        accommodations: updatedAccommodations
      });

      setTrip(response.data);
      setShowDeleteConfirmation(false);
      setAccommodationToDelete(null);
    } catch (err) {
      console.error('Error deleting accommodation:', err);
      alert('Failed to delete accommodation');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (accommodationId) => {
    try {
      // This is a simplified voting mechanism - in a real implementation
      // you would save votes to the backend
      setVotedAccommodations({
        ...votedAccommodations,
        [accommodationId]: !votedAccommodations[accommodationId]
      });
    } catch (err) {
      console.error('Error voting for accommodation:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const accommodations = trip.tripDetails?.accommodations || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Accommodations</h3>
        {isOrganizer && (
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="-ml-0.5 mr-2 h-4 w-4" />
            Add Accommodation
          </button>
        )}
      </div>

      {accommodations.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No accommodations added</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add your first accommodation option for this trip.
          </p>
          {isOrganizer && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => handleOpenModal()}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Add Accommodation
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {accommodations.map((accommodation) => (
            <div
              key={accommodation._id || accommodation.name}
              className={`relative bg-white rounded-lg shadow overflow-hidden cursor-pointer transition-shadow hover:shadow-md border-2 ${
                selectedAccommodation === accommodation._id ? 'border-primary-500' : 'border-transparent'
              }`}
              onClick={() => setSelectedAccommodation(
                selectedAccommodation === accommodation._id ? null : accommodation._id
              )}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {(() => {
                      const IconComponent = accommodationTypes.find(t => t.id === accommodation.type)?.icon;
                      return IconComponent && <IconComponent className="h-6 w-6 text-primary-500 mr-2" />;
                    })()}
                    <h4 className="text-lg font-medium text-gray-900">
                      {accommodation.name}
                    </h4>
                  </div>
                  {votedAccommodations[accommodation._id] && (
                    <CheckCircleIcon className="h-6 w-6 text-green-500" />
                  )}
                </div>

                <div className="space-y-3 mb-4">
                  {accommodation.address && (
                    <div className="flex items-start text-sm">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
                      <span className="text-gray-600">{accommodation.address}</span>
                    </div>
                  )}
                  
                  {(accommodation.checkIn || accommodation.checkOut) && (
                    <div className="flex items-start text-sm">
                      <CalendarIcon className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
                      <div>
                        <div className="text-gray-600">
                          <span className="font-medium">Check-in:</span> {formatDate(accommodation.checkIn)}
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium">Check-out:</span> {formatDate(accommodation.checkOut)}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {accommodation.price && (
                    <div className="flex items-center text-sm">
                      <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-600">
                        {accommodation.currency} {accommodation.price.toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  {accommodation.contact && (
                    <div className="flex items-center text-sm">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-600">{accommodation.contact}</span>
                    </div>
                  )}
                  
                  {accommodation.bookingLink && (
                    <div className="flex items-center text-sm">
                      <LinkIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <a
                        href={accommodation.bookingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Booking
                      </a>
                    </div>
                  )}
                </div>
                
                {accommodation.notes && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</h5>
                    <p className="text-sm text-gray-600">{accommodation.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 flex justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVote(accommodation._id);
                  }}
                  className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-md ${
                    votedAccommodations[accommodation._id]
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {votedAccommodations[accommodation._id] ? 'Voted' : 'Vote'}
                </button>
                
                {isOrganizer && (
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(accommodation);
                      }}
                      className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(accommodation._id);
                      }}
                      className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Accommodation Modal */}
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
                    {isEditing ? 'Edit Accommodation' : 'Add Accommodation'}
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
                  
                  {showTemplateApplied && (
                    <div className="mt-4 bg-green-50 p-3 rounded-md">
                      <p className="text-sm text-green-700">Template applied! You can edit the details as needed.</p>
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmit} className="mt-4 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Accommodation Type
                        </label>
                        <div className="flex justify-between items-center">
                          <RadioGroup value={formData.type} onChange={handleTypeChange} className="mt-2 flex-1">
                            <RadioGroup.Label className="sr-only">Accommodation Type</RadioGroup.Label>
                            <div className="grid grid-cols-3 gap-3">
                              {accommodationTypes.map((type) => (
                                <RadioGroup.Option
                                  key={type.id}
                                  value={type.id}
                                  className={({ active, checked }) =>
                                    `${
                                      active
                                        ? 'ring-2 ring-offset-2 ring-primary-500'
                                        : ''
                                    }
                                    ${
                                      checked 
                                        ? 'bg-primary-600 border-transparent text-white hover:bg-primary-700'
                                        : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
                                    }
                                    border rounded-md py-3 px-3 flex items-center justify-center text-sm font-medium uppercase cursor-pointer`
                                  }
                                >
                                  <RadioGroup.Label as="span">
                                    {type.name}
                                  </RadioGroup.Label>
                                </RadioGroup.Option>
                              ))}
                            </div>
                          </RadioGroup>
                          <button
                            type="button"
                            onClick={applyTemplate}
                            className="ml-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            <ArrowPathIcon className="-ml-0.5 mr-2 h-4 w-4" />
                            Fill Template
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Accommodation Name*
                        </label>
                        <input
                          type="text"
                          name="name"
                          id="name"
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          placeholder="e.g. Hilton Hotel Paris"
                          value={formData.name}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                          Address
                        </label>
                        <input
                          type="text"
                          name="address"
                          id="address"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          placeholder="Street, City, Country"
                          value={formData.address}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="checkIn" className="block text-sm font-medium text-gray-700">
                            Check-in Date
                          </label>
                          <input
                            type="date"
                            name="checkIn"
                            id="checkIn"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            value={formData.checkIn}
                            onChange={handleChange}
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="checkOut" className="block text-sm font-medium text-gray-700">
                            Check-out Date
                          </label>
                          <input
                            type="date"
                            name="checkOut"
                            id="checkOut"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            value={formData.checkOut}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                      
                      {/* Price Information */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label htmlFor="basePrice" className="block text-sm font-medium text-gray-700">
                            Base Price (per night)
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500">
                                {formData.currency}
                              </span>
                            </div>
                            <input
                              type="number"
                              name="basePrice"
                              id="basePrice"
                              className="block w-full pl-16 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              value={formData.basePrice}
                              onChange={handleChange}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="numPeople" className="block text-sm font-medium text-gray-700">
                            Number of People
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <UsersIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="number"
                              name="numPeople"
                              id="numPeople"
                              className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                              placeholder="2"
                              min="1"
                              value={formData.numPeople}
                              onChange={handleChange}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                            Total Price
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500">
                                {formData.currency}
                              </span>
                            </div>
                            <input
                              type="number"
                              name="price"
                              id="price"
                              className="block w-full pl-16 rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              value={formData.price}
                              readOnly
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">Auto-calculated from base price × number of people</p>
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
                          value={formData.currency}
                          onChange={handleChange}
                        >
                          {currencies.map(currency => (
                            <option key={currency} value={currency}>
                              {currency}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="confirmationNumber" className="block text-sm font-medium text-gray-700">
                            Confirmation/Booking Number
                          </label>
                          <input
                            type="text"
                            name="confirmationNumber"
                            id="confirmationNumber"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            placeholder="e.g. AB123456"
                            value={formData.confirmationNumber}
                            onChange={handleChange}
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="contact" className="block text-sm font-medium text-gray-700">
                            Contact Information
                          </label>
                          <input
                            type="text"
                            name="contact"
                            id="contact"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            placeholder="Phone number, email, etc."
                            value={formData.contact}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="bookingLink" className="block text-sm font-medium text-gray-700">
                          Booking Link
                        </label>
                        <input
                          type="url"
                          name="bookingLink"
                          id="bookingLink"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          placeholder="https://example.com/booking"
                          value={formData.bookingLink}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                          Notes
                        </label>
                        <textarea
                          name="notes"
                          id="notes"
                          rows={3}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          placeholder="Additional information about the accommodation..."
                          value={formData.notes}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
                      <button
                        type="button"
                        className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm"
                        onClick={handleCloseModal}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : isEditing ? 'Update' : 'Add'}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Modal */}
      <Transition appear show={showDeleteConfirmation} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setShowDeleteConfirmation(false)}>
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
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Delete Accommodation
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete this accommodation? This action cannot be undone.
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                      onClick={confirmDelete}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => setShowDeleteConfirmation(false)}
                    >
                      Cancel
                    </button>
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

export default AccommodationPlanner; 