import React from 'react';

const MerchComingSoon: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex items-center justify-center">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-3">Merch Store</h1>
        <p className="text-gray-400 mb-6">Coming soon. We’re preparing limited-edition drops for early supporters.</p>
        <div className="inline-flex items-center gap-2 text-sm text-gray-300 bg-gray-800 border border-gray-700 px-4 py-2 rounded-lg">
          <span>Notify me when it’s ready</span>
        </div>
      </div>
    </div>
  );
};

export default MerchComingSoon;


