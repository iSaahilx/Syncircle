import React from 'react';
import { useParams } from 'react-router-dom';
import Todo from './Todo';

const EventTodo = () => {
  const { eventId } = useParams();

  if (!eventId) {
    return (
      <div className="text-center p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
        Event ID is required to view todos
      </div>
    );
  }

  return (
    <div className="my-6">
      <Todo eventId={eventId} />
    </div>
  );
};

export default EventTodo; 