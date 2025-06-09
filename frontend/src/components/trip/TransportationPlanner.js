import React, { useState, Fragment } from 'react';
import axios from 'axios';
import { Dialog, Transition, RadioGroup } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TruckIcon, MapPinIcon, CalendarIcon, CurrencyDollarIcon, LinkIcon, CheckCircleIcon, TicketIcon, ArrowPathIcon, UsersIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const transportationTypes = [
  { id: 'flight', name: 'Flight', icon: TruckIcon },
  { id: 'train', name: 'Train', icon: TruckIcon },
  { id: 'bus', name: 'Bus', icon: TruckIcon },
  { id: 'car', name: 'Car', icon: TruckIcon },
  { id: 'ferry', name: 'Ferry', icon: TruckIcon },
  { id: 'other', name: 'Other', icon: TruckIcon },
];

// Templates for quick filling of common transportation options
const transportationTemplates = {
  flight: {
    provider: 'Airline Name',
    departureLocation: 'Origin Airport (e.g., JFK)',
    arrivalLocation: 'Destination Airport (e.g., LAX)',
    price: '350',
    currency: 'USD',
    reservationDetails: 'Economy class',
    numPeople: 1,
    notes: 'Remember to check in 24 hours before departure'
  },
  train: {
    provider: 'Railway Company',
    departureLocation: 'Origin Station',
    arrivalLocation: 'Destination Station',
    price: '75',
    currency: 'USD',
    reservationDetails: 'Standard class',
    numPeople: 1,
    notes: 'Ticket includes seat reservation'
  },
  bus: {
    provider: 'Bus Company',
    departureLocation: 'Origin Terminal',
    arrivalLocation: 'Destination Terminal',
    price: '45',
    currency: 'USD',
    reservationDetails: 'Standard seat',
    numPeople: 1,
    notes: 'Luggage allowance: 1 suitcase per person'
  },
  car: {
    provider: 'Rental Company',
    departureLocation: 'Pickup Location',
    arrivalLocation: 'Dropoff Location',
    price: '65',
    currency: 'USD',
    reservationDetails: 'Economy size vehicle',
    numPeople: 1,
    notes: 'Includes basic insurance'
  },
  ferry: {
    provider: 'Ferry Company',
    departureLocation: 'Origin Port',
    arrivalLocation: 'Destination Port',
    price: '35',
    currency: 'USD',
    reservationDetails: 'Standard class',
    numPeople: 1,
    notes: 'Check-in 60 minutes before departure'
  },
  rideshare: {
    provider: 'Uber/Lyft/Local service',
    departureLocation: 'Pickup Location',
    arrivalLocation: 'Destination',
    price: '25',
    currency: 'USD',
    reservationDetails: 'Standard vehicle',
    numPeople: 1,
    notes: 'Price may vary based on time and demand'
  },
  taxi: {
    provider: 'Local Taxi Service',
    departureLocation: 'Pickup Location',
    arrivalLocation: 'Destination',
    price: '30',
    currency: 'USD',
    reservationDetails: 'Standard taxi',
    numPeople: 1,
    notes: 'May need to arrange in advance'
  },
  other: {
    provider: 'Transportation Provider',
    departureLocation: 'Starting Point',
    arrivalLocation: 'Ending Point',
    price: '50',
    currency: 'USD',
    reservationDetails: 'Basic details',
    numPeople: 1,
    notes: 'Add any specific notes here'
  }
};

const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'];

