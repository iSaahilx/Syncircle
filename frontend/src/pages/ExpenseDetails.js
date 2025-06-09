import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeftIcon, CurrencyDollarIcon, ReceiptRefundIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

const ExpenseDetails = () => {
  const { eventId, expenseId } = useParams();
  const { currentUser, setError } = useAuth();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        const res = await axios.get(`/api/expenses/${expenseId}`);
        setExpense(res.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load expense details');
        navigate(`/events/${eventId}`);
      }
    };
    
    fetchExpense();
  }, [expenseId, eventId, navigate, setError]);

  const handleSettleExpense = async (userId) => {
    try {
      await axios.put(`/api/expenses/${expenseId}/settle/${userId}`);
      
      // Update the local state
      setExpense(prevExpense => ({
        ...prevExpense,
        shares: prevExpense.shares.map(share => 
          share.user._id === userId 
            ? { ...share, paid: true, paidDate: new Date() }
            : share
        )
      }));
    } catch (err) {
      setError('Failed to settle expense');
    }
  };

  const handleDeleteExpense = async () => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      await axios.delete(`/api/expenses/${expenseId}`);
      navigate(`/events/${eventId}`);
    } catch (err) {
      setError('Failed to delete expense');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const isCreator = expense?.paidBy?._id === currentUser?._id;
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: expense?.currency || 'USD'
    }).format(amount);
  };

  return (
    <div>
      <div className="flex items-center mb-6">
        <Link to={`/events/${eventId}`} className="text-gray-500 hover:text-gray-700 mr-3">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Expense Details</h2>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{expense.title}</h3>
              <p className="text-gray-500 text-sm capitalize mt-1">{expense.category}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
              <p className="text-sm text-gray-500">
                {format(new Date(expense.date), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          {expense.notes && (
            <div className="mt-4 bg-gray-50 p-3 rounded-md">
              <p className="text-gray-700">{expense.notes}</p>
            </div>
          )}

          <div className="mt-6">
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <CurrencyDollarIcon className="h-5 w-5 mr-1" />
              <span>Paid by {expense.paidBy.name}</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-500">
              <ReceiptRefundIcon className="h-5 w-5 mr-1" />
              <span>Split {expense.splitType === 'equal' ? 'equally' : `by ${expense.splitType}`}</span>
            </div>
          </div>

          {isCreator && (
            <div className="mt-6 flex space-x-3">
              <Link
                to={`/events/${eventId}/expenses/${expenseId}/edit`}
                className="btn-secondary inline-flex items-center text-sm"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                Edit
              </Link>
              <button
                onClick={handleDeleteExpense}
                disabled={isDeleting}
                className="btn-secondary bg-red-100 text-red-700 hover:bg-red-200 inline-flex items-center text-sm"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200">
          <div className="px-6 py-4">
            <h4 className="text-lg font-medium text-gray-900 mb-3">Who owes what</h4>
            
            <div className="space-y-3">
              {expense.shares.map(share => (
                <div key={share.user._id} className="flex justify-between items-center">
                  <div className="flex items-center">
                    {share.user.avatar ? (
                      <img src={share.user.avatar} alt="" className="h-8 w-8 rounded-full mr-3" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 mr-3">
                        {share.user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium">{share.user.name}</span>
                    
                    {share.paid && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Paid
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center">
                    <span className="font-medium">
                      {formatCurrency(expense.amount * share.value / 100)}
                    </span>
                    
                    {!share.paid && share.user._id !== currentUser._id && isCreator && (
                      <button
                        onClick={() => handleSettleExpense(share.user._id)}
                        className="ml-3 text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                      >
                        Mark as Paid
                      </button>
                    )}
                    
                    {!share.paid && share.user._id === currentUser._id && !isCreator && (
                      <button
                        onClick={() => handleSettleExpense(share.user._id)}
                        className="ml-3 text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                      >
                        I've Paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetails;
