import React, { useState, Fragment } from 'react';
import axios from 'axios';
import { Dialog, Transition, RadioGroup } from '@headlessui/react';
import { 
  XMarkIcon, 
  PlusIcon, 
  MapPinIcon, 
  CalendarIcon, 
  ClockIcon,
  CurrencyDollarIcon, 
  LinkIcon, 
  UserGroupIcon,
  CheckCircleIcon, 
  TicketIcon 
} from '@heroicons/react/24/outline';

const activityTypes = [
  { id: 'sightseeing', name: 'Sightseeing', icon: MapPinIcon },
  { id: 'dining', name: 'Dining', icon: TicketIcon },
  { id: 'adventure', name: 'Adventure', icon: UserGroupIcon },
  { id: 'culture', name: 'Culture', icon: TicketIcon },
  { id: 'nature', name: 'Nature', icon: MapPinIcon },
  { id: 'nightlife', name: 'Nightlife', icon: ClockIcon },
  { id: 'other', name: 'Other', icon: TicketIcon },
];

const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'];

const ActivitiesPlanner = ({ trip, setTrip, isOrganizer }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [votedActivities, setVotedActivities] = useState({});
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [dayToDeleteFrom, setDayToDeleteFrom] = useState(null);

  const initialFormData = {
    day: 1,
    type: 'sightseeing',
    name: '',
    location: '',
    date: '',
    startTime: '',
    endTime: '',
    description: '',
    price: '',
    currency: 'USD',
    bookingLink: '',
    confirmation: '',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormData);

  // Create default itinerary if none exists
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const dayCount = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  const itinerary = trip.tripDetails?.itinerary || 
    Array.from({ length: dayCount }, (_, i) => ({
      day: i + 1,
      date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      activities: []
    }));

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseFloat(value) || '' : value
    });
  };

  const handleTypeChange = (type) => {
    setFormData({
      ...formData,
      type
    });
  };

  const handleDayChange = (e) => {
    const day = parseInt(e.target.value);
    setFormData({
      ...formData,
      day
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let updatedItinerary = [...itinerary];
      const dayIndex = updatedItinerary.findIndex(d => d.day === formData.day);

      if (dayIndex === -1) {
        throw new Error('Day not found in itinerary');
      }

      const newActivity = {
        ...formData,
        _id: isEditing ? currentActivity._id : Date.now().toString()
      };

      if (isEditing) {
        // Update existing activity
        const activityIndex = updatedItinerary[dayIndex].activities.findIndex(
          a => a._id === currentActivity._id
        );
        updatedItinerary[dayIndex].activities[activityIndex] = newActivity;
      } else {
        // Add new activity
        if (!updatedItinerary[dayIndex].activities) {
          updatedItinerary[dayIndex].activities = [];
        }
        updatedItinerary[dayIndex].activities.push(newActivity);
      }

      const response = await axios.put(`/api/trips/${trip._id}/itinerary`, {
        itinerary: updatedItinerary
      });

      setTrip(response.data);
      setIsModalOpen(false);
      setFormData(initialFormData);
      setIsEditing(false);
      setCurrentActivity(null);
    } catch (err) {
      console.error('Error saving activity:', err);
      setError(err.response?.data?.msg || 'Failed to save activity');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (day, activity) => {
    setCurrentActivity(activity);
    setIsEditing(true);
    setFormData({
      ...activity,
      day
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (day, activityId) => {
    setDayToDeleteFrom(day);
    setActivityToDelete(activityId);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!activityToDelete || dayToDeleteFrom === null) return;
    
    setLoading(true);
    try {
      const updatedItinerary = [...itinerary];
      const dayIndex = updatedItinerary.findIndex(d => d.day === dayToDeleteFrom);
      
      updatedItinerary[dayIndex].activities = updatedItinerary[dayIndex].activities.filter(
        activity => activity._id !== activityToDelete
      );
      
      const response = await axios.put(`/api/trips/${trip._id}/itinerary`, {
        itinerary: updatedItinerary
      });

      setTrip(response.data);
      setShowDeleteConfirmation(false);
      setActivityToDelete(null);
      setDayToDeleteFrom(null);
    } catch (err) {
      console.error('Error deleting activity:', err);
      alert('Failed to delete activity');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (activityId) => {
    try {
      // This is a simplified voting mechanism - in a real implementation
      // you would save votes to the backend
      setVotedActivities({
        ...votedActivities,
        [activityId]: !votedActivities[activityId]
      });
    } catch (err) {
      console.error('Error voting for activity:', err);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      return new Date(0, 0, 0, hours, minutes).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
    } catch (e) {
      return timeString;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  const getTypeIcon = (type) => {
    const activityType = activityTypes.find(t => t.id === type);
    return activityType ? activityType.icon : MapPinIcon;
  };

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Trip Itinerary</h2>
        {isOrganizer && (
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setCurrentActivity(null);
              setFormData(initialFormData);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Activity
          </button>
        )}
      </div>

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      <div className="mb-6">
        <label htmlFor="day-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select day to view
        </label>
        <select
          id="day-select"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          value={selectedDay || ''}
          onChange={(e) => setSelectedDay(e.target.value ? parseInt(e.target.value) : null)}
        >
          <option value="">All days</option>
          {itinerary.map((day) => (
            <option key={day.day} value={day.day}>
              Day {day.day} - {formatDate(day.date)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-8">
        {itinerary
          .filter(day => !selectedDay || day.day === selectedDay)
          .map((day) => (
            <div key={day.day} className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Day {day.day} - {formatDate(day.date)}
              </h3>
              
              {day.activities && day.activities.length > 0 ? (
                <div className="space-y-4">
                  {day.activities.map((activity) => {
                    const TypeIcon = getTypeIcon(activity.type);
                    return (
                      <div key={activity._id} className="bg-gray-50 rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              <div className="bg-primary-100 rounded-md p-2">
                                <TypeIcon className="h-6 w-6 text-primary-600" />
                              </div>
                            </div>
                            <div>
                              <h4 className="text-lg font-medium text-gray-900">
                                {activity.name}
                              </h4>
                              <div className="mt-1 flex items-center">
                                <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                                <span className="text-sm text-gray-500">
                                  {formatTime(activity.startTime)}
                                  {activity.endTime && ` - ${formatTime(activity.endTime)}`}
                                </span>
                              </div>
                              {activity.location && (
                                <div className="mt-1 flex items-center">
                                  <MapPinIcon className="h-4 w-4 text-gray-400 mr-1" />
                                  <span className="text-sm text-gray-500">{activity.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => handleVote(activity._id)}
                              className={`inline-flex items-center p-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 ${
                                votedActivities[activity._id] 
                                  ? 'bg-primary-100 border-primary-300' 
                                  : 'bg-white hover:bg-gray-50'
                              }`}
                            >
                              <CheckCircleIcon className={`h-4 w-4 ${
                                votedActivities[activity._id] ? 'text-primary-600' : 'text-gray-400'
                              }`} />
                            </button>
                            {isOrganizer && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEdit(day.day, activity)}
                                  className="inline-flex items-center p-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(day.day, activity._id)}
                                  className="inline-flex items-center p-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {activity.description && (
                          <div className="mt-3 text-sm text-gray-500">{activity.description}</div>
                        )}
                        
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {activity.price && (
                            <div className="flex items-center text-sm">
                              <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="text-gray-600">
                                {activity.currency} {parseFloat(activity.price).toLocaleString()}
                              </span>
                            </div>
                          )}
                          
                          {activity.confirmation && (
                            <div className="flex items-center text-sm">
                              <TicketIcon className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="text-gray-600">Confirmation: {activity.confirmation}</span>
                            </div>
                          )}
                        </div>
                        
                        {activity.bookingLink && (
                          <div className="mt-3 flex items-center text-sm">
                            <LinkIcon className="h-5 w-5 text-gray-400 mr-2" />
                            <a 
                              href={activity.bookingLink.startsWith('http') ? activity.bookingLink : `https://${activity.bookingLink}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-primary-600 hover:text-primary-800"
                            >
                              Booking Link
                            </a>
                          </div>
                        )}
                        
                        {activity.notes && (
                          <div className="mt-3 text-sm text-gray-500">
                            <div className="font-medium">Notes:</div>
                            <div className="mt-1">{activity.notes}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500">No activities planned for this day yet.</p>
                  {isOrganizer && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setCurrentActivity(null);
                        setFormData({...initialFormData, day: day.day});
                        setIsModalOpen(true);
                      }}
                      className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add Activity
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Add/Edit Activity Modal */}
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
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
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
                  <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                    {isEditing ? 'Edit Activity' : 'Add Activity'}
                  </Dialog.Title>
                  <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                    {/* Day Selection */}
                    <div>
                      <label htmlFor="day" className="block text-sm font-medium text-gray-700">
                        Day*
                      </label>
                      <select
                        id="day"
                        name="day"
                        required
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                        value={formData.day}
                        onChange={handleDayChange}
                      >
                        {itinerary.map((day) => (
                          <option key={day.day} value={day.day}>
                            Day {day.day} - {formatDate(day.date)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Activity Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Activity Type*
                      </label>
                      <RadioGroup value={formData.type} onChange={handleTypeChange} className="mt-2">
                        <RadioGroup.Label className="sr-only">Activity Type</RadioGroup.Label>
                        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                          {activityTypes.map((type) => (
                            <RadioGroup.Option
                              key={type.id}
                              value={type.id}
                              className={({ checked }) =>
                                `${
                                  checked ? 'bg-primary-50 border-primary-200 z-10' : 'border-gray-200'
                                }
                                relative border rounded-lg py-3 px-3 flex items-center justify-center text-sm font-medium uppercase focus:outline-none cursor-pointer`
                              }
                            >
                              <RadioGroup.Label as="span" className="flex flex-col items-center">
                                <type.icon className="h-6 w-6 text-primary-600 mb-1" />
                                <span>{type.name}</span>
                              </RadioGroup.Label>
                            </RadioGroup.Option>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Activity Details */}
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      <div className="sm:col-span-6">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Activity Name*
                        </label>
                        <input
                          type="text"
                          name="name"
                          id="name"
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          value={formData.name}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="sm:col-span-6">
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                          Location
                        </label>
                        <input
                          type="text"
                          name="location"
                          id="location"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          placeholder="e.g., Museum Address, Restaurant Name, etc."
                          value={formData.location}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                          Start Time
                        </label>
                        <input
                          type="time"
                          name="startTime"
                          id="startTime"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          value={formData.startTime}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                          End Time
                        </label>
                        <input
                          type="time"
                          name="endTime"
                          id="endTime"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          value={formData.endTime}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="sm:col-span-6">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          rows={3}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          placeholder="Describe the activity..."
                          value={formData.description}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                          Price
                        </label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                          <div className="relative flex items-stretch flex-grow focus-within:z-10">
                            <input
                              type="number"
                              name="price"
                              id="price"
                              step="0.01"
                              min="0"
                              className="focus:ring-primary-500 focus:border-primary-500 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300"
                              placeholder="0.00"
                              value={formData.price}
                              onChange={handleChange}
                            />
                          </div>
                          <select
                            name="currency"
                            id="currency"
                            className="focus:ring-primary-500 focus:border-primary-500 -ml-px block w-24 rounded-none rounded-r-md sm:text-sm border-gray-300"
                            value={formData.currency}
                            onChange={handleChange}
                          >
                            {currencies.map((currency) => (
                              <option key={currency} value={currency}>
                                {currency}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="confirmation" className="block text-sm font-medium text-gray-700">
                          Confirmation/Booking #
                        </label>
                        <input
                          type="text"
                          name="confirmation"
                          id="confirmation"
                          className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          value={formData.confirmation}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="sm:col-span-6">
                        <label htmlFor="bookingLink" className="block text-sm font-medium text-gray-700">
                          Booking Link
                        </label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                          <input
                            type="text"
                            name="bookingLink"
                            id="bookingLink"
                            className="focus:ring-primary-500 focus:border-primary-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300"
                            placeholder="https://example.com"
                            value={formData.bookingLink}
                            onChange={handleChange}
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-6">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                          Notes
                        </label>
                        <textarea
                          id="notes"
                          name="notes"
                          rows={3}
                          className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Any additional information..."
                          value={formData.notes}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div className="pt-5">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(false)}
                          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          {loading ? 'Saving...' : isEditing ? 'Update' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
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
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    type="button"
                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    onClick={() => setShowDeleteConfirmation(false)}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div>
                  <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                    Confirm Delete
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete this activity?
                    </p>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={confirmDelete}
                      className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
};

export default ActivitiesPlanner; 