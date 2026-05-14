"use client";

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { admin_search_bar_action } from '@/Redux/Action';

export function SearchBar() {
  const [q, setQ] = useState('');
  const dispatch = useDispatch();

  const onChange = (e) => {
    setQ(e.target.value);
    dispatch(admin_search_bar_action(e.target.value));
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      dispatch(admin_search_bar_action(q));
    }
  };

  const onClick = () => {
    dispatch(admin_search_bar_action(q));
  };

  return (
    <div className="mb-6 flex items-center space-x-2">
      <input
        value={q}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder="Search users by email"
        className="px-4 py-2 rounded-md border w-full"
        aria-label="Search users"
      />
      <button onClick={onClick} className="px-4 py-2 bg-blue-600 text-white rounded-md">Search</button>
    </div>
  );
}
