import { Music, Video, Gamepad, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export const Features = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();

  const features = [
    { icon: <Music size={48} />, title: 'Music Streaming', description: 'Listen to your favorite tracks and discover new artists.', path:'/music' },
    { icon: <Video size={48} />, title: 'Video Streaming', description: 'Enjoy HD videos, movies, and exclusive content.', path: '/video'  },
    { icon: <Gamepad size={48} />, title: 'Gaming', description: 'Play games directly within the platform and earn rewards.', path: '/gaming' }
  ];

  const handleFeatureClick = (path: string) => {
    if (!isSignedIn) {
      navigate('/explore');
      return;
    }
    navigate(path);
  };

  return (
    <section className="flex justify-around flex-wrap p-10 bg-[#1d475f] text-[#d2e9ed]">
      {features.map((feature, index) => (
        <div key={index} onClick={() => handleFeatureClick(feature.path)}>
          <div
            className={`text-center flex-1 p-8 m-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl min-w-[250px] max-w-[300px] transform hover:scale-105 cursor-pointer ${
              isSignedIn 
                ? 'bg-[#2483ad] hover:bg-[#3ecadd]' 
                : 'bg-[#407188] hover:bg-[#5a8ba0] opacity-75'
            }`}
          >
            <div className="flex justify-center mb-4 relative">
              {feature.icon}
              {!isSignedIn && (
                <div className="absolute top-0 right-0 bg-yellow-500 rounded-full p-1">
                  <Lock size={16} className="text-white" />
                </div>
              )}
            </div>
            <h3 className="text-2xl text-white mb-2">{feature.title}</h3>
            <p className="text-lg">{feature.description}</p>
            {!isSignedIn && (
              <p className="text-yellow-400 text-sm mt-2 font-medium">
                Sign in required
              </p>
            )}
          </div>
        </div>
      ))}
    </section>
  );
};
