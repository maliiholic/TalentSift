"use client"
import React from 'react';
import { show_search,search_bar_action } from "@/Redux/Action";
import { useDispatch, useSelector } from 'react-redux';

const Notification = () => {
    const role = useSelector((state) => state.Role_Reducer);
    const dispatch = useDispatch();

    // Move dispatches into effect to avoid updating other components during render
    React.useEffect(() => {
        dispatch(show_search(false));
        dispatch(search_bar_action(""));
    }, [dispatch]);

    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
            <h1 style={{ fontSize: "48px", fontWeight: "bold" }}>
                Notification Page
            </h1>
        </div>
    );
};

export default Notification;