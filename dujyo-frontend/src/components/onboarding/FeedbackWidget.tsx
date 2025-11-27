import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiBaseUrl } from '../../utils/apiConfig';
import {
  MessageSquare,
  X,
  Send,
  CheckCircle2,
  Star,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Bug,
  Lightbulb,
  Heart,
  Smile,
} from 'lucide-react';

interface FeedbackWidgetProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  onFeedbackSubmit?: (feedback: FeedbackData) => Promise<void>;
}

interface FeedbackData {
  type: 'bug' | 'suggestion' | 'question' | 'praise' | 'general';
  rating: number;
  message: string;
  page?: string;
  userAgent?: string;
  screenshot?: string;
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({
  position = 'bottom-right',
  onFeedbackSubmit,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackData['type']>('general');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  const feedbackTypes = [
    { id: 'bug', label: 'Bug', icon: Bug, color: 'red' },
    { id: 'suggestion', label: 'Sugerencia', icon: Lightbulb, color: 'yellow' },
    { id: 'question', label: 'Pregunta', icon: MessageSquare, color: 'blue' },
    { id: 'praise', label: 'Elogio', icon: Heart, color: 'green' },
    { id: 'general', label: 'General', icon: MessageSquare, color: 'purple' },
  ];

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setIsSubmitting(true);

    const feedbackData: FeedbackData = {
      type: feedbackType,
      rating,
      message,
      page: window.location.pathname,
      userAgent: navigator.userAgent,
    };

    try {
      if (onFeedbackSubmit) {
        await onFeedbackSubmit(feedbackData);
      } else {
        // Default: Send to backend
        const apiBaseUrl = getApiBaseUrl();
        await fetch(`${apiBaseUrl}/api/v1/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(feedbackData),
        });
      }

      setIsSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsSubmitted(false);
        setMessage('');
        setRating(0);
        setFeedbackType('general');
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingClick = (value: number) => {
    setRating(value);
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className={`btn-primary fixed ${positionClasses[position]} z-50 w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-110`}
          >
            <MessageSquare className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`fixed ${positionClasses[position]} z-50 w-96 max-w-[calc(100vw-2rem)] bg-gray-800 rounded-2xl shadow-2xl overflow-hidden`}
            >
              {isSubmitted ? (
                <div className="p-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-white mb-2">¡Gracias por tu feedback!</h3>
                  <p className="text-gray-400">Tu opinión es muy valiosa para nosotros.</p>
                </div>
              ) : (
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">Envíanos tu feedback</h3>
                      <p className="text-sm text-gray-400">Ayúdanos a mejorar DUJYO</p>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Feedback Type */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tipo de feedback
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {feedbackTypes.map((type) => {
                        const Icon = type.icon;
                        const isSelected = feedbackType === type.id;
                        return (
                          <button
                            key={type.id}
                            onClick={() => setFeedbackType(type.id as FeedbackData['type'])}
                            className={`p-2 rounded-lg transition-all ${
                              isSelected
                                ? `bg-${type.color}-600 text-white`
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                            title={type.label}
                          >
                            <Icon className="w-5 h-5 mx-auto" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Calificación
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          onClick={() => handleRatingClick(value)}
                          className={`w-10 h-10 rounded-lg transition-all ${
                            rating >= value
                              ? 'bg-yellow-500 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          <Star
                            className={`w-5 h-5 mx-auto ${
                              rating >= value ? 'fill-current' : ''
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Mensaje
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Cuéntanos qué piensas..."
                      rows={4}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Quick Actions */}
                  <div className="mb-4 flex gap-2">
                    <button
                      onClick={() => setRating(5)}
                      className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Me gusta
                    </button>
                    <button
                      onClick={() => setRating(1)}
                      className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      No me gusta
                    </button>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || isSubmitting}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Enviar Feedback
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default FeedbackWidget;