const TransportationPlanner = ({ trip, setTrip, isOrganizer }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTransportation, setCurrentTransportation] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTransportation, setSelectedTransportation] = useState(null);
  const [votedTransportation, setVotedTransportation] = useState({});
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [transportationToDelete, setTransportationToDelete] = useState(null);
  const [basePrice, setBasePrice] = useState('');
  const [showTemplateApplied, setShowTemplateApplied] = useState(false);
  const [message, setMessage] = useState(null);
  const [totalCost, setTotalCost] = useState({
    amount: 0,
    currency: 'USD',
    breakdown: {
      accommodation: 0,
      transportation: 0,
      activities: 0,
      other: 0
    }
  });

  const initialFormData = {
    type: 'flight',
    provider: '',
    departureLocation: '',
    departureDateTime: '',
    arrivalLocation: '',
    arrivalDateTime: '',
    confirmationNumber: '',
    reservationDetails: '',
    price: '',
    basePrice: '',
    currency: 'USD',
    numPeople: 1,
    notes: '',
    bookingLink: '',
    totalPrice: ''
  };

  const [formData, setFormData] = useState(initialFormData);

  const handleOpenModal = (transportation = null) => {
    if (transportation) {
      console.log("Opening modal for edit with full transportation data:", transportation);
      const basePrice = transportation.basePrice || transportation.price || '';
      const numPeople = transportation.numPeople ? parseInt(transportation.numPeople) : 1;
      console.log("Parsed values - basePrice:", basePrice, "numPeople:", numPeople);
      
      const formattedData = {
        type: transportation.type || 'flight',
        provider: transportation.provider || '',
        departureLocation: transportation.departureLocation || '',
        departureDateTime: transportation.departureDateTime ? new Date(transportation.departureDateTime).toISOString().slice(0, 16) : '',
        arrivalLocation: transportation.arrivalLocation || '',
        arrivalDateTime: transportation.arrivalDateTime ? new Date(transportation.arrivalDateTime).toISOString().slice(0, 16) : '',
        confirmationNumber: transportation.confirmationNumber || '',
        reservationDetails: transportation.reservationDetails || '',
        price: transportation.price || '',
        basePrice: basePrice,
        currency: transportation.currency || 'USD',
        numPeople: numPeople,
        notes: transportation.notes || '',
        bookingLink: transportation.bookingLink || '',
        totalPrice: transportation.price ? (parseFloat(transportation.price) * numPeople).toFixed(2) : ''
      };

      console.log("Setting form data to:", formattedData);
      setFormData(formattedData);
      setBasePrice(basePrice);
      setCurrentTransportation({...transportation, numPeople});
      setIsEditing(true);
    } else {
      setFormData(initialFormData);
      setBasePrice('');
      setCurrentTransportation(null);
      setIsEditing(false);
    }
    setIsModalOpen(true);
    setShowTemplateApplied(false);
    setMessage(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError(null);
    setMessage(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle price and numPeople specially to calculate total price
    if (name === 'basePrice') {
      const newBasePrice = value === '' ? 0 : parseFloat(value);
      const numPeople = parseInt(formData.numPeople) || 1;
      setBasePrice(value);
      setFormData(prevData => ({
        ...prevData,
        basePrice: value,
        price: (newBasePrice * numPeople).toString(),
        totalPrice: (newBasePrice * numPeople).toFixed(2)
      }));
    } else if (name === 'numPeople') {
      // Ensure numPeople is a valid integer
      const newNumPeople = parseInt(value) || 1;
      const basePrice = parseFloat(formData.basePrice) || 0;
      
      console.log("Changing numPeople to:", newNumPeople, "with basePrice:", basePrice);
      
      setFormData(prevData => ({
        ...prevData,
        numPeople: newNumPeople,
        price: (basePrice * newNumPeople).toString(),
        totalPrice: (basePrice * newNumPeople).toFixed(2)
      }));
    } else {
      setFormData(prevData => ({
        ...prevData,
        [name]: value
      }));
    }
  };

  const handleTypeChange = (type) => {
    setFormData({
      ...formData,
      type
    });
  };

  const applyTemplate = (templateType) => {
    const template = transportationTemplates[templateType];
    const numPeople = formData.numPeople || 1;
    
    const newFormData = {
      ...formData,
      ...template,
      // Keep existing date/time values if already set
      departureDateTime: formData.departureDateTime || '',
      arrivalDateTime: formData.arrivalDateTime || '',
      numPeople: numPeople
    };
    
    // Calculate the total price based on people
    const basePrice = template.price || '';
    newFormData.basePrice = basePrice;
    newFormData.price = (parseFloat(basePrice || 0) * numPeople).toString();
    newFormData.totalPrice = (parseFloat(basePrice || 0) * numPeople).toFixed(2);
    
    setFormData(newFormData);
    setBasePrice(basePrice);
    setShowTemplateApplied(true);
    
    // Display a success message
    setMessage({ 
      type: 'success', 
      text: `${templateType.charAt(0).toUpperCase() + templateType.slice(1)} template applied` 
    });
    
    // Hide template applied message after 3 seconds
    setTimeout(() => {
      setShowTemplateApplied(false);
      setMessage(null);
    }, 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Format dates for backend
      const departureDateTime = formData.departureDateTime ? new Date(formData.departureDateTime) : null;
      const arrivalDateTime = formData.arrivalDateTime ? new Date(formData.arrivalDateTime) : null;
      
      // Ensure numPeople is properly parsed as integer
      const numPeople = parseInt(formData.numPeople) || 1;
      
      // Prepare transportation data
      const transportationData = {
        ...formData,
        departureDateTime,
        arrivalDateTime,
        price: formData.price ? parseFloat(formData.price) : null,
        basePrice: formData.basePrice ? parseFloat(formData.basePrice) : null,
        numPeople: numPeople // Ensure we're using the parsed value
      };

      console.log("Submitting with transportationData:", transportationData);

      // Get current transportation options
      const currentTransportationList = [...(trip.tripDetails?.transportation || [])];
      
      let updatedTransportationList;
      if (isEditing && currentTransportation) {
        // Update existing transportation
        console.log("Updating existing transportation:", currentTransportation._id);
        
        const index = currentTransportationList.findIndex(
          trans => trans._id === currentTransportation._id
        );
        
        if (index !== -1) {
          console.log("Found at index:", index, "Updating with:", transportationData);
          // Create new array with updated item
          updatedTransportationList = [
            ...currentTransportationList.slice(0, index),
            {
              ...transportationData,
              _id: currentTransportation._id
            },
            ...currentTransportationList.slice(index + 1)
          ];
        } else {
          console.log("Item not found in list");
          updatedTransportationList = currentTransportationList;
        }
      } else {
        // Add new transportation
        console.log("Adding new transportation:", transportationData);
        updatedTransportationList = [...currentTransportationList, transportationData];
      }

      // Update trip on backend
      const response = await axios.put(`/api/trips/${trip._id}/transportation`, {
        transportation: updatedTransportationList
      });

      // Log the response data to verify the update
      console.log("Response from server:", response.data);

      // Update local trip state, ensuring we preserve the updated transportation list
      setTrip(prevTrip => ({
        ...prevTrip,
        tripDetails: {
          ...prevTrip.tripDetails,
          transportation: updatedTransportationList
        }
      }));

      handleCloseModal();
    } catch (err) {
      console.error('Error saving transportation:', err);
      setError(err.response?.data?.msg || 'Failed to save transportation');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (transportationId) => {
    setTransportationToDelete(transportationId);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!transportationToDelete) return;
    
    setLoading(true);
    try {
      const updatedTransportation = (trip.tripDetails?.transportation || [])
        .filter(trans => trans._id !== transportationToDelete);
      
      await axios.put(`/api/trips/${trip._id}/transportation`, {
        transportation: updatedTransportation
      });

      // Update the local trip state with the new transportation list
      setTrip(prevTrip => ({
        ...prevTrip,
        tripDetails: {
          ...prevTrip.tripDetails,
          transportation: updatedTransportation
        }
      }));

      setShowDeleteConfirmation(false);
      setTransportationToDelete(null);
    } catch (err) {
      console.error('Error deleting transportation:', err);
      setError('Failed to delete transportation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (transportationId) => {
    try {
      // This is a simplified voting mechanism - in a real implementation
      // you would save votes to the backend
      setVotedTransportation({
        ...votedTransportation,
        [transportationId]: !votedTransportation[transportationId]
      });
    } catch (err) {
      console.error('Error voting for transportation:', err);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleString(undefined, options);
  };

  const getTypeIcon = (type) => {
    const transportationType = transportationTypes.find(t => t.id === type);
    return transportationType ? transportationType.icon : TruckIcon;
  };

  const transportation = trip.tripDetails?.transportation || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Transportation</h3>
        {isOrganizer && (
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="-ml-0.5 mr-2 h-4 w-4" />
            Add Transportation
          </button>
        )}
      </div>

      {transportation.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No transportation added</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add your first transportation option for this trip.
          </p>
          {isOrganizer && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => handleOpenModal()}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Add Transportation
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {transportation.map((item) => {
            const TypeIcon = getTypeIcon(item.type);
            return (
              <div
                key={item._id || item.provider}
                className={`relative bg-white rounded-lg shadow overflow-hidden cursor-pointer transition-shadow hover:shadow-md border-2 ${
                  selectedTransportation === item._id ? 'border-primary-500' : 'border-transparent'
                }`}
                onClick={() => setSelectedTransportation(
                  selectedTransportation === item._id ? null : item._id
                )}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <TypeIcon className="h-6 w-6 text-primary-500 mr-2" />
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">
                          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </h4>
                        {item.provider && (
                          <p className="text-sm text-gray-600">{item.provider}</p>
                        )}
                      </div>
                    </div>
                    {votedTransportation[item._id] && (
                      <CheckCircleIcon className="h-6 w-6 text-green-500" />
                    )}
                  </div>
  
                  <div className="space-y-4 mb-4">
                    <div className="border-l-4 border-primary-100 pl-4 space-y-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 uppercase">Departure</span>
                        <span className="text-sm font-medium">{item.departureLocation}</span>
                        <span className="text-sm text-gray-600">{formatDateTime(item.departureDateTime)}</span>
                      </div>
                    </div>
                    
                    <div className="border-l-4 border-primary-100 pl-4 space-y-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 uppercase">Arrival</span>
                        <span className="text-sm font-medium">{item.arrivalLocation}</span>
                        <span className="text-sm text-gray-600">{formatDateTime(item.arrivalDateTime)}</span>
                      </div>
                    </div>
                    
                    {item.price && (
                      <div className="flex items-center text-sm">
                        <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-600">
                          {item.currency} {item.price.toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {item.confirmationNumber && (
                      <div className="flex items-center text-sm">
                        <TicketIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-600">Confirmation: {item.confirmationNumber}</span>
                      </div>
                    )}
                    
                    {item.bookingLink && (
                      <div className="flex items-center text-sm">
                        <LinkIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <a
                          href={item.bookingLink}
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
                  
                  {(item.reservationDetails || item.notes) && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      {item.reservationDetails && (
                        <div className="mb-2">
                          <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Reservation Details</h5>
                          <p className="text-sm text-gray-600">{item.reservationDetails}</p>
                        </div>
                      )}
                      {item.notes && (
                        <div>
                          <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</h5>
                          <p className="text-sm text-gray-600">{item.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 flex justify-between">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVote(item._id);
                    }}
                    className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-md ${
                      votedTransportation[item._id]
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {votedTransportation[item._id] ? 'Voted' : 'Vote'}
                  </button>
                  
                  {isOrganizer && (
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(item);
                        }}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item._id);
                        }}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Transportation Modal */}
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
                    {isEditing ? 'Edit Transportation' : 'Add Transportation'}
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
                  
                  {message && message.type === 'success' && (
                    <div className="mt-4 bg-green-50 p-3 rounded-md">
                      <p className="text-sm text-green-700">{message.text}</p>
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
                          Transportation Type
                        </label>
                        <div className="flex justify-between items-center">
                          <RadioGroup value={formData.type} onChange={handleTypeChange} className="mt-2 flex-1">
                            <RadioGroup.Label className="sr-only">Transportation Type</RadioGroup.Label>
                            <div className="grid grid-cols-3 gap-3">
                              {transportationTypes.map((type) => (
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
                            onClick={() => applyTemplate(formData.type)}
                            className="ml-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            <ArrowPathIcon className="-ml-0.5 mr-2 h-4 w-4" />
                            Fill Template
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="provider" className="block text-sm font-medium text-gray-700">
                          Provider
                        </label>
                        <input
                          type="text"
                          name="provider"
                          id="provider"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          placeholder="e.g. American Airlines, Amtrak, Hertz"
                          value={formData.provider}
                          onChange={handleChange}
                        />
                      </div>
                      
                      {/* Departure Details */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="departureLocation" className="block text-sm font-medium text-gray-700">
                            Departure Location*
                          </label>
                          <input
                            type="text"
                            name="departureLocation"
                            id="departureLocation"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            placeholder="City, Airport, Station, etc."
                            value={formData.departureLocation}
                            onChange={handleChange}
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="departureDateTime" className="block text-sm font-medium text-gray-700">
                            Departure Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            name="departureDateTime"
                            id="departureDateTime"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            value={formData.departureDateTime}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                      
                      {/* Arrival Details */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="arrivalLocation" className="block text-sm font-medium text-gray-700">
                            Arrival Location*
                          </label>
                          <input
                            type="text"
                            name="arrivalLocation"
                            id="arrivalLocation"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            placeholder="City, Airport, Station, etc."
                            value={formData.arrivalLocation}
                            onChange={handleChange}
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="arrivalDateTime" className="block text-sm font-medium text-gray-700">
                            Arrival Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            name="arrivalDateTime"
                            id="arrivalDateTime"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            value={formData.arrivalDateTime}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                      
                      {/* Template selection */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quick Templates
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.keys(transportationTemplates).map(type => (
                            <button
                              key={type}
                              type="button"
                              className={`px-3 py-2 text-sm border rounded-md hover:bg-gray-50 transition ${
                                formData.type === type ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-gray-200'
                              }`}
                              onClick={() => {
                                handleTypeChange(type);
                                applyTemplate(type);
                              }}
                            >
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                          ))}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Click a template to automatically fill in common values for that transportation type
                        </p>
                      </div>
                      
                      {/* Number of people field */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <UserGroupIcon className="h-5 w-5 inline mr-1" />
                          Number of People
                        </label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            min="1"
                            name="numPeople"
                            value={formData.numPeople || 1}
                            onChange={(e) => {
                              const numPeople = parseInt(e.target.value) || 1;
                              const basePrice = parseFloat(formData.price) || 0;
                              setFormData({
                                ...formData,
                                numPeople,
                                totalPrice: (basePrice * numPeople).toFixed(2)
                              });
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          This will automatically calculate the total price
                        </p>
                      </div>
                      
                      {/* Price field */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <CurrencyDollarIcon className="h-5 w-5 inline mr-1" />
                          Base Price (per person)
                        </label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            name="price"
                            value={formData.price || ''}
                            onChange={(e) => {
                              const basePrice = parseFloat(e.target.value) || 0;
                              const numPeople = parseInt(formData.numPeople) || 1;
                              setFormData({
                                ...formData,
                                price: e.target.value,
                                totalPrice: (basePrice * numPeople).toFixed(2)
                              });
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                          <select
                            name="currency"
                            value={formData.currency || 'USD'}
                            onChange={handleChange}
                            className="ml-2 mt-1 block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          >
                            {currencies.map(currency => (
                              <option key={currency} value={currency}>{currency}</option>
                            ))}
                          </select>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Total: {formData.totalPrice || (formData.price * (formData.numPeople || 1)).toFixed(2)} {formData.currency || 'USD'}
                        </p>
                      </div>
                      
                      <div>
                        <label htmlFor="confirmationNumber" className="block text-sm font-medium text-gray-700">
                          Confirmation/Booking Number
                        </label>
                        <input
                          type="text"
                          name="confirmationNumber"
                          id="confirmationNumber"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          placeholder="Reference code"
                          value={formData.confirmationNumber}
                          onChange={handleChange}
                        />
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
                          placeholder="https://booking-site.com/reference"
                          value={formData.bookingLink}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="reservationDetails" className="block text-sm font-medium text-gray-700">
                          Reservation Details
                        </label>
                        <input
                          type="text"
                          name="reservationDetails"
                          id="reservationDetails"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          placeholder="Seat number, class, etc."
                          value={formData.reservationDetails}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                          Notes
                        </label>
                        <textarea
                          id="notes"
                          name="notes"
                          rows={4}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          placeholder="Additional details, baggage information, etc."
                          value={formData.notes}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    
                    <div className="pt-5 border-t border-gray-200 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
                      >
                        {loading ? 'Saving...' : (isEditing ? 'Update' : 'Save')}
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                  >
                    Delete Transportation
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500"
                      onClick={() => setShowDeleteConfirmation(false)}
                    >
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </Dialog.Title>
                  
                  <p className="mt-4 text-sm text-gray-700">
                    Are you sure you want to delete this transportation option?
                  </p>
                  
                  <div className="mt-5 border-t border-gray-200 pt-5 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirmation(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmDelete}
                      className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Delete
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

export default TransportationPlanner; 