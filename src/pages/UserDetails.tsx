import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

interface User {
    name: string;
    email: string;
    role: string;
}

const UserDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchUserDetails = async () => {
            const response = await api.get(`/users/${id}`);
            setUser(response.data);
        };
        fetchUserDetails();
    }, [id]);

    if (!user) return <p>Loading...</p>;

    return (
        <div>
            <h1>User Details</h1>
            <p>Name: {user.name}</p>
            <p>Email: {user.email}</p>
            <p>Role: {user.role}</p>
        </div>
    );
};

export default UserDetails;