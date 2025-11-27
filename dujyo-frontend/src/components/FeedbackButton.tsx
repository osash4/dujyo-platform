import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  X,
  Send,
  Bug,
  Lightbulb,
  Heart,
  AlertCircle,
  CheckCircle2,
  Video,
  Camera,
  Mic,
  FileText,
} from 'lucide-react';
import { trackEvent, trackFeedback } from '../lib/analytics';

interface FeedbackButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  context?: string; // Contexto de la página/feature
  userId?: string;
  sessionId?: string;
}

interface FeedbackData {
  type: 'bug' | 'suggestion' | 'praise' | 'question' | 'general';
  message: string;
  rating?: number;
  context: string;
  page: string;
  screenshot?: string;
  recording?: boolean;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  position = 'bottom-right',
  context = 'general',
  userId,
  sessionId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackData['type']>('general');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
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
    { id: 'praise', label: 'Elogio', icon: Heart, color: 'green' },
    { id: 'question', label: 'Pregunta', icon: MessageSquare, color: 'blue' },
    { id: 'general', label: 'General', icon: FileText, color: 'purple' },
  ];

  // Capture screenshot
  const captureScreenshot = async () => {
    try {
      // Use html2canvas if available, or native browser API
      if (typeof window !== 'undefined' && (window as any).html2canvas) {
        const html2canvas = (window as any).html2canvas;
        const canvas = await html2canvas(document.body);
        const screenshotData = canvas.toDataURL('image/png');
        setScreenshot(screenshotData);
      } else {
        // Fallback: Use browser's native screenshot API if available
        if ('getDisplayMedia' in navigator.mediaDevices) {
          // This would require user permission
          console.log('Screenshot capture requires html2canvas library');
        }
      }
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }
  };

  // Start screen recording (requires permission)
  const startRecording = async () => {
    try {
      if ('getDisplayMedia' in navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { mediaSource: 'screen' } as any,
          audio: true,
        });
        
        setIsRecording(true);
        trackEvent('feedback_recording_started', {
          context,
          page: window.location.pathname,
        });

        // Stop recording after 30 seconds or when user stops
        stream.getTracks().forEach((track) => {
          track.onended = () => {
            setIsRecording(false);
            trackEvent('feedback_recording_stopped', {
              context,
              page: window.location.pathname,
            });
          };
        });
      } else {
        alert('Screen recording is not supported in your browser');
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to start recording. Please check permissions.');
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setIsSubmitting(true);

    const feedbackData: FeedbackData = {
      type: feedbackType,
      message,
      rating,
      context,
      page: window.location.pathname,
      screenshot: screenshot || undefined,
      recording: isRecording,
    };

    try {
      // Track feedback event
      trackFeedback(feedbackData, {
        userId,
        sessionId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      });

      // Send to backend
      const response = await fetch('/api/v1/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...feedbackData,
          userId,
          sessionId,
          metadata: {
            url: window.location.href,
            referrer: document.referrer,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setIsSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsSubmitted(false);
        setMessage('');
        setRating(0);
        setScreenshot(null);
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Track feedback modal opened
      trackEvent('feedback_modal_opened', {
        context,
        page: window.location.pathname,
      });
    }
  }, [isOpen, context]);

  return (
    <>
      {/* Floating Feedback Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => {
              setIsOpen(true);
              captureScreenshot();
            }}
            className={`fixed ${positionClasses[position]} z-50 w-14 h-14 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-110`}
            aria-label="Send Feedback"
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
                  <p className="text-gray-400">Tu opinión nos ayuda a mejorar Dujyo</p>
                </div>
              ) : (
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">Envíanos tu feedback</h3>
                      <p className="text-sm text-gray-400">Contexto: {context}</p>
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
                      Calificación (opcional)
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          onClick={() => setRating(value)}
                          className={`w-10 h-10 rounded-lg transition-all ${
                            rating >= value
                              ? 'bg-yellow-500 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          ★
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

                  {/* Screenshot & Recording */}
                  <div className="mb-4 flex gap-2">
                    <button
                      onClick={captureScreenshot}
                      className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Screenshot
                    </button>
                    <button
                      onClick={startRecording}
                      disabled={isRecording}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
                        isRecording
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <Video className="w-4 h-4" />
                          Recording...
                        </>
                      ) : (
                        <>
                          <Video className="w-4 h-4" />
                          Record
                        </>
                      )}
                    </button>
                  </div>

                  {screenshot && (
                    <div className="mb-4">
                      <img
                        src={screenshot}
                        alt="Screenshot"
                        className="w-full rounded-lg border border-gray-600"
                      />
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || isSubmitting}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
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

export default FeedbackButton;

