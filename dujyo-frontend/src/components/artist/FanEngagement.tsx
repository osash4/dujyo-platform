import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Heart, 
  MessageCircle, 
  Share, 
  Calendar,
  MapPin,
  Clock,
  TrendingUp,
  Award,
  Star,
  Send,
  Image,
  Video,
  Music,
  Plus,
  Filter,
  Search,
  Bell,
  BellOff,
  Crown,
  Gift,
  Zap,
  Target,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

interface Fan {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  location: string;
  joinDate: Date;
  totalStreams: number;
  totalEarnings: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  isFollowing: boolean;
  lastActive: Date;
  favoriteGenres: string[];
  playlists: number;
  shares: number;
  comments: number;
  likes: number;
}

interface FanMessage {
  id: string;
  fanId: string;
  fanName: string;
  fanAvatar?: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  type: 'message' | 'comment' | 'share' | 'like';
}

interface FanEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  type: 'concert' | 'meetup' | 'livestream' | 'release';
  attendees: number;
  maxAttendees?: number;
  isPublic: boolean;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
}

const FanEngagement: React.FC = () => {
  const { user } = useAuth();
  const [fans, setFans] = useState<Fan[]>([]);
  const [messages, setMessages] = useState<FanMessage[]>([]);
  const [events, setEvents] = useState<FanEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'fans' | 'messages' | 'events' | 'analytics'>('fans');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [selectedFans, setSelectedFans] = useState<string[]>([]);

  useEffect(() => {
    fetchFanData();
  }, []);

  const fetchFanData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token || !user?.uid) {
        throw new Error('No authentication token or user ID found');
      }

      // TODO: Create endpoint to fetch fan data
      // For now, return empty arrays (no mocks)
      // When endpoint exists: GET /api/v1/fans/artist/{id}
      
      setFans([]); // Empty until backend endpoint exists
      setMessages([]); // Empty until backend endpoint exists
      setEvents([]); // Empty until backend endpoint exists
    } catch (error) {
      console.error('Error fetching fan data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'diamond': return 'text-blue-400 bg-blue-900';
      case 'platinum': return 'text-gray-300 bg-gray-700';
      case 'gold': return 'text-yellow-400 bg-yellow-900';
      case 'silver': return 'text-gray-400 bg-gray-800';
      case 'bronze': return 'text-orange-400 bg-orange-900';
      default: return 'text-gray-400 bg-gray-800';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'diamond': return <Crown className="w-4 h-4" />;
      case 'platinum': return <Award className="w-4 h-4" />;
      case 'gold': return <Star className="w-4 h-4" />;
      case 'silver': return <Award className="w-4 h-4" />;
      case 'bronze': return <Award className="w-4 h-4" />;
      default: return <Award className="w-4 h-4" />;
    }
  };

  const toggleFanFollow = (fanId: string) => {
    setFans(prev => prev.map(fan => 
      fan.id === fanId ? { ...fan, isFollowing: !fan.isFollowing } : fan
    ));
  };

  const sendMessage = () => {
    if (newMessage.trim() && selectedFans.length > 0) {
      // Simulate sending message
      console.log('Sending message to fans:', selectedFans, newMessage);
      setNewMessage('');
      setSelectedFans([]);
    }
  };

  const filteredFans = fans.filter(fan => {
    const matchesSearch = searchTerm === '' || 
      fan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fan.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fan.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTier = filterTier === '' || fan.tier === filterTier;
    const matchesLocation = filterLocation === '' || fan.location.includes(filterLocation);
    
    return matchesSearch && matchesTier && matchesLocation;
  });

  const tiers = ['diamond', 'platinum', 'gold', 'silver', 'bronze'];
  const locations = [...new Set(fans.map(fan => fan.location.split(',')[1]?.trim()).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Fan Engagement</h1>
          <p className="text-gray-400 mt-1">Connect with your fans and build your community</p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
        {[
          { id: 'fans', label: 'Fans', count: fans.length },
          { id: 'messages', label: 'Messages', count: messages.filter(m => !m.isRead).length },
          { id: 'events', label: 'Events', count: events.length },
          { id: 'analytics', label: 'Analytics', count: null }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === tab.id 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className={`px-2 py-1 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-purple-700' : 'bg-gray-700'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Fans Tab */}
      {activeTab === 'fans' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search fans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
              />
            </div>
            
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
            >
              <option value="">All Tiers</option>
              {tiers.map(tier => (
                <option key={tier} value={tier} className="capitalize">{tier}</option>
              ))}
            </select>
            
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
            >
              <option value="">All Locations</option>
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>

          {/* Fans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFans.map((fan) => (
              <div key={fan.id} className="bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {fan.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{fan.name}</h3>
                      <p className="text-gray-400 text-sm">{fan.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFanFollow(fan.id)}
                    className={`p-2 rounded-full transition-colors ${
                      fan.isFollowing 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {fan.isFollowing ? (
                      <Bell className="w-4 h-4 text-white" />
                    ) : (
                      <BellOff className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Tier</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getTierColor(fan.tier)}`}>
                      {getTierIcon(fan.tier)}
                      <span className="capitalize">{fan.tier}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Location</span>
                    <span className="text-white text-sm">{fan.location}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Streams</span>
                    <span className="text-white text-sm">{formatNumber(fan.totalStreams)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Earnings</span>
                    <span className="text-green-400 text-sm font-semibold">${fan.totalEarnings.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Last Active</span>
                    <span className="text-white text-sm">{formatDate(fan.lastActive)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Heart className="w-4 h-4 text-red-400" />
                      <span className="text-gray-300">{fan.likes}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Share className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-300">{fan.shares}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">{fan.comments}</span>
                    </div>
                  </div>
                  
                  <button className="text-purple-400 hover:text-purple-300 text-sm transition-colors">
                    Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Message Composer */}
          <div className="bg-gray-800 p-6 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-4">Send Message to Fans</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Fans</label>
                <div className="flex flex-wrap gap-2">
                  {fans.slice(0, 5).map((fan) => (
                    <button
                      key={fan.id}
                      onClick={() => {
                        setSelectedFans(prev => 
                          prev.includes(fan.id) 
                            ? prev.filter(id => id !== fan.id)
                            : [...prev, fan.id]
                        );
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedFans.includes(fan.id)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {fan.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={4}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                  placeholder="Write your message to fans..."
                />
              </div>
              
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || selectedFans.length === 0}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-800 disabled:text-gray-500 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send Message</span>
              </button>
            </div>
          </div>

          {/* Messages List */}
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`bg-gray-800 p-6 rounded-xl ${!message.isRead ? 'border-l-4 border-purple-500' : ''}`}>
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">
                      {message.fanName.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-semibold">{message.fanName}</h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400 text-sm">{formatTime(message.timestamp)}</span>
                        {!message.isRead && (
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-300">{message.message}</p>
                    <div className="flex items-center space-x-4 mt-3">
                      <button className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
                        Reply
                      </button>
                      <button className="text-gray-400 hover:text-gray-300 text-sm transition-colors">
                        Mark as Read
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div key={event.id} className="bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg mb-2">{event.title}</h3>
                    <p className="text-gray-400 text-sm mb-3">{event.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    event.status === 'upcoming' ? 'bg-blue-900 text-blue-300' :
                    event.status === 'live' ? 'bg-green-900 text-green-300' :
                    event.status === 'completed' ? 'bg-gray-900 text-gray-300' :
                    'bg-red-900 text-red-300'
                  }`}>
                    {event.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">{event.location}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">
                      {formatNumber(event.attendees)}
                      {event.maxAttendees && ` / ${formatNumber(event.maxAttendees)}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <span className="text-purple-400 text-sm font-medium capitalize">
                    {event.type}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
                      Edit
                    </button>
                    <button className="text-gray-400 hover:text-gray-300 text-sm transition-colors">
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-r from-orange-600 to-blue-700 p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Fans</p>
                  <p className="text-3xl font-bold text-white">{fans.length}</p>
                  <p className="text-blue-200 text-sm mt-1">+12.5% this month</p>
                </div>
                <Users className="w-12 h-12 text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Active Fans</p>
                  <p className="text-3xl font-bold text-white">{fans.filter(f => f.isFollowing).length}</p>
                  <p className="text-green-200 text-sm mt-1">Following you</p>
                </div>
                <Heart className="w-12 h-12 text-green-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Messages</p>
                  <p className="text-3xl font-bold text-white">{messages.length}</p>
                  <p className="text-purple-200 text-sm mt-1">{messages.filter(m => !m.isRead).length} unread</p>
                </div>
                <MessageCircle className="w-12 h-12 text-purple-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Events</p>
                  <p className="text-3xl font-bold text-white">{events.length}</p>
                  <p className="text-orange-200 text-sm mt-1">Upcoming</p>
                </div>
                <Calendar className="w-12 h-12 text-orange-200" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-white mb-4">Fan Tiers Distribution</h3>
              <div className="space-y-3">
                {tiers.map((tier) => {
                  const count = fans.filter(f => f.tier === tier).length;
                  const percentage = (count / fans.length) * 100;
                  return (
                    <div key={tier} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300 capitalize">{tier}</span>
                        <span className="text-sm text-white font-semibold">{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${getTierColor(tier)}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-white mb-4">Top Fan Locations</h3>
              <div className="space-y-3">
                {locations.slice(0, 5).map((location) => {
                  const count = fans.filter(f => f.location.includes(location)).length;
                  return (
                    <div key={location} className="flex items-center justify-between">
                      <span className="text-gray-300">{location}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full"
                            style={{ width: `${(count / Math.max(...locations.map(l => fans.filter(f => f.location.includes(l)).length))) * 100}%` }}
                          />
                        </div>
                        <span className="text-white font-semibold w-8 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default FanEngagement;
