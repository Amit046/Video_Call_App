import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Video, Shield, Star, Menu, X, ArrowRight, Play } from 'lucide-react';

export default function LandingPage() {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [meetingCode, setMeetingCode] = useState('');
    const [userName, setUserName] = useState('');

    // Check if user is logged in
    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        if (token && user) {
            setIsLoggedIn(true);
            setUserName(JSON.parse(user).name);
        }
    }, []);

    const handleJoinMeeting = () => {
        if (meetingCode.trim()) {
            navigate(/room/${meetingCode}, { 
                state: { userName: userName || 'Guest' } 
            });
        }
    };

    const handleQuickJoin = () => {
        const randomCode = Math.random().toString(36).substring(2, 10);
        navigate(/room/${randomCode}, { 
            state: { userName: userName || 'Guest' } 
        });
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsLoggedIn(false);
        setUserName('');
        navigate('/');
    };

    const features = [
        {
            icon: <Video className="w-8 h-8" />,
            title: "HD Video Calls",
            description: "Crystal clear video quality with adaptive streaming"
        },
        {
            icon: <Shield className="w-8 h-8" />,
            title: "Secure & Private",
            description: "End-to-end encryption for all your conversations"
        },
        {
            icon: <Users className="w-8 h-8" />,
            title: "Group Meetings",
            description: "Connect with multiple people simultaneously"
        }
    ];

    const testimonials = [
        {
            name: "Sarah Johnson",
            role: "Remote Worker",
            content: "Best video calling app I've used. The quality is amazing!",
            rating: 5
        },
        {
            name: "Mike Chen",
            role: "Teacher",
            content: "Perfect for online classes. Students love the interface.",
            rating: 5
        },
        {
            name: "Emma Davis",
            role: "Family User",
            content: "Keeps our family connected across continents.",
            rating: 5
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Navigation */}
            <nav className="bg-white shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 flex items-center">
                                <Video className="w-8 h-8 text-blue-600 mr-2" />
                                <h2 className="text-xl font-bold text-gray-900">Apna Video Call</h2>
                            </div>
                        </div>
                        
                        {/* Desktop Navigation */}
                        <div className="hidden md:block">
                            <div className="ml-10 flex items-baseline space-x-4">
                                {isLoggedIn ? (
                                    <>
                                        <span className="text-gray-700">Welcome, {userName}</span>
                                        <button
                                            onClick={() => setShowJoinModal(true)}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                                        >
                                            Join Meeting
                                        </button>
                                        <button
                                            onClick={() => navigate('/dashboard')}
                                            className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md transition-colors"
                                        >
                                            Dashboard
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md transition-colors"
                                        >
                                            Logout
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setShowJoinModal(true)}
                                            className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md transition-colors"
                                        >
                                            Join as Guest
                                        </button>
