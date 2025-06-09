import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Tab } from '@headlessui/react';
import {
  CalendarIcon,
  MapPinIcon,
  UserGroupIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  TruckIcon,
  TicketIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

// Trip Planning Components (will be implemented)
import AccommodationPlanner from '../components/trip/AccommodationPlanner';
import TransportationPlanner from '../components/trip/TransportationPlanner';
import ActivitiesPlanner from '../components/trip/ActivitiesPlanner';
import BudgetPlanner from '../components/trip/BudgetPlanner';
import TripParticipants from '../components/trip/TripParticipants';
import PackingList from '../components/trip/PackingList';
import TripDocuments from '../components/trip/TripDocuments';
import TripDiscussion from '../components/trip/TripDiscussion';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const TripDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOrganizer, setIsOrganizer] = useState(true);
  const [totalCost, setTotalCost] = useState({ amount: 0, currency: 'USD', breakdown: { accommodation: 0, transportation: 0, activities: 0, other: 0 } });

  useEffect(() => {
    const fetchTripDetails = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/trips/${id}`);
        setTrip(res.data);
        
        // Check if current user is an organizer
        // const userIsOrganizer = 
        //   res.data.creator._id === currentUser.uid ||
        //   res.data.organizers.some(org => org.user._id === currentUser.uid);
        // setIsOrganizer(userIsOrganizer);
        
        // Make all users organizers to enable editing for everyone
        setIsOrganizer(true);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching trip details:', err);
        setError('Failed to load trip details. Please try again.');
        setLoading(false);
      }
    };

    fetchTripDetails();
  }, [id, currentUser]);

  // Calculate total trip cost whenever trip data changes
  useEffect(() => {
    if (trip) {
      calculateTotalCost();
    }
  }, [trip]);

  // Function to calculate the total cost of the trip
  const calculateTotalCost = () => {
    let totalAmount = 0;
    let currency = 'USD'; // Default currency
    let breakdown = {
      accommodation: 0,
      transportation: 0,
      activities: 0,
      other: 0
    };
    
    // Add accommodation costs
    if (trip.tripDetails?.accommodations?.length > 0) {
      const accommodationCosts = trip.tripDetails.accommodations
        .filter(acc => acc.price && acc.currency)
        .map(acc => ({
          amount: parseFloat(acc.price),
          currency: acc.currency
        }));
      
      if (accommodationCosts.length > 0) {
        // Use the currency of the first accommodation as reference
        currency = accommodationCosts[0].currency;
        breakdown.accommodation = accommodationCosts.reduce((sum, cost) => {
          // For simplicity, we're assuming all prices are in the same currency
          return sum + cost.amount;
        }, 0);
        totalAmount += breakdown.accommodation;
      }
    }
    
    // Add transportation costs
    if (trip.tripDetails?.transportation?.length > 0) {
      const transportationCosts = trip.tripDetails.transportation
        .filter(trans => trans.price && trans.currency)
        .map(trans => ({
          amount: parseFloat(trans.price) * (parseInt(trans.numPeople) || 1), // Multiply by number of people
          currency: trans.currency
        }));
      
      if (transportationCosts.length > 0) {
        // If we haven't set a currency yet, use the transportation currency
        if (totalAmount === 0) {
          currency = transportationCosts[0].currency;
        }
        
        breakdown.transportation = transportationCosts.reduce((sum, cost) => {
          // For simplicity, assuming same currency
          return sum + cost.amount;
        }, 0);
        totalAmount += breakdown.transportation;
      }
    }

    // Add activity costs from itinerary if they exist
    if (trip.tripDetails?.itinerary?.length > 0) {
      const activityCosts = trip.tripDetails.itinerary
        .flatMap(day => day.activities || [])
        .filter(activity => activity.cost && activity.currency)
        .map(activity => ({
          amount: parseFloat(activity.cost),
          currency: activity.currency
        }));

      if (activityCosts.length > 0) {
        breakdown.activities = activityCosts.reduce((sum, cost) => {
          return sum + cost.amount;
        }, 0);
        totalAmount += breakdown.activities;
      }
    }
    
    // Add any other costs here if needed
    
    setTotalCost({
      amount: totalAmount,
      currency: currency,
      breakdown: breakdown
    });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => navigate('/trips')}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Go back to trips
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  const tabs = [
    { name: 'Overview', icon: CalendarIcon },
    { name: 'Accommodations', icon: BuildingOfficeIcon },
    { name: 'Transportation', icon: TruckIcon },
    { name: 'Activities', icon: TicketIcon },
    { name: 'Budget', icon: BanknotesIcon },
    { name: 'Participants', icon: UserGroupIcon },
    { name: 'Packing List', icon: ClipboardDocumentListIcon },
    { name: 'Documents', icon: DocumentTextIcon },
    { name: 'Discussion', icon: ChatBubbleLeftRightIcon }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Trip Header */}
      <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between p-6 border-b border-gray-200">
          <div>
            <div className="flex items-center mb-2">
              <h1 className="text-2xl font-bold text-gray-900 mr-4">{trip.title}</h1>
              {trip.isPublic && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Public
                </span>
              )}
            </div>
            <div className="flex items-center text-gray-500 text-sm">
              <MapPinIcon className="h-4 w-4 mr-1" />
              <span>
                {trip.tripDetails?.destination?.city}, {trip.tripDetails?.destination?.country}
              </span>
              <span className="mx-2">•</span>
              <CalendarIcon className="h-4 w-4 mr-1" />
              <span>
                {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
              </span>
            </div>
          </div>
          
          {isOrganizer && (
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => navigate(`/trips/${id}/edit`)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Edit Trip
              </button>
            </div>
          )}
        </div>
        
        {trip.description && (
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-500">Description</h2>
            <p className="mt-1 text-gray-900">{trip.description}</p>
          </div>
        )}
        
        <div className="px-6 py-4 flex flex-wrap gap-4">
          <div>
            <h2 className="text-sm font-medium text-gray-500">Duration</h2>
            <p className="text-gray-900">
              {Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24))} days
            </p>
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-500">Organizer</h2>
            <p className="text-gray-900">{trip.creator.name}</p>
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-500">Participants</h2>
            <p className="text-gray-900">{trip.participants.length} people</p>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <Tab.Group>
          <Tab.List className="flex space-x-1 border-b border-gray-200 overflow-x-auto">
            {tabs.map((tab) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  classNames(
                    'flex items-center whitespace-nowrap py-4 px-4 text-sm font-medium',
                    'focus:outline-none',
                    selected
                      ? 'border-b-2 border-primary-500 text-primary-600'
                      : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )
                }
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels className="p-6">
            {/* Overview Panel */}
            <Tab.Panel>
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Trip Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Destination</h4>
                      <div className="bg-white p-4 rounded-md shadow-sm">
                        <div className="flex items-start">
                          <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <p className="font-medium">
                              {trip.tripDetails?.destination?.city}, {trip.tripDetails?.destination?.country}
                            </p>
                            {trip.location?.name && (
                              <p className="text-sm text-gray-500">{trip.location.name}</p>
                            )}
                            {trip.location?.address && (
                              <p className="text-sm text-gray-500">{trip.location.address}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Dates</h4>
                      <div className="bg-white p-4 rounded-md shadow-sm">
                        <div className="flex items-start">
                          <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <p className="font-medium">
                              {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24))} days
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Trip Progress</h4>
                      <div className="bg-white p-4 rounded-md shadow-sm">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">Accommodations</span>
                            <span className="text-sm font-medium text-gray-900">
                              {trip.tripDetails?.accommodations?.length || 0} options
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">Transportation</span>
                            <span className="text-sm font-medium text-gray-900">
                              {trip.tripDetails?.transportation?.length || 0} options
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">Activities</span>
                            <span className="text-sm font-medium text-gray-900">
                              {trip.tripDetails?.itinerary?.reduce((acc, day) => acc + (day.activities?.length || 0), 0) || 0} planned
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">Budget</span>
                            <span className="text-sm font-medium text-gray-900">
                              {trip.tripDetails?.budget?.total
                                ? `${trip.tripDetails.budget.currency} ${trip.tripDetails.budget.total.toLocaleString()}`
                                : 'Not set'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-t pt-4 mt-4 border-gray-100">
                            <span className="text-sm font-medium text-gray-700">Total Cost (So Far)</span>
                            <span className="text-sm font-medium text-primary-600">
                              {totalCost.amount > 0 
                                ? `${totalCost.currency} ${totalCost.amount.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}`
                                : 'No expenses yet'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">Packing List</span>
                            <span className="text-sm font-medium text-gray-900">
                              {trip.tripDetails?.packingList?.length 
                                ? `${trip.tripDetails.packingList.filter(item => item.packed).length}/${trip.tripDetails.packingList.length} items packed`
                                : 'Not started'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="border-t border-gray-200 pt-4 mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Cost Breakdown</h4>
                          
                          {totalCost.breakdown && (
                            <div className="space-y-2">
                              {totalCost.breakdown.accommodation > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Accommodations</span>
                                  <span className="font-medium text-gray-900">
                                    {formatCurrency(totalCost.breakdown.accommodation, totalCost.currency)}
                                  </span>
                                </div>
                              )}
                              
                              {totalCost.breakdown.transportation > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Transportation</span>
                                  <span className="font-medium text-gray-900">
                                    {formatCurrency(totalCost.breakdown.transportation, totalCost.currency)}
                                  </span>
                                </div>
                              )}
                              
                              {totalCost.breakdown.activities > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Activities</span>
                                  <span className="font-medium text-gray-900">
                                    {formatCurrency(totalCost.breakdown.activities, totalCost.currency)}
                                  </span>
                                </div>
                              )}
                              
                              {totalCost.breakdown.other > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Other</span>
                                  <span className="font-medium text-gray-900">
                                    {formatCurrency(totalCost.breakdown.other, totalCost.currency)}
                                  </span>
                                </div>
                              )}
                              
                              <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between">
                                <span className="font-medium text-gray-900">Total Cost</span>
                                <span className="font-medium text-primary-600">
                                  {totalCost.amount > 0 
                                    ? formatCurrency(totalCost.amount, totalCost.currency)
                                    : 'No expenses yet'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button 
                      onClick={() => document.querySelectorAll('[role="tab"]')[1].click()}
                      className="flex flex-col items-center p-4 bg-white rounded-md shadow-sm hover:bg-gray-50"
                    >
                      <BuildingOfficeIcon className="h-8 w-8 text-primary-500 mb-2" />
                      <span className="text-sm font-medium text-gray-900">Add Accommodation</span>
                    </button>
                    <button 
                      onClick={() => document.querySelectorAll('[role="tab"]')[2].click()}
                      className="flex flex-col items-center p-4 bg-white rounded-md shadow-sm hover:bg-gray-50"
                    >
                      <TruckIcon className="h-8 w-8 text-primary-500 mb-2" />
                      <span className="text-sm font-medium text-gray-900">Plan Transportation</span>
                    </button>
                    <button 
                      onClick={() => document.querySelectorAll('[role="tab"]')[3].click()}
                      className="flex flex-col items-center p-4 bg-white rounded-md shadow-sm hover:bg-gray-50"
                    >
                      <TicketIcon className="h-8 w-8 text-primary-500 mb-2" />
                      <span className="text-sm font-medium text-gray-900">Add Activities</span>
                    </button>
                    <button 
                      onClick={() => document.querySelectorAll('[role="tab"]')[5].click()}
                      className="flex flex-col items-center p-4 bg-white rounded-md shadow-sm hover:bg-gray-50"
                    >
                      <UserGroupIcon className="h-8 w-8 text-primary-500 mb-2" />
                      <span className="text-sm font-medium text-gray-900">Invite Participants</span>
                    </button>
                  </div>
                </div>
              </div>
            </Tab.Panel>
            
            {/* Accommodations Panel */}
            <Tab.Panel>
              <AccommodationPlanner 
                trip={trip} 
                setTrip={setTrip} 
                isOrganizer={isOrganizer} 
              />
            </Tab.Panel>
            
            {/* Transportation Panel */}
            <Tab.Panel>
              <TransportationPlanner 
                trip={trip} 
                setTrip={setTrip} 
                isOrganizer={isOrganizer} 
              />
            </Tab.Panel>
            
            {/* Activities Panel */}
            <Tab.Panel>
              <ActivitiesPlanner 
                trip={trip} 
                setTrip={setTrip} 
                isOrganizer={isOrganizer} 
              />
            </Tab.Panel>
            
            {/* Budget Panel */}
            <Tab.Panel>
              <BudgetPlanner 
                trip={trip} 
                setTrip={setTrip} 
                isOrganizer={isOrganizer} 
              />
            </Tab.Panel>
            
            {/* Participants Panel */}
            <Tab.Panel>
              <TripParticipants 
                trip={trip} 
                setTrip={setTrip} 
                isOrganizer={isOrganizer} 
              />
            </Tab.Panel>
            
            {/* Packing List Panel */}
            <Tab.Panel>
              <PackingList 
                trip={trip} 
                setTrip={setTrip} 
                isOrganizer={isOrganizer} 
              />
            </Tab.Panel>
            
            {/* Documents Panel */}
            <Tab.Panel>
              <TripDocuments 
                trip={trip} 
                setTrip={setTrip} 
                isOrganizer={isOrganizer} 
              />
            </Tab.Panel>
            
            {/* Discussion Panel */}
            <Tab.Panel>
              <TripDiscussion 
                trip={trip} 
                setTrip={setTrip} 
              />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

export default TripDetails; 