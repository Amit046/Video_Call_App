import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Video, Users, Shield, Zap, ArrowRight, Menu, X, Play, Star, CheckCircle } from 'lucide-react';

export default function LandingPage() {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const features = [
        {
            icon: <Video className="w-8 h-8" />,
            title: "HD Video Quality",
            description: "Crystal clear video calls with adaptive quality based on your connection"
        },
        {
            icon: <Users className="w-8 h-8" />,
            title: "Group Meetings",
            description: "Host meetings with up to 100 participants simultaneously"
        },
        {
            icon: <Shield className="w-8 h-8" />,
            title: "Secure & Private",
            description: "End-to-end encryption ensures your conversations stay private"
        },
        {
            icon: <Zap className="w-8 h-8" />,
            title: "Lightning Fast",
            description: "Join meetings instantly with just one click, no downloads required"
        }
    ];

    const testimonials = [
        {
            name: "Sarah Johnson",
            role: "Remote Team Lead",
            content: "Apna Video Call has transformed how our team collaborates. The quality is exceptional!",
